import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator } from "@/components/shared/trend-indicator";
import type { BottleneckResult } from "@/types/bottleneck.types";
import { AlertOctagon, AlertTriangle } from "lucide-react";

interface BottleneckSummaryProps {
  bottlenecks: BottleneckResult[];
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
        return (
          <Link
            key={b.id}
            href={`/departments/${b.departmentSlug.toLowerCase()}`}
            className="flex items-start gap-3 rounded-lg border p-3 hover:shadow-sm transition-shadow"
          >
            {isCritical ? (
              <AlertOctagon className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{b.departmentName}</span>
                <Badge variant="outline" className={isCritical ? "text-red-600 border-red-200 bg-red-50" : "text-amber-600 border-amber-200 bg-amber-50"}>
                  {b.severity}
                </Badge>
                <TrendIndicator trend={b.trend} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {b.kpiKey.replace(/_/g, " ")}: {b.actualValue.toFixed(0)} / {b.expectedValue.toFixed(0)} expected
              </p>
              {b.investigationArea && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.investigationArea}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{b.severityScore.toFixed(0)}/100</span>
          </Link>
        );
      })}
    </div>
  );
}
