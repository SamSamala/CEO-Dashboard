import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";
import { computeDeptScorecard } from "./kpi.service";
import type { HealthScore } from "@/types/dashboard.types";

export async function computeCompanyHealthScore(companyId: string): Promise<HealthScore> {
  const [departments, goals, bottlenecks, financeEntry] = await Promise.all([
    prisma.department.findMany({ where: { companyId, isActive: true } }),
    prisma.goal.findMany({ where: { companyId, isArchived: false } }),
    prisma.bottleneck.findMany({ where: { companyId, resolvedAt: null } }),
    prisma.metricEntry.findFirst({
      where: {
        companyId,
        department: { slug: "finance" },
      },
      orderBy: { businessDate: "desc" },
    }),
  ]);

  const financeData = financeEntry?.data as Record<string, number> | undefined;

  // Revenue score (25%) — only scored when finance metrics have been reported
  const hasRevenueData =
    financeData != null &&
    (financeData["monthly_revenue"] != null ||
      financeData["mrr"] != null ||
      financeData["gross_revenue"] != null);
  let revenueScore: number | null = null;
  if (hasRevenueData) {
    const revenue =
      financeData!["monthly_revenue"] ?? financeData!["mrr"] ?? financeData!["gross_revenue"] ?? 0;
    revenueScore = clamp((revenue / 150000) * 100, 0, 100);
  }

  // Department performance score (25%) — only departments with trustworthy data
  let deptScore: number | null = null;
  if (departments.length > 0) {
    const scorecards = await Promise.all(
      departments.map((d) => computeDeptScorecard(d.id, companyId).catch(() => null))
    );
    const withData = scorecards.filter((s) => s && s.status !== "gray");
    if (withData.length > 0) {
      deptScore = withData.reduce((sum, s) => sum + (s?.performanceScore ?? 0), 0) / withData.length;
    }
  }

  // Cash runway score (20%) — needs a reported cash balance
  const hasRunwayData = financeData != null && financeData["cash_balance"] != null;
  let runwayScore: number | null = null;
  if (hasRunwayData) {
    const cash = financeData!["cash_balance"] ?? 0;
    const burn = financeData!["burn_rate"] ?? 0;
    const runwayDays = burn > 0 ? (cash / burn) * 30 : 365;
    runwayScore = clamp((runwayDays / 180) * 100, 0, 100);
  }

  // Goal completion score (15%) — only scored when goals exist
  let goalScore: number | null = null;
  if (goals.length > 0) {
    const completed = goals.filter(
      (g) => g.targetValue > 0 && g.currentValue / g.targetValue >= 0.9
    ).length;
    goalScore = (completed / goals.length) * 100;
  }

  // Bottleneck score (15%) — the absence of bottlenecks is itself known data,
  // so this is only meaningful once the company has some operational data.
  const criticalBottlenecks = bottlenecks.filter((b) => b.severity === "CRITICAL").length;
  const warningBottlenecks = bottlenecks.filter((b) => b.severity === "WARNING").length;
  const bottleneckScore = clamp(100 - criticalBottlenecks * 20 - warningBottlenecks * 5, 0, 100);

  // The company has enough to score only once some substantive data exists.
  const hasCoreData =
    hasRevenueData || hasRunwayData || deptScore !== null || goals.length > 0;

  const components: { value: number | null; weight: number }[] = [
    { value: revenueScore, weight: 0.25 },
    { value: deptScore, weight: 0.25 },
    { value: runwayScore, weight: 0.2 },
    { value: goalScore, weight: 0.15 },
    // Bottlenecks only count toward the overall score once there is core data.
    { value: hasCoreData ? bottleneckScore : null, weight: 0.15 },
  ];

  const scored = components.filter((c) => c.value !== null);
  const totalWeight = scored.reduce((s, c) => s + c.weight, 0);
  const score =
    hasCoreData && totalWeight > 0
      ? clamp(
          Math.round(scored.reduce((s, c) => s + (c.value as number) * c.weight, 0) / totalWeight),
          0,
          100
        )
      : null;

  const round = (v: number | null) => (v === null ? null : Math.round(v));

  return {
    score,
    breakdown: {
      revenue: round(revenueScore),
      departments: round(deptScore),
      runway: round(runwayScore),
      goals: round(goalScore),
      bottlenecks: hasCoreData ? round(bottleneckScore) : null,
    },
  };
}
