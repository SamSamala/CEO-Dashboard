import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";

type ApprovalWithDept = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  requestedAmount: number | null;
  createdAt: Date;
  department: { name: string };
  submitter: { name: string };
};

interface PendingApprovalsWidgetProps {
  approvals: ApprovalWithDept[];
}

const TYPE_LABELS: Record<string, string> = {
  BUDGET_REQUEST: "Budget",
  HIRING_REQUEST: "Hiring",
  EXPENSE_APPROVAL: "Expense",
  CUSTOM: "Request",
};

export function PendingApprovalsWidget({ approvals }: PendingApprovalsWidgetProps) {
  if (approvals.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No pending approvals
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {approvals.map((approval) => (
        <Link
          key={approval.id}
          href={`/approvals/${approval.id}`}
          className="flex items-center gap-3 rounded-lg border p-3 hover:shadow-sm transition-shadow"
        >
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{approval.title}</p>
              <Badge variant="secondary" className="text-xs shrink-0">
                {TYPE_LABELS[approval.type]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {approval.department.name} ·{" "}
              {approval.requestedAmount ? formatCurrency(approval.requestedAmount) : ""} ·{" "}
              {formatDistanceToNow(approval.createdAt, { addSuffix: true })}
            </p>
          </div>
        </Link>
      ))}
      {approvals.length > 0 && (
        <Link href="/approvals" className="block text-xs text-center text-primary hover:underline pt-1">
          View all approvals
        </Link>
      )}
    </div>
  );
}
