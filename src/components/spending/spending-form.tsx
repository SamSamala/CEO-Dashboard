"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { logExpense } from "@/server/actions/spending.actions";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";

type Dept = { id: string; name: string };
type BudgetInfo = { allocated: number; remaining: number };

interface Props {
  departments: Dept[];
  budgetMap: Record<string, BudgetInfo>;
  period: string;
}

const COMMON_CATEGORIES = [
  "Facebook Ads", "Google Ads", "LinkedIn Ads", "Influencer Campaign",
  "Software / SaaS", "Contractors", "Office Supplies", "Travel",
  "Equipment", "Legal", "Accounting", "Marketing Materials",
  "Customer Events", "Team Meals", "Training", "Other",
];

export function SpendingForm({ departments, budgetMap, period }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    departmentId: "",
    amount: "",
    category: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    vendorName: "",
  });

  const { execute, isPending } = useAction(logExpense, {
    onSuccess: () => { toast.success("Expense logged"); router.push("/spending"); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to log expense"),
  });

  const selectedBudget = form.departmentId ? budgetMap[form.departmentId] : null;
  const parsedAmount = parseFloat(form.amount) || 0;
  const wouldExceed = selectedBudget && parsedAmount > 0 && parsedAmount > selectedBudget.remaining;
  const noAllocation = selectedBudget && selectedBudget.allocated === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.departmentId || !form.amount || !form.category || !form.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    execute({
      departmentId: form.departmentId,
      amount: parseFloat(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
      vendorName: form.vendorName || undefined,
    });
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Log Expense</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Department *</Label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select department…</option>
                {departments.map((d) => {
                  const b = budgetMap[d.id];
                  const label = b && b.allocated > 0
                    ? `${d.name} (${formatCurrency(b.remaining)} remaining)`
                    : `${d.name} (no budget)`;
                  return <option key={d.id} value={d.id}>{label}</option>;
                })}
              </select>
            </div>

            {/* Budget status indicator */}
            {form.departmentId && selectedBudget && (
              <div className={cn(
                "rounded-lg border px-3 py-2 text-sm flex items-start gap-2",
                noAllocation
                  ? "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800"
                  : wouldExceed
                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800"
              )}>
                {noAllocation ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : wouldExceed ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {noAllocation
                    ? `No approved budget for this department in ${period}. Submit a budget request via /budget first.`
                    : wouldExceed
                    ? `Amount exceeds remaining budget of ${formatCurrency(selectedBudget.remaining)}.`
                    : `${formatCurrency(selectedBudget.remaining)} remaining of ${formatCurrency(selectedBudget.allocated)} allocated.`
                  }
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Category *</Label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select category…</option>
                {COMMON_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea
                placeholder="What was this expense for?"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Vendor Name</Label>
              <Input
                placeholder="e.g. Meta, Google, AWS"
                value={form.vendorName}
                onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isPending || !!noAllocation || !!wouldExceed}
                className="flex-1"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Expense
              </Button>
              <Button variant="outline" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
