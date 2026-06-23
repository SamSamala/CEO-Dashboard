import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentPeriodKey } from "@/lib/utils";
import { BudgetClient } from "@/components/budget/budget-client";
import { BudgetDeptHeadView } from "@/components/budget/budget-dept-head";

export const metadata = { title: "Budget" };

export default async function BudgetPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "CEO" && role !== "DEPT_HEAD")) redirect("/dashboard");

  const companyId = session.user.companyId;
  const period = getCurrentPeriodKey("monthly");

  // ── DEPT_HEAD view ──────────────────────────────────────────────────────────
  if (role === "DEPT_HEAD") {
    const deptId = session.user.departmentId ?? "";
    const dept = await prisma.department.findFirst({
      where: { id: deptId, companyId },
      select: { id: true, name: true, colorHex: true },
    });
    if (!dept) redirect("/dashboard");

    const [allocation, spentAgg, pendingRequests] = await Promise.all([
      prisma.budgetAllocation.findFirst({
        where: { companyId, departmentId: deptId, period },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.aggregate({
        where: { companyId, departmentId: deptId, period },
        _sum: { amount: true },
      }),
      prisma.approval.findMany({
        where: { companyId, departmentId: deptId, type: "BUDGET_REQUEST", status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return (
      <BudgetDeptHeadView
        dept={dept}
        period={period}
        allocatedAmount={allocation?.amount ?? 0}
        spentAmount={spentAgg._sum.amount ?? 0}
        pendingRequests={pendingRequests as any}
      />
    );
  }

  // ── CEO view ────────────────────────────────────────────────────────────────
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

  // Pending budget requests for CEO to review
  const pendingBudgetRequests = await prisma.approval.findMany({
    where: { companyId, type: "BUDGET_REQUEST", status: "PENDING" },
    include: { department: { select: { name: true } }, submitter: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

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
      pendingBudgetRequests={pendingBudgetRequests as any}
    />
  );
}
