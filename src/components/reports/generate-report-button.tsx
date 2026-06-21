"use client";

import { useAction } from "next-safe-action/hooks";
import { generateReport } from "@/server/actions/reports.actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function GenerateReportButton() {
  const router = useRouter();
  const { execute, isPending } = useAction(generateReport, {
    onSuccess: (data) => {
      toast.success("Report generated");
      router.push(`/reports/${data.data?.periodKey}`);
    },
    onError: () => toast.error("Failed to generate report"),
  });

  return (
    <Button onClick={() => execute({ period: "MONTHLY" })} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
      Generate Monthly Report
    </Button>
  );
}
