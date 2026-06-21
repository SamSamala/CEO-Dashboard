"use client";

import { useAction } from "next-safe-action/hooks";
import { acknowledgeAlert, resolveAlert } from "@/server/actions/alerts.actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AlertActionsProps {
  alertId: string;
  status: string;
}

export function AlertActions({ alertId, status }: AlertActionsProps) {
  const { execute: ack, isPending: acking } = useAction(acknowledgeAlert, {
    onSuccess: () => toast.success("Alert acknowledged"),
    onError: () => toast.error("Failed"),
  });
  const { execute: resolve, isPending: resolving } = useAction(resolveAlert, {
    onSuccess: () => toast.success("Alert resolved"),
    onError: () => toast.error("Failed"),
  });

  return (
    <div className="flex gap-2 mt-2">
      {status === "ACTIVE" && (
        <Button variant="outline" size="sm" disabled={acking} onClick={() => ack({ alertId })}>
          Acknowledge
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={resolving} onClick={() => resolve({ alertId })}>
        Resolve
      </Button>
    </div>
  );
}
