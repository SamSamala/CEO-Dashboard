import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";
import { subDays } from "date-fns";
import type { BottleneckResult } from "@/types/bottleneck.types";

export async function detectBottlenecks(companyId: string): Promise<void> {
  const [departments, kpiConfigs, relationships] = await Promise.all([
    prisma.department.findMany({ where: { companyId, isActive: true } }),
    prisma.kpiConfig.findMany({ where: { companyId, isActive: true, isBottleneckKpi: true } }),
    prisma.departmentRelationship.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const now = new Date();
  const recent7 = subDays(now, 7);
  const prior7 = subDays(now, 14);

  const [recentEntries, priorEntries] = await Promise.all([
    prisma.metricEntry.findMany({
      where: { companyId, businessDate: { gte: recent7 } },
      orderBy: { businessDate: "asc" },
    }),
    prisma.metricEntry.findMany({
      where: { companyId, businessDate: { gte: prior7, lt: recent7 } },
      orderBy: { businessDate: "asc" },
    }),
  ]);

  // Build dept avg map
  const deptAvg = new Map<string, Map<string, number>>();
  for (const dept of departments) {
    const deptEntries = recentEntries.filter((e) => e.departmentId === dept.id);
    const kpiMap = new Map<string, number>();
    for (const kpi of kpiConfigs.filter((k) => k.departmentId === dept.id)) {
      kpiMap.set(kpi.key, avgValue(deptEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0)));
    }
    deptAvg.set(dept.id, kpiMap);
  }

  // Determine primary constraint via chain analysis
  const primaryConstraintId = findPrimaryConstraint(relationships, deptAvg, kpiConfigs);

  // ── Per-KPI bottleneck detection ──────────────────────────────────────────
  for (const kpi of kpiConfigs) {
    const deptEntries = recentEntries.filter((e) => e.departmentId === kpi.departmentId);
    const priorDeptEntries = priorEntries.filter((e) => e.departmentId === kpi.departmentId);

    const actual = avgValue(deptEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0));
    const priorActual = avgValue(priorDeptEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0));
    const expected = kpi.targetValue;

    if (actual === 0 && deptEntries.length === 0) continue;

    const ratio = expected > 0 ? actual / expected : 1;
    const severityScore = clamp(100 - ratio * 100, 0, 100);

    const severity =
      ratio < kpi.criticalThreshold
        ? "CRITICAL"
        : ratio < kpi.warningThreshold
        ? "WARNING"
        : "NONE";

    // Trend calculation
    const priorRatio = expected > 0 ? priorActual / expected : 1;
    const priorSeverity = clamp(100 - priorRatio * 100, 0, 100);
    const trendDiff = severityScore - priorSeverity;
    const trend =
      Math.abs(trendDiff) < 5 ? "STABLE" : trendDiff > 5 ? "WORSENING" : "IMPROVING";

    // Cross-dept analysis from linkedKpiId
    let investigationArea: string | null = null;
    let linkedDeptId: string | null = null;

    if (kpi.linkedKpiId) {
      const linkedKpi = await prisma.kpiConfig.findUnique({
        where: { id: kpi.linkedKpiId },
        include: { department: true },
      });
      if (linkedKpi) {
        const upstreamEntries = recentEntries.filter((e) => e.departmentId === linkedKpi.departmentId);
        const upstreamAvg = avgValue(
          upstreamEntries.map((e) => (e.data as Record<string, number>)[linkedKpi.key] ?? 0)
        );
        if (upstreamAvg > actual * 1.2) {
          linkedDeptId = linkedKpi.departmentId;
          investigationArea = `${linkedKpi.department.name} is generating ${upstreamAvg.toFixed(0)} ${linkedKpi.label.toLowerCase()} per day, but ${departments.find((d) => d.id === kpi.departmentId)?.name} can only process ${actual.toFixed(0)}. Consider expanding ${departments.find((d) => d.id === kpi.departmentId)?.name} capacity.`;
        }
      }
    }

    // Chain-based investigation area
    if (!investigationArea) {
      const rel = relationships.find((r) => r.toDepartmentId === kpi.departmentId && r.toKpiKey === kpi.key);
      if (rel && severity !== "NONE") {
        const fromDept = departments.find((d) => d.id === rel.fromDepartmentId);
        const fromAvg = deptAvg.get(rel.fromDepartmentId)?.get(rel.fromKpiKey) ?? 0;
        if (fromDept && fromAvg > actual * 1.2) {
          linkedDeptId = rel.fromDepartmentId;
          investigationArea = `${fromDept.name} is producing ${fromAvg.toFixed(0)} units but this department can only handle ${actual.toFixed(0)}. This is the primary bottleneck in the chain.`;
        }
      }
    }

    if (!investigationArea && severity !== "NONE") {
      const dept = departments.find((d) => d.id === kpi.departmentId);
      investigationArea = `${dept?.name} ${kpi.label} is at ${(ratio * 100).toFixed(0)}% of target (${actual.toFixed(0)} vs ${expected}). Review team workload, processes, and resource allocation.`;
    }

    // Revenue impact estimate
    let estimatedRevenueImpact: number | null = null;
    if (severity !== "NONE") {
      const finDept = departments.find((d) => d.slug === "finance");
      if (finDept) {
        const finEntries = recentEntries.filter((e) => e.departmentId === finDept.id);
        const revenue = avgValue(finEntries.map((e) => (e.data as Record<string, number>)["monthly_revenue"] ?? (e.data as Record<string, number>)["mrr"] ?? 0));
        if (revenue > 0) {
          const gap = Math.max(0, 1 - ratio);
          estimatedRevenueImpact = Math.round(revenue * gap * 0.3);
        }
      }
    }

    const isPrimaryConstraint = primaryConstraintId === kpi.departmentId;

    if (severity === "NONE") {
      await prisma.bottleneck.updateMany({
        where: { companyId, departmentId: kpi.departmentId, kpiKey: kpi.key, resolvedAt: null },
        data: { resolvedAt: now },
      });
    } else {
      const existing = await prisma.bottleneck.findFirst({
        where: { companyId, departmentId: kpi.departmentId, kpiKey: kpi.key, resolvedAt: null },
      });

      if (existing) {
        await prisma.bottleneck.update({
          where: { id: existing.id },
          data: { severity, severityScore, actualValue: actual, expectedValue: expected, trend, investigationArea, linkedDeptId, estimatedRevenueImpact, isPrimaryConstraint },
        });
      } else {
        await prisma.bottleneck.create({
          data: {
            companyId,
            departmentId: kpi.departmentId,
            kpiKey: kpi.key,
            severity,
            severityScore,
            actualValue: actual,
            expectedValue: expected,
            trend,
            investigationArea,
            linkedDeptId,
            estimatedRevenueImpact,
            isPrimaryConstraint,
          },
        });
      }
    }
  }
}

function findPrimaryConstraint(
  relationships: { fromDepartmentId: string; toDepartmentId: string; fromKpiKey: string; toKpiKey: string }[],
  deptAvg: Map<string, Map<string, number>>,
  kpiConfigs: { departmentId: string; key: string; targetValue: number }[]
): string | null {
  if (relationships.length === 0) return null;

  let maxConstraintRatio = 0;
  let primaryId: string | null = null;

  for (const rel of relationships) {
    const fromAvg = deptAvg.get(rel.fromDepartmentId)?.get(rel.fromKpiKey) ?? 0;
    const toAvg = deptAvg.get(rel.toDepartmentId)?.get(rel.toKpiKey) ?? 0;
    if (fromAvg > 0 && toAvg >= 0) {
      const constraintRatio = toAvg > 0 ? fromAvg / toAvg : fromAvg;
      if (constraintRatio > maxConstraintRatio) {
        maxConstraintRatio = constraintRatio;
        primaryId = rel.toDepartmentId;
      }
    }
  }

  return maxConstraintRatio > 1.2 ? primaryId : null;
}

export async function getActiveBottlenecks(companyId: string): Promise<BottleneckResult[]> {
  const bottlenecks = await prisma.bottleneck.findMany({
    where: { companyId, resolvedAt: null, severity: { not: "NONE" } },
    include: { department: true },
    orderBy: [{ isPrimaryConstraint: "desc" }, { severity: "desc" }, { severityScore: "desc" }],
  });

  return bottlenecks.map((b) => ({
    id: b.id,
    departmentId: b.departmentId,
    departmentName: b.department.name,
    departmentSlug: b.department.slug,
    kpiKey: b.kpiKey,
    kpiLabel: b.kpiKey.replace(/_/g, " "),
    severity: b.severity,
    severityScore: b.severityScore,
    actualValue: b.actualValue,
    expectedValue: b.expectedValue,
    trend: b.trend,
    investigationArea: b.investigationArea,
    linkedDeptId: b.linkedDeptId,
    estimatedRevenueImpact: b.estimatedRevenueImpact,
    isPrimaryConstraint: b.isPrimaryConstraint,
    detectedAt: b.detectedAt,
  }));
}

function avgValue(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
