"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { submitMetrics } from "@/server/actions/metrics.actions";
import { initDepartmentKpis } from "@/server/actions/setup.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, AlertCircle, BarChart2 } from "lucide-react";
import { format, subDays } from "date-fns";

interface KpiField {
  key: string;
  label: string;
  unit: string;
  aggregation: string;
  inputType?: string;
  description?: string;
}

interface RecentEntry {
  id: string;
  businessDate: string;
  label: string | null;
  data: Record<string, number>;
}

interface MetricInputFormProps {
  departmentId: string;
  departmentSlug: string;
  kpiConfigs: KpiField[];
  recentEntries?: RecentEntry[];
}

export function MetricInputForm({
  departmentId,
  departmentSlug,
  kpiConfigs,
  recentEntries = [],
}: MetricInputFormProps) {
  const router = useRouter();
  const { execute: initKpis, isPending: isInitPending } = useAction(initDepartmentKpis, {
    onSuccess: () => { toast.success("KPIs set up — refresh to start submitting"); router.refresh(); },
    onError: (err) => toast.error(err.error.serverError ?? "Failed"),
  });

  if (kpiConfigs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <BarChart2 className="h-8 w-8" />
          <p className="font-medium text-foreground">No KPIs configured</p>
          <p className="text-sm text-center max-w-sm">
            This department has no metrics to track yet. Click below to automatically set up default KPIs.
          </p>
          <Button onClick={() => initKpis({ departmentId })} disabled={isInitPending}>
            {isInitPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set up KPIs
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default business date to yesterday (data is usually submitted the next day)
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const [businessDate, setBusinessDate] = useState(yesterday);
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(kpiConfigs.map((kpi) => [kpi.key, ""]))
  );
  const [notes, setNotes] = useState("");

  const { execute, isPending } = useAction(submitMetrics, {
    onSuccess: () => {
      toast.success("Metrics submitted successfully");
      setValues(Object.fromEntries(kpiConfigs.map((kpi) => [kpi.key, ""])));
      setLabel("");
      setNotes("");
    },
    onError: (err) => toast.error(err.error.serverError ?? "Failed to submit metrics"),
  });

  // Check if entries already exist for the selected businessDate
  const existingForDate = recentEntries.filter((e) => e.businessDate === businessDate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, number> = {};
    for (const kpi of kpiConfigs) {
      const v = parseFloat(values[kpi.key] ?? "");
      if (!isNaN(v)) data[kpi.key] = v;
    }
    if (Object.keys(data).length === 0) {
      toast.error("Please enter at least one metric value");
      return;
    }
    execute({
      departmentId,
      businessDate,
      label: label.trim() || undefined,
      data,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submit Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Business Date + Label row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="businessDate">Business Date</Label>
              <p className="text-xs text-muted-foreground">The date this data applies to (not necessarily today)</p>
              <Input
                id="businessDate"
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="label">Label / Context <span className="text-muted-foreground">(optional)</span></Label>
              <p className="text-xs text-muted-foreground">e.g. &quot;Campaign A&quot;, &quot;Weekly rollup&quot;</p>
              <Input
                id="label"
                placeholder="e.g. Campaign A"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>

          {/* Warning if entries already exist for selected date */}
          {existingForDate.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {existingForDate.length} entry/entries already exist for this date
                {existingForDate[0].label && ` (e.g. "${existingForDate[0].label}")`}.
                Submitting will add a new entry — not overwrite existing data.
              </span>
            </div>
          )}

          {/* KPI inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kpiConfigs.map((kpi) => (
              <div key={kpi.key} className="space-y-1">
                <Label htmlFor={kpi.key} className="text-sm">
                  {kpi.label}
                  {kpi.unit === "currency" && <span className="ml-1 text-muted-foreground text-xs">($)</span>}
                  {kpi.unit === "percentage" && <span className="ml-1 text-muted-foreground text-xs">(%)</span>}
                </Label>
                {kpi.description && (
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                )}
                <Input
                  id={kpi.key}
                  type="number"
                  step={kpi.unit === "percentage" ? "0.01" : "1"}
                  placeholder="Enter value"
                  value={values[kpi.key] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [kpi.key]: e.target.value }))}
                  min={0}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              id="notes"
              placeholder="Any context about this data submission…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Submit Metrics
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
