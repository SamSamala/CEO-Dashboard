"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type KpiConfig = {
  id: string;
  key: string;
  label: string;
  unit: string;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  weight: number;
  department: { name: string; colorHex: string };
};

export function KpiSettingsClient({ configs }: { configs: KpiConfig[] }) {
  const [values, setValues] = useState<Record<string, Partial<KpiConfig>>>(
    Object.fromEntries(configs.map(c => [c.id, { targetValue: c.targetValue, warningThreshold: c.warningThreshold, criticalThreshold: c.criticalThreshold }]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function handleSave(id: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/kpis/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values[id]),
      });
      if (!res.ok) { toast.error("Failed to save"); return; }
      toast.success("KPI updated");
    } finally {
      setSaving(null);
    }
  }

  const grouped = configs.reduce((acc, c) => {
    const key = c.department.name;
    if (!acc[key]) acc[key] = { colorHex: c.department.colorHex, kpis: [] };
    acc[key].kpis.push(c);
    return acc;
  }, {} as Record<string, { colorHex: string; kpis: KpiConfig[] }>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([deptName, { colorHex, kpis }]) => (
        <Card key={deptName}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorHex }} />
              {deptName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="grid grid-cols-4 gap-2 items-center">
                  <p className="text-sm font-medium col-span-1">{kpi.label}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Target</p>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={values[kpi.id]?.targetValue ?? kpi.targetValue}
                      onChange={e => setValues(p => ({ ...p, [kpi.id]: { ...p[kpi.id], targetValue: parseFloat(e.target.value) } }))}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Warning %</p>
                    <Input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      className="h-7 text-xs"
                      value={values[kpi.id]?.warningThreshold ?? kpi.warningThreshold}
                      onChange={e => setValues(p => ({ ...p, [kpi.id]: { ...p[kpi.id], warningThreshold: parseFloat(e.target.value) } }))}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="h-7" disabled={saving === kpi.id} onClick={() => handleSave(kpi.id)}>
                    {saving === kpi.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
