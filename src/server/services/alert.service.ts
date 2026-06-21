import { prisma } from "@/lib/prisma";
import { subDays, startOfWeek, subWeeks } from "date-fns";
import type { AlertRuleType } from "@/config/alert-rules.config";

export async function evaluateAlerts(companyId: string): Promise<void> {
  const rules = await prisma.alertRule.findMany({
    where: { companyId, isActive: true },
  });

  for (const rule of rules) {
    try {
      await evaluateRule(companyId, rule.ruleType as AlertRuleType, rule.threshold ?? 0, rule.id);
    } catch (err) {
      console.error(`Alert rule ${rule.ruleType} failed:`, err);
    }
  }
}

async function evaluateRule(
  companyId: string,
  ruleType: AlertRuleType,
  threshold: number,
  ruleId: string
): Promise<void> {
  const today = new Date();
  const todayKey = today.toISOString().split("T")[0];

  switch (ruleType) {
    case "BUDGET_EXCEEDED": {
      const departments = await prisma.department.findMany({ where: { companyId } });
      const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      for (const dept of departments) {
        const [budget, expenses] = await Promise.all([
          prisma.budgetAllocation.aggregate({
            where: { companyId, departmentId: dept.id, period },
            _sum: { amount: true },
          }),
          prisma.expense.aggregate({
            where: { companyId, departmentId: dept.id, period },
            _sum: { amount: true },
          }),
        ]);
        const allocated = budget._sum.amount ?? 0;
        const spent = expenses._sum.amount ?? 0;
        if (allocated > 0 && spent / allocated > threshold) {
          await createAlertIfNew(companyId, ruleId, `Budget Exceeded: ${dept.name}`,
            `${dept.name} has spent ${((spent / allocated) * 100).toFixed(0)}% of their ${period} budget ($${spent.toLocaleString()} of $${allocated.toLocaleString()}).`,
            "CRITICAL", todayKey);
        }
      }
      break;
    }

    case "RUNWAY_LOW": {
      const finEntry = await prisma.metricEntry.findFirst({
        where: { companyId, department: { slug: "finance" } },
        orderBy: { businessDate: "desc" },
      });
      if (finEntry) {
        const data = finEntry.data as Record<string, number>;
        const cash = data["cash_balance"] ?? 0;
        const burn = data["burn_rate"] ?? 0;
        const runwayDays = burn > 0 ? (cash / burn) * 30 : 999;
        if (runwayDays < threshold) {
          await createAlertIfNew(companyId, ruleId, "Low Cash Runway",
            `Current cash runway is ${Math.round(runwayDays)} days. Cash balance: $${cash.toLocaleString()}. Monthly burn: $${burn.toLocaleString()}.`,
            "CRITICAL", todayKey);
        }
      }
      break;
    }

    case "REVENUE_DROP": {
      const thisWeekStart = startOfWeek(today);
      const lastWeekStart = subWeeks(thisWeekStart, 1);
      const [thisWeek, lastWeek] = await Promise.all([
        prisma.metricEntry.findMany({
          where: { companyId, department: { slug: "finance" }, businessDate: { gte: thisWeekStart } },
        }),
        prisma.metricEntry.findMany({
          where: { companyId, department: { slug: "finance" }, businessDate: { gte: lastWeekStart, lt: thisWeekStart } },
        }),
      ]);
      const thisRev = thisWeek.reduce((s, e) => s + ((e.data as Record<string, number>)["monthly_revenue"] ?? 0), 0);
      const lastRev = lastWeek.reduce((s, e) => s + ((e.data as Record<string, number>)["monthly_revenue"] ?? 0), 0);
      if (lastRev > 0 && thisRev < lastRev) {
        const drop = ((lastRev - thisRev) / lastRev) * 100;
        if (drop >= threshold) {
          await createAlertIfNew(companyId, ruleId, "Revenue Drop Detected",
            `Revenue dropped ${drop.toFixed(1)}% this week vs last week ($${thisRev.toLocaleString()} vs $${lastRev.toLocaleString()}).`,
            "WARNING", todayKey);
        }
      }
      break;
    }

    case "APPROVAL_BACKLOG": {
      const pending = await prisma.approval.count({ where: { companyId, status: "PENDING" } });
      if (pending > threshold) {
        await createAlertIfNew(companyId, ruleId, "Approval Backlog",
          `${pending} approvals are waiting for CEO decision. Oldest approvals may be blocking team progress.`,
          "WARNING", todayKey);
      }
      break;
    }

    case "HIRING_DELAY": {
      const staleDaysAgo = subDays(today, threshold);
      const staleHiring = await prisma.hiringRequest.count({
        where: { companyId, status: "ACTIVE", updatedAt: { lt: staleDaysAgo } },
      });
      if (staleHiring > 0) {
        await createAlertIfNew(companyId, ruleId, "Hiring Delays",
          `${staleHiring} hiring request(s) have had no activity for over ${threshold} days.`,
          "WARNING", todayKey);
      }
      break;
    }

    case "DEPT_BOTTLENECK": {
      const critical = await prisma.bottleneck.count({
        where: { companyId, severity: "CRITICAL", resolvedAt: null },
      });
      if (critical > 0) {
        await createAlertIfNew(companyId, ruleId, "Critical Bottleneck Detected",
          `${critical} department(s) are operating at critical bottleneck levels. Immediate attention required.`,
          "CRITICAL", todayKey);
      }
      break;
    }

    case "LOW_PRODUCTIVITY": {
      // Will be triggered from metric submission if dept score < threshold for 3 days
      break;
    }
  }
}

async function createAlertIfNew(
  companyId: string,
  alertRuleId: string,
  title: string,
  message: string,
  severity: "INFO" | "WARNING" | "CRITICAL",
  dedupKey: string
): Promise<void> {
  const existing = await prisma.alert.findFirst({
    where: {
      companyId,
      alertRuleId,
      metadata: { path: ["dedupKey"], equals: dedupKey },
      status: { not: "RESOLVED" },
    },
  });
  if (!existing) {
    await prisma.alert.create({
      data: { companyId, alertRuleId, title, message, severity, metadata: { dedupKey } },
    });
  }
}
