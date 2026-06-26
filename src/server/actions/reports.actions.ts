"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeDeptScorecard } from "@/server/services/kpi.service";
import { getActiveBottlenecks } from "@/server/services/bottleneck.service";
import { getCurrentPeriodKey } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

const generateReportSchema = z.object({
  period: z.enum(["MONTHLY", "WEEKLY", "QUARTERLY"]).default("MONTHLY"),
});

export const generateReport = authActionClient
  .metadata({ actionName: "generateReport" })
  .schema(generateReportSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { companyId } = ctx;
    const periodKey = getCurrentPeriodKey(
      parsedInput.period === "MONTHLY" ? "monthly" : parsedInput.period === "QUARTERLY" ? "quarterly" : "monthly"
    );

    const [departments, goals, bottlenecks, employees, financeEntry, expenses, budgets] = await Promise.all([
      prisma.department.findMany({ where: { companyId, isActive: true } }),
      prisma.goal.findMany({ where: { companyId, isArchived: false } }),
      getActiveBottlenecks(companyId),
      prisma.employee.count({ where: { companyId, employmentStatus: "ACTIVE" } }),
      prisma.metricEntry.findFirst({ where: { companyId, department: { slug: "finance" } }, orderBy: { businessDate: "desc" } }),
      prisma.expense.aggregate({ where: { companyId, period: periodKey }, _sum: { amount: true } }),
      prisma.budgetAllocation.aggregate({ where: { companyId, period: periodKey }, _sum: { amount: true } }),
    ]);

    const deptScores = await Promise.all(
      departments.map(async (d) => {
        const sc = await computeDeptScorecard(d.id, companyId).catch(() => null);
        return { name: d.name, slug: d.slug, score: sc?.performanceScore ?? 0, status: sc?.status ?? "gray" };
      })
    );

    const financeData = financeEntry?.data as Record<string, number> | null;

    const content = {
      period: parsedInput.period,
      periodKey,
      generatedAt: new Date().toISOString(),
      summary: {
        revenue: financeData?.["monthly_revenue"] ?? 0,
        cash: financeData?.["cash_balance"] ?? 0,
        burnRate: financeData?.["burn_rate"] ?? 0,
        headcount: employees,
        totalSpent: expenses._sum.amount ?? 0,
        totalBudget: budgets._sum.amount ?? 0,
        goalsCompleted: goals.filter(g => g.status === "COMPLETED").length,
        goalsTotal: goals.length,
        activeBottlenecks: bottlenecks.length,
      },
      departments: deptScores,
      bottlenecks: bottlenecks.slice(0, 5),
      goals: goals.map(g => ({ title: g.title, status: g.status, progress: g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0 })),
    };

    const title = `${parsedInput.period} Report — ${format(new Date(), "MMMM yyyy")}`;

    const jsonContent = content as any;
    await prisma.report.upsert({
      where: { companyId_period_periodKey: { companyId, period: parsedInput.period, periodKey } },
      update: { content: jsonContent, title, generatedAt: new Date() },
      create: { companyId, period: parsedInput.period, periodKey, title, content: jsonContent },
    });

    revalidatePath("/reports");
    return { periodKey };
  });
