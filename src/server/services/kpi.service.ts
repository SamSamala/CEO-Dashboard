import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";
import type { KpiResult, DeptScorecard } from "@/types/department.types";
import { subDays, format } from "date-fns";

export async function computeDeptScorecard(
  departmentId: string,
  companyId: string,
  date: Date = new Date()
): Promise<DeptScorecard> {
  const kpiConfigs = await prisma.kpiConfig.findMany({
    where: { departmentId, companyId, isActive: true },
  });

  const last7 = await prisma.metricEntry.findMany({
    where: {
      departmentId,
      companyId,
      businessDate: { gte: subDays(date, 7), lte: date },
    },
    orderBy: { businessDate: "asc" },
  });

  const prior7 = await prisma.metricEntry.findMany({
    where: {
      departmentId,
      companyId,
      businessDate: { gte: subDays(date, 14), lt: subDays(date, 7) },
    },
    orderBy: { businessDate: "asc" },
  });

  // Data confidence: distinct business dates with data in last 7 days
  const distinctDates = new Set(last7.map((e) => format(e.businessDate, "yyyy-MM-dd")));
  const dataConfidenceScore = Math.round((distinctDates.size / 7) * 100);

  const kpis: KpiResult[] = kpiConfigs.map((config) => {
    const current = aggregateKpi(last7.map((e) => e.data as Record<string, number>), config.key, config.aggregation);
    const prev = aggregateKpi(prior7.map((e) => e.data as Record<string, number>), config.key, config.aggregation);
    const target = config.targetValue;
    const achievement = target > 0 ? clamp((current / target) * 100, 0, 200) : 0;

    const status: "green" | "orange" | "red" =
      achievement >= config.warningThreshold * 100
        ? "green"
        : achievement >= config.criticalThreshold * 100
        ? "orange"
        : "red";

    const diff = prev > 0 ? ((current - prev) / prev) * 100 : 0;
    const trend: "up" | "down" | "flat" =
      Math.abs(diff) < 2 ? "flat" : diff > 0 ? "up" : "down";

    return {
      key: config.key,
      label: config.label,
      unit: config.unit,
      actual: current,
      target,
      achievement,
      status,
      trend,
      trendValue: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`,
    };
  });

  const weightedSum = kpis.reduce((sum, kpi) => {
    const cfg = kpiConfigs.find((c) => c.key === kpi.key);
    return sum + kpi.achievement * (cfg?.weight ?? 1);
  }, 0);
  const totalWeight = kpiConfigs.reduce((s, c) => s + c.weight, 0);
  const performanceScore = totalWeight > 0 ? clamp(weightedSum / totalWeight, 0, 100) : 0;

  // Trend score: compare current period performance vs prior period
  const priorWeightedSum = kpis.reduce((sum, kpi) => {
    const cfg = kpiConfigs.find((c) => c.key === kpi.key);
    const priorVal = aggregateKpi(prior7.map((e) => e.data as Record<string, number>), kpi.key, cfg?.aggregation ?? "sum");
    const priorAch = cfg && cfg.targetValue > 0 ? clamp((priorVal / cfg.targetValue) * 100, 0, 200) : 0;
    return sum + priorAch * (cfg?.weight ?? 1);
  }, 0);
  const priorPerformance = totalWeight > 0 ? clamp(priorWeightedSum / totalWeight, 0, 100) : 0;
  const trendScore = clamp(50 + (performanceScore - priorPerformance), 0, 100);

  // Risk score: based on red KPIs and data gap
  const redKpis = kpis.filter((k) => k.status === "red").length;
  const riskScore = clamp(100 - redKpis * 20 - (dataConfidenceScore < 43 ? 30 : 0), 0, 100);

  // Status: GRAY when insufficient data (< 3 data days in last 7)
  const status: "green" | "orange" | "red" | "gray" =
    dataConfidenceScore < 43
      ? "gray"
      : performanceScore >= 75
      ? "green"
      : performanceScore >= 50
      ? "orange"
      : "red";

  return {
    departmentId,
    date: format(date, "yyyy-MM-dd"),
    kpis,
    performanceScore,
    trendScore,
    riskScore,
    dataConfidenceScore,
    status,
  };
}

function aggregateKpi(
  entries: Record<string, number>[],
  key: string,
  aggregation: string
): number {
  const values = entries.map((e) => Number(e[key] ?? 0)).filter((v) => !isNaN(v));
  if (values.length === 0) return 0;
  if (aggregation === "avg") return values.reduce((a, b) => a + b, 0) / values.length;
  if (aggregation === "last") return values[values.length - 1];
  return values.reduce((a, b) => a + b, 0);
}

export async function getMetricHistory(
  departmentId: string,
  companyId: string,
  days: number,
  kpiKeys: string[]
) {
  const entries = await prisma.metricEntry.findMany({
    where: {
      departmentId,
      companyId,
      businessDate: { gte: subDays(new Date(), days) },
    },
    orderBy: { businessDate: "asc" },
  });

  // Group by businessDate and aggregate (sum for same-day multiple entries)
  const byDate = new Map<string, Record<string, number>>();
  for (const entry of entries) {
    const dateKey = format(entry.businessDate, "MMM dd");
    const existing = byDate.get(dateKey) ?? {};
    const data = entry.data as Record<string, number>;
    for (const key of kpiKeys) {
      existing[key] = (existing[key] ?? 0) + (data[key] ?? 0);
    }
    byDate.set(dateKey, existing);
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    ...Object.fromEntries(kpiKeys.map((k) => [k, data[k] ?? 0])),
  }));
}
