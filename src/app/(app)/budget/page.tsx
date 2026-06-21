import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, getCurrentPeriodKey } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

      return { dept, allocatedAmount, spentAmount, remaining, utilization };
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Period: {period}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Allocated", value: formatCurrency(totals.allocated), sub: "This period" },
          { label: "Total Spent", value: formatCurrency(totals.spent), sub: "This period" },
          { label: "Remaining", value: formatCurrency(totals.remaining), sub: `${(100 - overallUtilization).toFixed(0)}% left` },
          { label: "Utilization", value: `${overallUtilization.toFixed(1)}%`, sub: "Overall" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetData.map(({ dept, allocatedAmount, spentAmount, remaining, utilization }) => (
              <div key={dept.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dept.colorHex }} />
                    <span className="font-medium">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Allocated: {formatCurrency(allocatedAmount)}</span>
                    <span>Spent: {formatCurrency(spentAmount)}</span>
                    <span className={cn("font-medium", remaining < 0 ? "text-red-500" : "text-foreground")}>
                      Remaining: {formatCurrency(remaining)}
                    </span>
                    <span className={cn(
                      "font-semibold w-12 text-right",
                      utilization > 100 ? "text-red-500" : utilization > 80 ? "text-amber-500" : "text-emerald-600"
                    )}>
                      {utilization.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={Math.min(utilization, 100)}
                  className={cn(
                    "h-2",
                    utilization > 100 ? "[&>div]:bg-red-500" : utilization > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
