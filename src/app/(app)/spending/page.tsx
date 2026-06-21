import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, getCurrentPeriodKey } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { format } from "date-fns";

export const metadata = { title: "Spending" };

export default async function SpendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const companyId = session.user.companyId;
  const period = getCurrentPeriodKey("monthly");

  const whereClause = session.user.role === "CEO"
    ? { companyId, period }
    : { companyId, period, departmentId: session.user.departmentId ?? "" };

  const expenses = await prisma.expense.findMany({
    where: whereClause,
    include: { department: { select: { name: true, colorHex: true } } },
    orderBy: { date: "desc" },
    take: 50,
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spending</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {period} — {expenses.length} expense{expenses.length !== 1 ? "s" : ""} · Total: {formatCurrency(total)}
          </p>
        </div>
        <Link href="/spending/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors">
          <Plus className="h-4 w-4" />
          Log Expense
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Receipt className="h-8 w-8" />
              <p>No expenses logged this month</p>
            </div>
          ) : (
            <div className="divide-y">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{expense.description}</p>
                      <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span
                        className="inline-flex items-center gap-1"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full inline-block"
                          style={{ backgroundColor: expense.department.colorHex }}
                        />
                        {expense.department.name}
                      </span>
                      {expense.vendorName && ` · ${expense.vendorName}`}
                      {" · "}
                      {format(expense.date, "MMM d")}
                    </p>
                  </div>
                  <p className="font-semibold text-sm shrink-0">{formatCurrency(expense.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
