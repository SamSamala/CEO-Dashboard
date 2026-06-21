import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, AlertTriangle, TrendingDown, TrendingUp, Minus, Building2 } from "lucide-react";
import type { DepartmentDiagnostic, TriggerMetric } from "@/types/diagnostic.types";

const SEVERITY_CONFIG = {
  CRITICAL: { label: "CRITICAL", icon: AlertOctagon, badgeClass: "bg-red-100 text-red-700 border-red-200", borderClass: "border-l-red-500" },
  WARNING: { label: "WARNING", icon: AlertTriangle, badgeClass: "bg-amber-100 text-amber-700 border-amber-200", borderClass: "border-l-amber-500" },
  NONE: { label: "ON TRACK", icon: null, badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200", borderClass: "border-l-emerald-500" },
};

function TrendIcon({ trend }: { trend: TriggerMetric["trend"] }) {
  if (trend === "WORSENING") return <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  if (trend === "IMPROVING") return <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function formatValue(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val % 1 === 0 ? val.toString() : val.toFixed(1);
}

export function BottleneckDetailCard({ diagnostic }: { diagnostic: DepartmentDiagnostic }) {
  const cfg = SEVERITY_CONFIG[diagnostic.severity];
  const SeverityIcon = cfg.icon;

  const triggerOnly = diagnostic.triggerMetrics.filter((m) => m.pctOfTarget < 75);
  const earlyWarning = diagnostic.triggerMetrics.filter((m) => m.pctOfTarget >= 75 && m.trend === "WORSENING");

  return (
    <Card className={`border-l-4 ${cfg.borderClass}`}>
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {SeverityIcon && <SeverityIcon className="h-4 w-4 shrink-0 text-current opacity-70" />}
              <h3 className="font-semibold text-sm">{diagnostic.bottleneckType}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {diagnostic.departmentName}
            </p>
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${cfg.badgeClass}`}>
            {cfg.label}
          </Badge>
        </div>

        {/* Trigger Metrics */}
        {triggerOnly.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Trigger Metrics
            </p>
            <div className="space-y-1.5">
              {triggerOnly.map((m) => (
                <div key={m.kpiKey} className="flex items-center gap-2 text-xs">
                  <TrendIcon trend={m.trend} />
                  <span className="font-medium min-w-0 flex-1 truncate">{m.kpiLabel}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatValue(m.actual)}
                    <span className="mx-1 opacity-50">/</span>
                    {formatValue(m.target)}
                  </span>
                  <span className={`shrink-0 font-medium ${m.changeFromPrior < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {m.changeFromPrior > 0 ? "+" : ""}{m.changeFromPrior}%
                  </span>
                  <span className="text-muted-foreground shrink-0">{m.pctOfTarget}% of target</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Early Warning KPIs */}
        {earlyWarning.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Declining (Early Warning)
            </p>
            <div className="space-y-1.5">
              {earlyWarning.map((m) => (
                <div key={m.kpiKey} className="flex items-center gap-2 text-xs">
                  <TrendingDown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium min-w-0 flex-1 truncate">{m.kpiLabel}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatValue(m.actual)}
                    <span className="mx-1 opacity-50">/</span>
                    {formatValue(m.target)}
                  </span>
                  <span className="text-amber-600 shrink-0 font-medium">{m.changeFromPrior}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Triggered */}
        {diagnostic.severity !== "NONE" && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <span className="font-medium text-foreground">Why triggered: </span>
            {diagnostic.kpisBelow} of {diagnostic.totalKpis} KPI{diagnostic.totalKpis !== 1 ? "s" : ""} below performance target
          </div>
        )}

        {/* Affected Departments */}
        {diagnostic.affectedDownstreamSlugs.length > 0 && diagnostic.severity !== "NONE" && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Affected Departments
            </p>
            <div className="flex flex-wrap gap-1">
              {diagnostic.affectedDownstreamSlugs.map((slug) => (
                <span key={slug} className="text-xs bg-muted rounded px-2 py-0.5 capitalize">
                  {slug.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Business Impact + Investigation */}
        {diagnostic.severity !== "NONE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Business Impact
              </p>
              <p className="text-xs">{diagnostic.businessImpact}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Investigate
              </p>
              <p className="text-xs">{diagnostic.investigationArea}</p>
            </div>
          </div>
        )}

        {/* On Track State */}
        {diagnostic.severity === "NONE" && diagnostic.triggerMetrics.length === 0 && (
          <p className="text-xs text-emerald-600">All KPIs on track. No bottleneck detected.</p>
        )}
      </CardContent>
    </Card>
  );
}
