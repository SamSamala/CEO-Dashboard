import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentPeriodKey } from "@/lib/utils";
import { BudgetClient } from "@/components/budget/budget-client";

export const metadata = { title: "Budget" };

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/dashboard");

  const companyId = session.user.companyId;
  const period = getCurrentPeriodKey("monthly");

  const departments = await prisma.department.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });

  const budgetData = await Promise.all(
    departments.map(async (dept) => {
      const [allocated, spent] = await Promise.all([
        prisma.budgetAllocation.aggregate({
          where: { companyId, departmentId: dept.id, period },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, departmentId: dept.id, period },
          _sum: { amount: true },
        }),
      ]);

      const allocatedAmount = allocated._sum.amount ?? 0;
      const spentAmount = spent._sum.amount ?? 0;
      const remaining = allocatedAmount - spentAmount;
      const utilization = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0;

      return { dept: { id: dept.id, name: dept.name, colorHex: dept.colorHex }, allocatedAmount, spentAmount, remaining, utilization };
    })
  );

  const totals = budgetData.reduce(
    (acc, d) => ({
      allocated: acc.allocated + d.allocatedAmount,
      spent: acc.spent + d.spentAmount,
      remaining: acc.remaining + d.remaining,
    }),
    { allocated: 0, spent: 0, remaining: 0 }
  );

  const overallUtilization = totals.allocated > 0 ? (totals.spent / totals.allocated) * 100 : 0;

  return (
    <BudgetClient
      budgetData={budgetData}
      period={period}
      totals={totals}
      overallUtilization={overallUtilization}
    />
  );
}
