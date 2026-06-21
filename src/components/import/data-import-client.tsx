"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import type { ColumnMapping, MappingTemplate } from "@/types/import.types";

interface Props {
  departments: { id: string; name: string; slug: string }[];
  templates: MappingTemplate[];
  recentJobs: { id: string; filename: string; status: string; rowsImported: number; rowsFailed: number; createdAt: Date }[];
  companyId: string;
}

export function DataImportClient({ departments, templates, recentJobs }: Props) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [deptId, setDeptId] = useState("");
  const [deptSlug, setDeptSlug] = useState("");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDate, setImportDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const text = await f.text();
    const res = await fetch("/api/import/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, filename: f.name, deptSlug }),
    });
    const data = await res.json();
    if (data.error) { toast.error(data.error); return; }
    setParsedData(data.parsed);
    setMappings(data.suggestions ?? data.parsed.headers.map((h: string) => ({ sourceColumn: h, targetKey: null })));
    setStep("map");
  }, [deptSlug]);

  async function handleImport() {
    if (!parsedData || !deptId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedData.rows, mappings, departmentId: deptId, date: importDate }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Imported ${data.imported} rows successfully`);
      setStep("done");
    } finally {
      setImporting(false);
    }
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h2 className="text-xl font-semibold">Import Complete!</h2>
          <p className="text-muted-foreground text-sm">Metrics have been imported and KPIs will update automatically.</p>
          <Button onClick={() => { setStep("upload"); setFile(null); setParsedData(null); }}>
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
            <div className="space-y-1">
              <Label>Import Date</Label>
              <input type="date" value={importDate} onChange={e => setImportDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
            </div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Upload CSV or Excel file</p>
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
              <p className="text-xs text-muted-foreground">Map each source column to a standard metric field</p>
              {mappings.map((m, i) => (
                <div key={m.sourceColumn} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium">{m.sourceColumn}</div>
                  <div className="text-muted-foreground">→</div>
                  <select
                    value={m.targetKey ?? ""}
                    onChange={e => setMappings(prev => prev.map((mm, idx) => idx === i ? { ...mm, targetKey: e.target.value || null } : mm))}
                    className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    <option value="">— Skip —</option>
                    {["campaign_spend","leads_generated","cost_per_lead","conversion_rate",
                      "calls_completed","leads_capacity","deals_closed","revenue_generated","pipeline_value",
                      "open_positions","interviews_conducted","offers_sent","new_hires",
                      "projects_delivered","avg_delivery_days","delayed_projects","team_utilization",
                      "cash_balance","monthly_expenses","monthly_revenue","burn_rate",
                      "features_shipped","bugs_closed","sprint_completion","nps_score",
                      "tickets_handled","csat_score","churn_count","renewals"
                    ].map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  {m.confidence && m.confidence > 0.7 && (
                    <Badge variant="secondary" className="text-xs shrink-0">auto</Badge>
                  )}
                </div>
              ))}
              <Button onClick={handleImport} disabled={importing || !mappings.some(m => m.targetKey)} className="mt-2">
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {parsedData.rows.length} Rows
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar: Recent jobs & templates */}
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
