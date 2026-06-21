import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { DeptStatusBadge } from "@/components/departments/dept-status-badge";
import type { DeptHealthScore } from "@/types/dashboard.types";
import { AlertTriangle } from "lucide-react";

interface DeptHealthGridProps {
  scorecards: DeptHealthScore[];
}

export function DeptHealthGrid({ scorecards }: DeptHealthGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {scorecards.map((dept) => (
        <Link
          key={dept.departmentId}
          href={`/departments/${dept.departmentSlug.toLowerCase()}`}
          className="rounded-lg border bg-card hover:shadow-md transition-shadow p-4 space-y-3 block"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.colorHex }} />
              <span className="font-medium text-sm truncate">{dept.departmentName}</span>
            </div>
            <DeptStatusBadge status={dept.status} />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Performance</span>
              <span className="font-medium">{dept.performanceScore.toFixed(0)}%</span>
            </div>
            <Progress value={dept.performanceScore} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Budget</p>
              <p className={`font-medium ${dept.budgetUtilization != null && dept.budgetUtilization > 90 ? "text-red-500" : dept.budgetUtilization != null && dept.budgetUtilization > 75 ? "text-amber-500" : "text-foreground"}`}>
                {dept.budgetUtilization != null ? `${dept.budgetUtilization}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Goals</p>
              <p className="font-medium">{dept.goalCompletion}%</p>
            </div>
          </div>

          {dept.bottleneckCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {dept.bottleneckCount} bottleneck{dept.bottleneckCount > 1 ? "s" : ""}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
