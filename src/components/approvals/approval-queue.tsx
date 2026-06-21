"use client";

import { useState } from "react";
import { ApprovalDecisionDialog } from "./approval-decision-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow as fdtn } from "date-fns";
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";

type AnyApproval = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  requestedAmount: number | null;
  createdAt: Date;
  department: { name: string };
  submitter: { name: string };
  decisions?: { status: string; decidedAt: Date; approvedAmount: number | null; reason: string | null; decider: { name: string } }[];
};

const TYPE_LABELS: Record<string, string> = {
  BUDGET_REQUEST: "Budget",
  HIRING_REQUEST: "Hiring",
  EXPENSE_APPROVAL: "Expense",
  CUSTOM: "Custom",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PARTIALLY_APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
};

interface ApprovalQueueProps {
  pending: AnyApproval[];
  resolved: AnyApproval[];
}

export function ApprovalQueue({ pending, resolved }: ApprovalQueueProps) {
  const [selectedApproval, setSelectedApproval] = useState<AnyApproval | null>(null);

  return (
    <>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <span className="ml-1.5 rounded-full bg-destructive text-destructive-foreground text-xs px-1.5">{pending.length}</span>
          </TabsTrigger>
          <TabsTrigger value="resolved">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <div className="rounded-lg border p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              No pending approvals — you&apos;re all caught up!
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((a) => (
                <div key={a.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{a.title}</p>
                        <Badge variant="outline" className="text-xs">{TYPE_LABELS[a.type]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {a.department.name} · {a.submitter.name} · {fdtn(a.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                    {a.requestedAmount && (
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(a.requestedAmount)}</p>
                        <p className="text-xs text-muted-foreground">requested</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
                  <Button size="sm" onClick={() => setSelectedApproval(a)}>
                    <ChevronRight className="mr-1 h-3 w-3" />
                    Make Decision
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <div className="space-y-2">
            {resolved.map((a) => {
              const lastDecision = a.decisions?.[a.decisions.length - 1];
              return (
                <div key={a.id} className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{a.title}</p>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status]}`}>{a.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {a.department.name} · {a.submitter.name}
                      </p>
                    </div>
                    {lastDecision?.approvedAmount && (
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-emerald-600">{formatCurrency(lastDecision.approvedAmount)}</p>
                        <p className="text-xs text-muted-foreground">approved</p>
                      </div>
                    )}
                  </div>
                  {lastDecision?.reason && (
                    <p className="text-xs text-muted-foreground">&ldquo;{lastDecision.reason}&rdquo; — {lastDecision.decider.name}</p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {selectedApproval && (
        <ApprovalDecisionDialog
          open={!!selectedApproval}
          onOpenChange={(open) => !open && setSelectedApproval(null)}
          approval={{
            id: selectedApproval.id,
            title: selectedApproval.title,
            requestedAmount: selectedApproval.requestedAmount,
            type: selectedApproval.type,
          }}
        />
      )}
    </>
  );
}
