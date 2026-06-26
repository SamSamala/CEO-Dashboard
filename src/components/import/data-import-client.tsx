"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, Download, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { ColumnMapping, MappingTemplate } from "@/types/import.types";

// Must match DATE_TARGET in import.service.ts
const DATE_TARGET = "__date__";

// Fallback metric keys when a department has no configured KPIs yet.
const FALLBACK_KEYS = [
  "campaign_spend", "leads_generated", "cost_per_lead", "conversion_rate",
  "calls_completed", "leads_capacity", "deals_closed", "revenue_generated", "pipeline_value",
  "open_positions", "interviews_conducted", "offers_sent", "new_hires",
  "projects_delivered", "avg_delivery_days", "delayed_projects", "team_utilization",
  "cash_balance", "monthly_expenses", "monthly_revenue", "burn_rate",
  "features_shipped", "bugs_closed", "sprint_completion", "nps_score",
  "tickets_handled", "csat_score", "churn_count", "renewals",
];

interface Props {
  departments: { id: string; name: string; slug: string }[];
  templates: MappingTemplate[];
  recentJobs: { id: string; filename: string; status: string; rowsImported: number; rowsFailed: number; createdAt: Date }[];
  deptKpis: Record<string, { key: string; label: string }[]>;
  companyId: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export function DataImportClient({ departments, recentJobs, deptKpis }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [deptId, setDeptId] = useState("");
  const [deptSlug, setDeptSlug] = useState("");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDate, setImportDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Real metric keys for the selected department (falls back to the full catalog).
  const metricKeys = useMemo(() => {
    const kpis = deptKpis[deptId];
    if (kpis && kpis.length > 0) return kpis.map((k) => k.key);
    return FALLBACK_KEYS;
  }, [deptKpis, deptId]);

  const dateColumn = mappings.find((m) => m.targetKey === DATE_TARGET)?.sourceColumn ?? null;
  const hasMetricMapping = mappings.some((m) => m.targetKey && m.targetKey !== DATE_TARGET);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const isExcel = /\.xlsx?$/i.test(f.name);
    const body: Record<string, string> = { filename: f.name, deptSlug };
    if (isExcel) {
      body.contentBase64 = arrayBufferToBase64(await f.arrayBuffer());
    } else {
      body.content = await f.text();
    }

    const res = await fetch("/api/import/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    setParsedData(data.parsed);
    setMappings(
      data.suggestions?.length
        ? data.suggestions
        : data.parsed.headers.map((h: string) => ({ sourceColumn: h, targetKey: null }))
    );
    setStep("map");
  }, [deptSlug]);

  async function handleImport() {
    if (!parsedData || !deptId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedData.rows,
          mappings,
          departmentId: deptId,
          date: importDate,
          filename: file?.name,
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Imported ${data.imported} row${data.imported === 1 ? "" : "s"} successfully`);
      setStep("done");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const keys = (deptKpis[deptId] ?? []).map((k) => k.key);
    const cols = keys.length > 0 ? keys : FALLBACK_KEYS.slice(0, 4);
    const headers = ["date", ...cols];
    // Two example rows so the per-row date format is obvious.
    const example1 = ["2026-01-01", ...cols.map(() => "0")];
    const example2 = ["2026-02-01", ...cols.map(() => "0")];
    const csv = [headers, example1, example2].map((r) => r.join(",")).join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deptSlug || "department"}_metrics_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h2 className="text-xl font-semibold">Import Complete!</h2>
          <p className="text-muted-foreground text-sm">Metrics have been imported and KPIs will update automatically.</p>
          <Button onClick={() => { setStep("upload"); setFile(null); setParsedData(null); setMappings([]); }}>
            Import Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Step 1: Upload */}
        <Card>
          <CardHeader><CardTitle className="text-base">Step 1: Select File & Department</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Department</Label>
              <Select onValueChange={v => {
                setDeptId(v as string);
                setDeptSlug(departments.find(d => d.id === v)?.slug ?? "");
              }}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id} label={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {deptId && (
              <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">Bulk time-series import</p>
                  Add a <code className="rounded bg-muted px-1">date</code> column (e.g. <code className="rounded bg-muted px-1">2026-01-01</code> or <code className="rounded bg-muted px-1">2026-01</code>)
                  and one row per day/week/month — load as many periods as you like in a single file.
                </div>
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={downloadTemplate}>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Template
                </Button>
              </div>
            )}

            <div className="space-y-1">
              <Label>Fallback Import Date</Label>
              <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
              <p className="text-[11px] text-muted-foreground">Used only for rows without a date column.</p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Upload CSV or Excel (.xlsx) file</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={!deptId}
                className="block mx-auto text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer disabled:opacity-50"
              />
            </div>
            {file && <p className="text-xs text-muted-foreground flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" />{file.name}</p>}
          </CardContent>
        </Card>

        {/* Step 2: Column Mapping */}
        {step !== "upload" && parsedData && (
          <Card>
            <CardHeader><CardTitle className="text-base">Step 2: Map Columns</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Map each column to a metric field. Map a column to <span className="font-medium">Date</span> to date each row individually.
                {!hasMetricMapping && (
                  <span className="ml-1 text-amber-600 font-medium">
                    Select at least one metric mapping below to enable import.
                  </span>
                )}
              </p>

              {dateColumn ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Dates read from “{dateColumn}” — {parsedData.rows.length} row{parsedData.rows.length === 1 ? "" : "s"} across the file.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  No date column mapped — all {parsedData.rows.length} row{parsedData.rows.length === 1 ? "" : "s"} will be dated {importDate}.
                </div>
              )}

              {mappings.map((m, i) => (
                <div key={m.sourceColumn} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium truncate">{m.sourceColumn}</div>
                  <div className="text-muted-foreground">→</div>
                  <select
                    value={m.targetKey ?? ""}
                    onChange={e => setMappings(prev => prev.map((mm, idx) => idx === i ? { ...mm, targetKey: e.target.value || null } : mm))}
                    className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="">— Skip —</option>
                    <option value={DATE_TARGET}>📅 Date (per-row)</option>
                    {metricKeys.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {m.targetKey === DATE_TARGET ? (
                    <Badge variant="secondary" className="text-xs shrink-0">date</Badge>
                  ) : m.confidence && m.confidence > 0.7 ? (
                    <Badge variant="secondary" className="text-xs shrink-0">auto</Badge>
                  ) : null}
                </div>
              ))}
              <Button onClick={handleImport} disabled={importing || !hasMetricMapping} className="mt-2">
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {parsedData.rows.length} Row{parsedData.rows.length === 1 ? "" : "s"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar: Recent jobs */}
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Imports</CardTitle></CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No imports yet</p>
            ) : (
              <div className="space-y-2">
                {recentJobs.map(job => (
                  <div key={job.id} className="text-xs space-y-0.5">
                    <p className="font-medium truncate">{job.filename}</p>
                    <p className="text-muted-foreground">
                      {job.rowsImported} rows · {format(job.createdAt, "MMM d")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
