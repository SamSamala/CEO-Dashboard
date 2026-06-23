import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentPeriodKey } from "@/lib/utils";
import { SpendingForm } from "@/components/spending/spending-form";

export const metadata = { title: "Log Expense" };

export default async function NewExpensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  const period = getCurrentPeriodKey("monthly");

  // Fetch departments with their budget status
  const departments = await prisma.department.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Build a budget remaining map per dept
  const budgetMap: Record<string, { allocated: number; remaining: number }> = {};
  await Promise.all(
    departments.map(async (dept) => {
      const [alloc, spent] = await Promise.all([
        prisma.budgetAllocation.aggregate({
          where: { companyId, departmentId: dept.id, period },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, departmentId: dept.id, period },
          _sum: { amount: true },
        }),
      ]);
      const allocated = alloc._sum.amount ?? 0;
      const spentAmt = spent._sum.amount ?? 0;
      budgetMap[dept.id] = { allocated, remaining: allocated - spentAmt };
    })
  );

  return <SpendingForm departments={departments} budgetMap={budgetMap} period={period} />;
}
