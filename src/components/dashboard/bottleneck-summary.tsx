import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import type { BottleneckResult } from "@/types/bottleneck.types";
import { AlertOctagon, AlertTriangle, ArrowRight } from "lucide-react";

interface BottleneckSummaryProps {
  bottlenecks: BottleneckResult[];
}

function fmtImpact(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

export function BottleneckSummary({ bottlenecks }: BottleneckSummaryProps) {
  if (bottlenecks.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No bottlenecks detected
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bottlenecks.map((b) => {
        const isCritical = b.severity === "CRITICAL";
        const barColor = isCritical ? "#ef4444" : "#f59e0b";

        return (
          <Link
            key={b.id}
            href="/bottlenecks"
            className="block rounded-lg border p-3 hover:shadow-sm transition-shadow hover:border-foreground/20"
          >
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {isCritical ? (
                <AlertOctagon className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span className="font-medium text-sm">{b.departmentName}</span>
              <Badge
                variant="outline"
                className={
                  isCritical
                    ? "text-red-600 border-red-200 bg-red-50"
                    : "text-amber-600 border-amber-200 bg-amber-50"
                }
              >
                {b.severity}
              </Badge>
              <TrendIndicator trend={b.trend} />
              {b.isPrimaryConstraint && (
                <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                  ★ Primary
                </span>
              )}
            </div>

            {/* KPI actual vs expected */}
            <p className="text-xs text-muted-foreground mb-2">
              {b.kpiKey.replace(/_/g, " ")}: {b.actualValue.toFixed(0)} / {b.expectedValue.toFixed(0)} expected
            </p>

            {/* Severity progress bar */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(b.severityScore, 100)}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {b.severityScore.toFixed(0)}/100
              </span>
              {b.estimatedRevenueImpact != null && b.estimatedRevenueImpact > 0 && (
                <span className="text-[10px] text-red-500 font-medium shrink-0">
                  ~{fmtImpact(b.estimatedRevenueImpact)} at risk
                </span>
              )}
            </div>

            {/* Investigation area */}
            {b.investigationArea && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {b.investigationArea}
              </p>
            )}
          </Link>
        );
      })}

      {/* Footer link to full analysis */}
      <Link
        href="/bottlenecks"
        className="flex items-center justify-end gap-1 text-xs text-primary hover:underline pt-1"
      >
        View full analysis
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
