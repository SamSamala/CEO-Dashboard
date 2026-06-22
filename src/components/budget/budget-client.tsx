"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { upsertBudgetAllocation } from "@/server/actions/budget.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn, formatCurrency } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";

type DeptBudget = {
  dept: { id: string; name: string; colorHex: string };
  allocatedAmount: number;
  spentAmount: number;
  remaining: number;
  utilization: number;
};

interface Props {
  budgetData: DeptBudget[];
  period: string;
  totals: { allocated: number; spent: number; remaining: number };
  overallUtilization: number;
}

export function BudgetClient({ budgetData, period, totals, overallUtilization }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptBudget | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { execute, isPending } = useAction(upsertBudgetAllocation, {
    onSuccess: () => {
      toast.success("Budget allocation saved");
      setOpen(false);
      setEditing(null);
      setAmount("");
      setNotes("");
      router.refresh();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to save"),
  });

  function openDialog(row: DeptBudget) {
    setEditing(row);
    setAmount(row.allocatedAmount > 0 ? String(row.allocatedAmount) : "");
    setNotes("");
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    execute({ departmentId: editing.dept.id, amount: parsed, notes: notes || undefined });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Budget Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Period: {period}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Allocated", value: formatCurrency(totals.allocated), sub: "This period" },
          { label: "Total Spent",     value: formatCurrency(totals.spent),     sub: "This period" },
          { label: "Remaining",       value: formatCurrency(totals.remaining), sub: `${(100 - overallUtilization).toFixed(0)}% left` },
          { label: "Utilization",     value: `${overallUtilization.toFixed(1)}%`, sub: "Overall" },
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Department Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {budgetData.map((row) => (
              <div key={row.dept.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.dept.colorHex }} />
                    <span className="font-medium">{row.dept.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Allocated: {formatCurrency(row.allocatedAmount)}</span>
                    <span>Spent: {formatCurrency(row.spentAmount)}</span>
                    <span className={cn("font-medium", row.remaining < 0 ? "text-red-500" : "")}>
                      Remaining: {formatCurrency(row.remaining)}
                    </span>
                    <span className={cn(
                      "font-semibold w-12 text-right",
                      row.utilization > 100 ? "text-red-500" : row.utilization > 80 ? "text-amber-500" : "text-emerald-600"
                    )}>
                      {row.utilization.toFixed(0)}%
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-xs"
                      onClick={() => openDialog(row)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {row.allocatedAmount > 0 ? "Edit" : "Allocate"}
                    </Button>
                  </div>
                </div>
                <Progress
                  value={Math.min(row.utilization, 100)}
                  className={cn(
                    "h-2",
                    row.utilization > 100 ? "[&>div]:bg-red-500" : row.utilization > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogTrigger className="hidden" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.allocatedAmount ? "Edit" : "Allocate"} Budget — {editing?.dept.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Amount ({period})</Label>
              <Input
                type="number"
                min={1}
                step="0.01"
                placeholder="e.g. 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Q3 marketing push"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Allocation
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
