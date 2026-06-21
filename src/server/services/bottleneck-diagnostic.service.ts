import { prisma } from "@/lib/prisma";
import { subDays, differenceInDays } from "date-fns";
import type {
  DepartmentDiagnostic,
  TriggerMetric,
  DiagnosticSeverity,
  DiagnosticTrend,
  ProductivityMetrics,
  ExecPanel,
  BottleneckDiagnosticsResult,
  DeptAttention,
  GoalBrief,
  TeamCapacity,
  DecliningKpi,
  AlertBrief,
} from "@/types/diagnostic.types";

// Domain-specific text by department slug
const SLUG_CONFIG: Record<
  string,
  { bottleneckType: string; businessImpact: string; investigationArea: string }
> = {
  marketing: {
    bottleneckType: "Likely Marketing Bottleneck",
    businessImpact: "Future revenue growth risk",
    investigationArea: "Review marketing spend allocation and campaign performance",
  },
  sales: {
    bottleneckType: "Likely Sales Bottleneck",
    businessImpact: "Revenue target at risk",
    investigationArea: "Review sales process, conversion rates, and deal velocity",
  },
  operations: {
    bottleneckType: "Likely Operations Bottleneck",
    businessImpact: "Delivery capacity risk",
    investigationArea: "Review task backlog, project pipeline, and team workload",
  },
  hr: {
    bottleneckType: "Likely Hiring Bottleneck",
    businessImpact: "Team capacity constraint",
    investigationArea: "Review open positions, hiring pipeline, and capacity planning",
  },
  customer_success: {
    bottleneckType: "Likely Customer Success Bottleneck",
    businessImpact: "Revenue retention risk",
    investigationArea: "Review churn signals, ticket backlog, and customer health",
  },
  finance: {
    bottleneckType: "Likely Financial Bottleneck",
    businessImpact: "Financial sustainability risk",
    investigationArea: "Review cash runway, accounts receivable, and burn rate",
  },
};

function avgValue(values: number[]): number {
  const filtered = values.filter((v) => v > 0);
  if (filtered.length === 0) return 0;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

function getTrend(changeFromPrior: number): DiagnosticTrend {
  if (changeFromPrior < -5) return "WORSENING";
  if (changeFromPrior > 5) return "IMPROVING";
  return "STABLE";
}

export async function computeBottleneckDiagnostics(
  companyId: string,
  scopedDepartmentId?: string
): Promise<BottleneckDiagnosticsResult> {
  const now = new Date();
  const recent7 = subDays(now, 7);
  const prior7 = subDays(now, 14);

  const [
    departments,
    kpiConfigs,
    relationships,
    recentEntries,
    priorEntries,
    goals,
    employeeCount,
    financeEntry,
    criticalAlertRows,
  ] = await Promise.all([
    prisma.department.findMany({
      where: scopedDepartmentId
        ? { id: scopedDepartmentId, companyId, isActive: true }
        : { companyId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.kpiConfig.findMany({
      where: scopedDepartmentId
        ? { companyId, departmentId: scopedDepartmentId, isActive: true }
        : { companyId, isActive: true },
    }),
    prisma.departmentRelationship.findMany({ where: { companyId } }),
    prisma.metricEntry.findMany({
      where: scopedDepartmentId
        ? { companyId, departmentId: scopedDepartmentId, businessDate: { gte: recent7 } }
        : { companyId, businessDate: { gte: recent7 } },
    }),
    prisma.metricEntry.findMany({
      where: scopedDepartmentId
        ? { companyId, departmentId: scopedDepartmentId, businessDate: { gte: prior7, lt: recent7 } }
        : { companyId, businessDate: { gte: prior7, lt: recent7 } },
    }),
    prisma.goal.findMany({
      where: { companyId, isArchived: false },
      include: { department: { select: { name: true } } },
    }),
    prisma.employee.count({ where: { companyId, employmentStatus: "ACTIVE" } }),
    prisma.metricEntry.findFirst({
      where: { companyId, department: { slug: "finance" } },
      orderBy: { businessDate: "desc" },
    }),
    !scopedDepartmentId
      ? prisma.alert.findMany({
          where: { companyId, status: "ACTIVE", severity: "CRITICAL" },
          orderBy: { triggeredAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  // Build downstream slug map from relationships
  const downstreamSlugs = new Map<string, string[]>();
  for (const rel of relationships) {
    const fromDept = departments.find((d) => d.id === rel.fromDepartmentId);
    const toDept = departments.find((d) => d.id === rel.toDepartmentId);
    if (!fromDept || !toDept) continue;
    const existing = downstreamSlugs.get(rel.fromDepartmentId) ?? [];
    if (!existing.includes(toDept.slug)) {
      downstreamSlugs.set(rel.fromDepartmentId, [...existing, toDept.slug]);
    }
  }

  // Per-department diagnostics
  const departmentDiagnostics: DepartmentDiagnostic[] = [];

  for (const dept of departments) {
    const deptKpis = kpiConfigs.filter(
      (k) => k.departmentId === dept.id && k.isActive && k.targetValue > 0
    );

    if (deptKpis.length === 0) continue;

    const deptRecentEntries = recentEntries.filter((e) => e.departmentId === dept.id);
    const deptPriorEntries = priorEntries.filter((e) => e.departmentId === dept.id);

    const triggerMetrics: TriggerMetric[] = [];
    let kpisBelow = 0;
    let anyBelowCritical = false;
    const stressedCount = { count: 0 };

    for (const kpi of deptKpis) {
      const actual = avgValue(
        deptRecentEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0)
      );
      const priorActual = avgValue(
        deptPriorEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0)
      );

      if (actual === 0 && deptRecentEntries.length === 0) continue;

      const pctOfTarget = kpi.targetValue > 0 ? (actual / kpi.targetValue) * 100 : 100;
      const changeFromPrior =
        priorActual > 0 ? ((actual - priorActual) / priorActual) * 100 : 0;
      const trend = getTrend(changeFromPrior);

      // Track stressed KPIs (approaching critical threshold but not yet at warning)
      if (pctOfTarget < 100 && pctOfTarget >= kpi.warningThreshold * 100) {
        stressedCount.count++;
      }

      if (actual < kpi.targetValue * kpi.warningThreshold) {
        kpisBelow++;
        if (actual < kpi.targetValue * kpi.criticalThreshold) {
          anyBelowCritical = true;
        }
        triggerMetrics.push({
          kpiKey: kpi.key,
          kpiLabel: kpi.label,
          actual,
          target: kpi.targetValue,
          pctOfTarget: Math.round(pctOfTarget),
          trend,
          changeFromPrior: Math.round(changeFromPrior),
        });
      } else if (trend === "WORSENING") {
        // Include declining KPIs even if still above threshold (early signal)
        triggerMetrics.push({
          kpiKey: kpi.key,
          kpiLabel: kpi.label,
          actual,
          target: kpi.targetValue,
          pctOfTarget: Math.round(pctOfTarget),
          trend,
          changeFromPrior: Math.round(changeFromPrior),
        });
      }
    }

    const severity: DiagnosticSeverity =
      anyBelowCritical ? "CRITICAL" : kpisBelow > 0 ? "WARNING" : "NONE";

    const slugCfg = SLUG_CONFIG[dept.slug];
    const bottleneckType = slugCfg?.bottleneckType ?? `Likely ${dept.name} Bottleneck`;
    const businessImpact = slugCfg?.businessImpact ?? "Operational performance risk";
    const investigationArea =
      slugCfg?.investigationArea ?? `Review ${dept.name} KPIs and resource allocation`;

    const affectedDownstreamSlugs = downstreamSlugs.get(dept.id) ?? [];

    departmentDiagnostics.push({
      departmentId: dept.id,
      departmentName: dept.name,
      departmentSlug: dept.slug,
      bottleneckType,
      severity,
      triggerMetrics,
      kpisBelow,
      totalKpis: deptKpis.length,
      affectedDownstreamSlugs,
      businessImpact,
      investigationArea,
    });
  }

  // Productivity metrics (company-wide)
  const financeData = financeEntry?.data as Record<string, number> | null;
  const totalRevenue =
    financeData?.["monthly_revenue"] ??
    financeData?.["mrr"] ??
    financeData?.["gross_revenue"] ??
    0;
  const burnRate = financeData?.["burn_rate"] ?? 0;

  const productivityMetrics: ProductivityMetrics = {
    revenuePerEmployee: employeeCount > 0 ? Math.round(totalRevenue / employeeCount) : 0,
    profitPerEmployee:
      employeeCount > 0 ? Math.round((totalRevenue - burnRate) / employeeCount) : 0,
    totalRevenue,
    totalEmployees: employeeCount,
    burnRate,
  };

  // Executive panel (CEO view only — omitted for scoped queries)
  let execPanel: ExecPanel | null = null;
  if (!scopedDepartmentId) {
    const topBottlenecks = [...departmentDiagnostics]
      .filter((d) => d.severity !== "NONE")
      .sort((a, b) => {
        if (a.severity === "CRITICAL" && b.severity !== "CRITICAL") return -1;
        if (b.severity === "CRITICAL" && a.severity !== "CRITICAL") return 1;
        return b.kpisBelow - a.kpisBelow;
      })
      .slice(0, 3);

    const topRisks = [...departmentDiagnostics]
      .filter(
        (d) =>
          d.severity === "NONE" &&
          d.triggerMetrics.some((m) => m.trend === "WORSENING")
      )
      .slice(0, 3);

    const topOpportunities = [...departmentDiagnostics]
      .filter(
        (d) =>
          d.severity === "NONE" &&
          d.triggerMetrics.some((m) => m.trend === "IMPROVING")
      )
      .slice(0, 3);

    const deptsRequiringAttention: DeptAttention[] = departmentDiagnostics
      .filter((d) => d.severity !== "NONE")
      .map((d) => ({
        departmentId: d.departmentId,
        departmentName: d.departmentName,
        severity: d.severity,
        kpisBelow: d.kpisBelow,
      }));

    const projectsBehindSchedule: GoalBrief[] = goals
      .filter((g) => {
        const progress =
          g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
        const daysLeft = differenceInDays(g.dueDate, now);
        return progress < 50 && daysLeft >= 0 && daysLeft <= 60;
      })
      .map((g) => ({
        id: g.id,
        title: g.title,
        progressPct: Math.round(
          g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0
        ),
        daysRemaining: differenceInDays(g.dueDate, now),
        departmentName: g.department?.name ?? null,
      }))
      .slice(0, 5);

    const teamsAtCapacity: TeamCapacity[] = departmentDiagnostics
      .map((d) => {
        const deptKpis = kpiConfigs.filter((k) => k.departmentId === d.departmentId && k.isActive && k.targetValue > 0);
        const deptRecentEntries = recentEntries.filter((e) => e.departmentId === d.departmentId);
        let stressedCount = 0;
        for (const kpi of deptKpis) {
          const actual = avgValue(
            deptRecentEntries.map((e) => (e.data as Record<string, number>)[kpi.key] ?? 0)
          );
          const pctOfTarget = (actual / kpi.targetValue) * 100;
          if (pctOfTarget >= kpi.criticalThreshold * 100 && pctOfTarget < kpi.warningThreshold * 100) {
            stressedCount++;
          }
        }
        return {
          departmentId: d.departmentId,
          departmentName: d.departmentName,
          stressedKpisCount: stressedCount,
          totalKpis: deptKpis.length,
        };
      })
      .filter((t) => t.totalKpis > 0 && t.stressedKpisCount >= Math.ceil(t.totalKpis / 2))
      .slice(0, 5);

    const decliningKpis: DecliningKpi[] = departmentDiagnostics
      .flatMap((d) =>
        d.triggerMetrics
          .filter((m) => m.trend === "WORSENING")
          .map((m) => ({
            kpiLabel: m.kpiLabel,
            departmentName: d.departmentName,
            changeFromPrior: m.changeFromPrior,
            pctOfTarget: m.pctOfTarget,
          }))
      )
      .sort((a, b) => a.changeFromPrior - b.changeFromPrior)
      .slice(0, 6);

    const criticalAlerts: AlertBrief[] = criticalAlertRows.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
    }));

    execPanel = {
      topBottlenecks,
      topRisks,
      topOpportunities,
      deptsRequiringAttention,
      projectsBehindSchedule,
      teamsAtCapacity,
      decliningKpis,
      criticalAlerts,
    };
  }

  return { departmentDiagnostics, productivityMetrics, execPanel };
}
