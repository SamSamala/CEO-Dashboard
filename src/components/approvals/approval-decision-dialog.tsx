"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { decideApproval } from "@/server/actions/approvals.actions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface ApprovalDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: {
    id: string;
    title: string;
    requestedAmount: number | null;
    type: string;
  };
}

export function ApprovalDecisionDialog({ open, onOpenChange, approval }: ApprovalDecisionDialogProps) {
  const [decision, setDecision] = useState<"APPROVED" | "PARTIALLY_APPROVED" | "REJECTED" | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(approval.requestedAmount?.toString() ?? "");
  const [reason, setReason] = useState("");

  const { execute, isPending } = useAction(decideApproval, {
    onSuccess: () => {
      toast.success("Decision recorded");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to record decision"),
  });

  function handleSubmit() {
    if (!decision) return;
    execute({
      approvalId: approval.id,
      decision,
      approvedAmount: decision !== "REJECTED" ? parseFloat(approvedAmount) || undefined : undefined,
      reason: reason || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review: {approval.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {approval.requestedAmount && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Requested amount: </span>
              <span className="font-semibold">{formatCurrency(approval.requestedAmount)}</span>
            </div>
          )}

          {/* Decision buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"] as const).map((d) => (
              <Button
                key={d}
                variant={decision === d ? "default" : "outline"}
                size="sm"
                className={
                  d === "APPROVED" && decision === d ? "bg-emerald-600 hover:bg-emerald-700" :
                  d === "REJECTED" && decision === d ? "bg-red-600 hover:bg-red-700" : ""
                }
                onClick={() => setDecision(d)}
              >
                {d === "APPROVED" ? "Approve" : d === "PARTIALLY_APPROVED" ? "Partial" : "Reject"}
              </Button>
            ))}
          </div>

          {decision && decision !== "REJECTED" && approval.requestedAmount && (
            <div className="space-y-1">
              <Label>Approved Amount</Label>
              <Input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Reason / Notes (optional)</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add context for your decision…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!decision || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {decision === "APPROVED" ? (
              <><CheckCircle className="mr-2 h-4 w-4" /> Approve</>
            ) : decision === "REJECTED" ? (
              <><XCircle className="mr-2 h-4 w-4" /> Reject</>
            ) : "Submit Decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
