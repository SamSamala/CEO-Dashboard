import { prisma } from "@/lib/prisma";
import { computeCompanyHealthScore } from "@/server/services/health-score.service";
import { computeDeptScorecard } from "@/server/services/kpi.service";
import { getActiveBottlenecks } from "@/server/services/bottleneck.service";
import type { ActionItem, DeptHealthScore } from "@/types/dashboard.types";
import { differenceInHours, format, subDays } from "date-fns";

export async function getExecutiveDashboardData(companyId: string) {
  const [healthScore, departments, pendingApprovals, activeAlerts, bottlenecks, goals, employees, financeEntry] =
    await Promise.all([
      computeCompanyHealthScore(companyId),
      prisma.department.findMany({ where: { companyId, isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.approval.findMany({
        where: { companyId, status: "PENDING" },
        include: { department: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.alert.findMany({
        where: { companyId, status: "ACTIVE" },
        orderBy: [{ severity: "desc" }, { triggeredAt: "desc" }],
        take: 5,
      }),
      getActiveBottlenecks(companyId),
      prisma.goal.findMany({
        where: { companyId, isArchived: false },
        include: { owner: { select: { name: true } } },
      }),
      prisma.employee.count({
        where: { companyId, employmentStatus: "ACTIVE" },
      }),
      prisma.metricEntry.findFirst({
        where: { companyId, department: { slug: "finance" } },
        orderBy: { businessDate: "desc" },
      }),
    ]);

  const deptScorecards: DeptHealthScore[] = await Promise.all(
    departments.map(async (dept) => {
      const scorecard = await computeDeptScorecard(dept.id, companyId).catch(() => null);
      const budgetUsage = await getBudgetUtilization(companyId, dept.id);
      const deptGoals = goals.filter((g) => g.departmentId === dept.id);
      const goalCompletion = deptGoals.length > 0 ? getGoalCompletion(deptGoals) : 0;
      const deptBottlenecks = bottlenecks.filter((b) => b.departmentId === dept.id).length;

      return {
        departmentId: dept.id,
        departmentSlug: dept.slug,
        departmentName: dept.name,
        colorHex: dept.colorHex,
        performanceScore: scorecard?.performanceScore ?? 0,
        efficiencyScore: scorecard ? Math.max(0, scorecard.performanceScore - deptBottlenecks * 10) : 0,
        trendScore: scorecard?.trendScore ?? 50,
        riskScore: scorecard?.riskScore ?? 50,
        dataConfidenceScore: scorecard?.dataConfidenceScore ?? 0,
        goalCompletion,
        budgetUtilization: budgetUsage,
        status: scorecard?.status ?? "gray",
        bottleneckCount: deptBottlenecks,
      } satisfies DeptHealthScore;
    })
  );

  const financeData = financeEntry?.data as Record<string, number> | null;

  return {
    healthScore,
    deptScorecards,
    pendingApprovals,
    activeAlerts,
    bottlenecks: bottlenecks.slice(0, 5),
    goals,
    employeeCount: employees,
    finance: {
      revenue: financeData?.["monthly_revenue"] ?? financeData?.["mrr"] ?? financeData?.["gross_revenue"] ?? 0,
      cash: financeData?.["cash_balance"] ?? 0,
      burnRate: financeData?.["burn_rate"] ?? 0,
      expenses: financeData?.["monthly_expenses"] ?? financeData?.["cogs"] ?? 0,
    },
  };
}

export async function getFounderActionItems(companyId: string): Promise<ActionItem[]> {
  const items: ActionItem[] = [];
  const now = new Date();

  const [
    pendingApprovals,
    criticalBottlenecks,
    financeEntry,
    hiringRequests,
    goals,
    staleMetrics,
    departments,
    budgetAllocations,
    expenses,
  ] = await Promise.all([
    prisma.approval.findMany({ where: { companyId, status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    prisma.bottleneck.findMany({ where: { companyId, severity: "CRITICAL", resolvedAt: null }, include: { department: true } }),
    prisma.metricEntry.findFirst({ where: { companyId, department: { slug: "finance" } }, orderBy: { businessDate: "desc" } }),
    prisma.hiringRequest.findMany({ where: { companyId, status: "ACTIVE" } }),
    prisma.goal.findMany({ where: { companyId, isArchived: false } }),
    prisma.department.findMany({
      where: {
        companyId,
        isActive: true,
        metricEntries: { none: { businessDate: { gte: subDays(now, 3) }, companyId } },
      },
    }),
    prisma.department.findMany({ where: { companyId, isActive: true } }),
    prisma.budgetAllocation.findMany({ where: { companyId, period: getCurrentPeriod() } }),
    prisma.expense.findMany({ where: { companyId, period: getCurrentPeriod() } }),
  ]);

  // Pending approvals older than 24h (or 48h for escalation)
  for (const approval of pendingApprovals) {
    const ageHours = differenceInHours(now, approval.createdAt);
    if (ageHours >= 48) {
      items.push({
        id: `approval-escalation-${approval.id}`,
        type: "APPROVAL_ESCALATION",
        priority: "HIGH",
        title: `Escalated: ${approval.title}`,
        description: `Pending ${Math.round(ageHours / 24)} day(s). Team may be blocked waiting for this decision.`,
        href: `/approvals`,
        ageHours,
      });
    } else if (ageHours >= 24) {
      items.push({
        id: `approval-${approval.id}`,
        type: "PENDING_APPROVAL",
        priority: "MEDIUM",
        title: `Approval needed: ${approval.title}`,
        description: `Waiting ${Math.round(ageHours / 24)} day(s).`,
        href: `/approvals`,
        ageHours,
      });
    }
  }

  // Critical bottlenecks
  for (const b of criticalBottlenecks) {
    items.push({
      id: `bottleneck-${b.id}`,
      type: "BOTTLENECK",
      priority: b.isPrimaryConstraint ? "CRITICAL" : "HIGH",
      title: `${b.isPrimaryConstraint ? "Primary Constraint" : "Bottleneck"}: ${b.department.name}`,
      description: b.investigationArea ?? `${b.department.name} is operating below critical threshold.`,
      href: `/departments/${b.department.slug.toLowerCase()}`,
    });
  }

  // Low runway
  if (financeEntry) {
    const data = financeEntry.data as Record<string, number>;
    const cash = data["cash_balance"] ?? 0;
    const burn = data["burn_rate"] ?? 0;
    const runway = burn > 0 ? (cash / burn) * 30 : 999;
    if (runway < 60) {
      items.push({
        id: "runway",
        type: "RUNWAY",
        priority: "CRITICAL",
        title: `Cash runway: ${Math.round(runway)} days`,
        description: `At current burn rate of $${burn.toLocaleString()}/month, you have ${Math.round(runway)} days of runway.`,
        href: "/budget",
      });
    }
  }

  // Departments with no metrics in 3+ business days
  for (const dept of staleMetrics) {
    items.push({
      id: `data-missing-${dept.id}`,
      type: "DATA_MISSING",
      priority: "LOW",
      title: `${dept.name} has not submitted metrics`,
      description: "No daily metrics submitted in the last 3 business days. Data may be outdated.",
      href: `/departments/${dept.slug.toLowerCase()}`,
    });
  }

  // Goals behind schedule
  const behindGoals = goals.filter((g) => {
    if (g.targetValue === 0) return false;
    const daysTotal = Math.max(1, differenceInHours(g.dueDate, g.startDate) / 24);
    const daysElapsed = Math.max(0, differenceInHours(now, g.startDate) / 24);
    const expectedProgress = (daysElapsed / daysTotal) * g.targetValue;
    return g.currentValue < expectedProgress * 0.8;
  });

  if (behindGoals.length > 0) {
    items.push({
      id: "goals",
      type: "GOAL",
      priority: "MEDIUM",
      title: `${behindGoals.length} goal(s) behind schedule`,
      description: `${behindGoals.map((g) => g.title).slice(0, 2).join(", ")} need attention.`,
      href: "/goals",
    });
  }

  // Goals due within 14 days and < 70% complete
  const urgentGoals = goals.filter((g) => {
    if (g.targetValue === 0 || g.status === "COMPLETED") return false;
    const daysUntilDue = differenceInHours(g.dueDate, now) / 24;
    const progress = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
    return daysUntilDue <= 14 && daysUntilDue > 0 && progress < 70;
  });
  if (urgentGoals.length > 0) {
    items.push({
      id: "goal-deadline",
      type: "GOAL_DEADLINE",
      priority: "HIGH",
      title: `${urgentGoals.length} goal(s) due in 14 days`,
      description: `${urgentGoals.map((g) => g.title).slice(0, 2).join(", ")} are below 70% with deadline approaching.`,
      href: "/goals",
    });
  }

  // Budget overrun: departments > 90% of allocation
  const periodBudgets = new Map<string, number>();
  const periodSpend = new Map<string, number>();
  for (const b of budgetAllocations) {
    periodBudgets.set(b.departmentId, (periodBudgets.get(b.departmentId) ?? 0) + b.amount);
  }
  for (const e of expenses) {
    periodSpend.set(e.departmentId, (periodSpend.get(e.departmentId) ?? 0) + e.amount);
  }
  for (const dept of departments) {
    const budget = periodBudgets.get(dept.id) ?? 0;
    const spent = periodSpend.get(dept.id) ?? 0;
    if (budget > 0 && spent / budget > 0.9) {
      items.push({
        id: `budget-overrun-${dept.id}`,
        type: "BUDGET_OVERRUN",
        priority: spent > budget ? "HIGH" : "MEDIUM",
        title: `${dept.name} at ${Math.round((spent / budget) * 100)}% of budget`,
        description: `$${spent.toLocaleString()} spent of $${budget.toLocaleString()} budget this month.`,
        href: "/budget",
      });
    }
  }

  // Hiring stalled: approved with no candidates in 7 days
  const stalledHiring = hiringRequests.filter(
    (h) => differenceInHours(now, h.updatedAt) > 7 * 24
  );
  if (stalledHiring.length > 0) {
    items.push({
      id: "hiring-stalled",
      type: "HIRING_STALLED",
      priority: "MEDIUM",
      title: `${stalledHiring.length} hiring request(s) stalled`,
      description: `${stalledHiring.length} active hiring request(s) have had no activity in over 7 days.`,
      href: "/hiring",
    });
  }

  return items
    .sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 10);
}

async function getBudgetUtilization(companyId: string, departmentId: string): Promise<number | null> {
  const period = getCurrentPeriod();
  const [budget, spent] = await Promise.all([
    prisma.budgetAllocation.aggregate({
      where: { companyId, departmentId, period },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, departmentId, period },
      _sum: { amount: true },
    }),
  ]);
  const allocated = budget._sum.amount ?? 0;
  const expenses = spent._sum.amount ?? 0;
  if (allocated === 0) return null;
  return Math.round((expenses / allocated) * 100);
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getGoalCompletion(goals: { currentValue: number; targetValue: number }[]): number {
  if (goals.length === 0) return 0;
  const completed = goals.filter((g) => g.targetValue > 0 && g.currentValue / g.targetValue >= 0.9).length;
  return Math.round((completed / goals.length) * 100);
}

export async function getRevenueHistory(companyId: string): Promise<{ date: string; revenue: number; burn: number }[]> {
  const financeDept = await prisma.department.findFirst({
    where: { companyId, slug: "finance" },
    select: { id: true },
  });
  if (!financeDept) return [];

  const entries = await prisma.metricEntry.findMany({
    where: {
      companyId,
      departmentId: financeDept.id,
      businessDate: { gte: subDays(new Date(), 60) },
    },
    orderBy: { businessDate: "asc" },
  });

  const byDate = new Map<string, { revenue: number; burn: number }>();
  for (const entry of entries) {
    const key = format(entry.businessDate, "MMM d");
    const data = entry.data as Record<string, number>;
    byDate.set(key, {
      revenue: data["monthly_revenue"] ?? data["mrr"] ?? 0,
      burn: data["burn_rate"] ?? 0,
    });
  }

  return Array.from(byDate.entries()).map(([date, vals]) => ({ date, ...vals }));
}
