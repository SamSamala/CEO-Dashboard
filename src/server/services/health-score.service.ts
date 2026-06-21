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

  // Revenue score (25%)
  let revenueScore = 50;
  if (financeEntry) {
    const data = financeEntry.data as Record<string, number>;
    const revenue = data["monthly_revenue"] ?? data["mrr"] ?? data["gross_revenue"] ?? 0;
    const target = 150000;
    revenueScore = clamp((revenue / target) * 100, 0, 100);
  }

  // Department performance score (25%)
  let deptScore = 50;
  if (departments.length > 0) {
    const scorecards = await Promise.all(
      departments.map((d) => computeDeptScorecard(d.id, companyId).catch(() => null))
    );
    const valid = scorecards.filter(Boolean);
    if (valid.length > 0) {
      deptScore = valid.reduce((sum, s) => sum + (s?.performanceScore ?? 0), 0) / valid.length;
    }
  }

  // Cash runway score (20%)
  let runwayScore = 50;
  if (financeEntry) {
    const data = financeEntry.data as Record<string, number>;
    const cash = data["cash_balance"] ?? 0;
    const burn = data["burn_rate"] ?? 1;
    const runwayDays = burn > 0 ? (cash / burn) * 30 : 365;
    runwayScore = clamp((runwayDays / 180) * 100, 0, 100);
  }

  // Goal completion score (15%)
  let goalScore = 50;
  if (goals.length > 0) {
    const completed = goals.filter(
      (g) => g.targetValue > 0 && g.currentValue / g.targetValue >= 0.9
    ).length;
    goalScore = (completed / goals.length) * 100;
  }

  // Bottleneck score (15%)
  const criticalBottlenecks = bottlenecks.filter((b) => b.severity === "CRITICAL").length;
  const warningBottlenecks = bottlenecks.filter((b) => b.severity === "WARNING").length;
  const bottleneckScore = clamp(100 - criticalBottlenecks * 20 - warningBottlenecks * 5, 0, 100);

  const score = Math.round(
    revenueScore * 0.25 +
    deptScore * 0.25 +
    runwayScore * 0.2 +
    goalScore * 0.15 +
    bottleneckScore * 0.15
  );

  return {
    score: clamp(score, 0, 100),
    breakdown: {
      revenue: Math.round(revenueScore),
      departments: Math.round(deptScore),
      runway: Math.round(runwayScore),
      goals: Math.round(goalScore),
      bottlenecks: Math.round(bottleneckScore),
    },
  };
}
