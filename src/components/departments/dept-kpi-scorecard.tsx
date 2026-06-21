import { cn, formatNumber, formatCurrency, formatPercent } from "@/lib/utils";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import type { KpiResult } from "@/types/department.types";

interface DeptKpiScorecardProps {
  kpis: KpiResult[];
  className?: string;
}

const STATUS_COLORS = {
  green: "border-emerald-200 bg-emerald-50",
  orange: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
};

const VALUE_COLORS = {
  green: "text-emerald-700",
  orange: "text-amber-700",
  red: "text-red-700",
};

function formatValue(value: number, unit: string): string {
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percentage") return formatPercent(value);
  return formatNumber(value);
}

export function DeptKpiScorecard({ kpis, className }: DeptKpiScorecardProps) {
  if (kpis.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground py-8 text-sm", className)}>
        No metrics submitted yet. Submit today&apos;s data to see KPIs.
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3", className)}>
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          className={cn(
            "rounded-lg border p-3 space-y-1",
            STATUS_COLORS[kpi.status]
          )}
        >
          <p className="text-xs text-muted-foreground font-medium truncate">{kpi.label}</p>
          <p className={cn("text-xl font-bold", VALUE_COLORS[kpi.status])}>
            {formatValue(kpi.actual, kpi.unit)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Target: {formatValue(kpi.target, kpi.unit)}
            </span>
            <TrendIndicator trend={kpi.trend} value={kpi.trendValue} />
          </div>
          <div className="w-full bg-white/60 rounded-full h-1.5 mt-1">
            <div
              className={cn(
                "h-1.5 rounded-full",
                kpi.status === "green" ? "bg-emerald-500" : kpi.status === "orange" ? "bg-amber-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(kpi.achievement, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
