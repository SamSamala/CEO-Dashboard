"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { submitApproval } from "@/server/actions/approvals.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { Loader2, Clock, CheckCircle2, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type PendingRequest = {
  id: string;
  title: string;
  requestedAmount: number | null;
  createdAt: Date;
  status: string;
};

interface Props {
  dept: { id: string; name: string; colorHex: string };
  period: string;
  allocatedAmount: number;
  spentAmount: number;
  pendingRequests: PendingRequest[];
}

export function BudgetDeptHeadView({ dept, period, allocatedAmount, spentAmount, pendingRequests }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const remaining = allocatedAmount - spentAmount;
  const utilization = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0;
  const hasPending = pendingRequests.length > 0;

  const { execute, isPending } = useAction(submitApproval, {
    onSuccess: () => {
      toast.success("Budget request submitted — awaiting CEO approval");
      setShowForm(false);
      setAmount("");
      setDescription("");
      router.refresh();
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to submit request"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Enter a valid amount"); return; }
    execute({
      departmentId: dept.id,
      type: "BUDGET_REQUEST",
      title: `Budget Request — ${dept.name} (${period})`,
      description: description || `Budget allocation request for ${dept.name} for period ${period}`,
      requestedAmount: parsed,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Department Budget</h1>
        <p className="text-muted-foreground text-sm mt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dept.colorHex }} />
            {dept.name} · Period: {period}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Allocated", value: formatCurrency(allocatedAmount), sub: "CEO-approved" },
          { label: "Spent", value: formatCurrency(spentAmount), sub: "This period" },
          { label: "Remaining", value: formatCurrency(remaining), sub: remaining < 0 ? "Over budget!" : "Available" },
          { label: "Utilization", value: `${utilization.toFixed(1)}%`, sub: "Of allocation" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-1", s.label === "Remaining" && remaining < 0 ? "text-red-500" : "")}>{s.value}</p>
              <p className={cn("text-xs", s.label === "Remaining" && remaining < 0 ? "text-red-500" : "text-muted-foreground")}>{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {allocatedAmount > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget utilization</span>
              <span className={cn("font-medium", utilization > 100 ? "text-red-500" : utilization > 80 ? "text-amber-500" : "text-emerald-600")}>
                {utilization.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(utilization, 100)}
              className={cn("h-2.5", utilization > 100 ? "[&>div]:bg-red-500" : utilization > 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500")}
            />
          </CardContent>
        </Card>
      )}

      {/* No allocation state */}
      {allocatedAmount === 0 && !hasPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <PlusCircle className="h-8 w-8" />
            <p className="font-medium text-foreground">No budget allocated yet</p>
            <p className="text-sm text-center max-w-sm">
              Request a budget allocation from the CEO. Once approved, you'll be able to log expenses against it.
            </p>
            <Button onClick={() => setShowForm(true)}>Request Budget</Button>
          </CardContent>
        </Card>
      )}

      {/* Pending requests */}
      {hasPending && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Budget Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/40">
                <div>
                  <p className="font-medium">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(req.requestedAmount ?? 0)}</p>
                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Awaiting CEO</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Request budget form */}
      {(showForm || (allocatedAmount > 0 && !hasPending)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {allocatedAmount > 0 ? "Request Additional Budget" : "Request Budget Allocation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Requested Amount ($) *</Label>
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
                <Label>Justification</Label>
                <Textarea
                  placeholder="Describe what this budget will be used for…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for CEO Approval
                </Button>
                {showForm && (
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {allocatedAmount > 0 && !showForm && !hasPending && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <PlusCircle className="mr-2 h-3.5 w-3.5" />
            Request More Budget
          </Button>
        </div>
      )}
    </div>
  );
}
