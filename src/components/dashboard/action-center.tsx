import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, TrendingDown, Clock, Target, Users, BarChart2, Activity } from "lucide-react";
import type { ActionItem } from "@/types/dashboard.types";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  PENDING_APPROVAL:   { icon: Clock,          label: "Approval",    color: "text-amber-500" },
  APPROVAL_ESCALATION:{ icon: Clock,          label: "Approval",    color: "text-red-500" },
  BOTTLENECK:         { icon: AlertTriangle,  label: "Bottleneck",  color: "text-red-500" },
  TEAM_RISK:          { icon: AlertTriangle,  label: "Team",        color: "text-orange-500" },
  RUNWAY:             { icon: TrendingDown,   label: "Cash",        color: "text-red-600" },
  BUDGET:             { icon: BarChart2,      label: "Budget",      color: "text-amber-500" },
  BUDGET_OVERRUN:     { icon: BarChart2,      label: "Budget",      color: "text-red-600" },
  HIRING:             { icon: Users,          label: "Hiring",      color: "text-blue-500" },
  HIRING_STALLED:     { icon: Users,          label: "Hiring",      color: "text-amber-500" },
  GOAL:               { icon: Target,         label: "Goals",       color: "text-purple-500" },
  GOAL_DEADLINE:      { icon: Target,         label: "Goal",        color: "text-red-500" },
  METRICS:            { icon: Activity,       label: "Metrics",     color: "text-muted-foreground" },
  DATA_MISSING:       { icon: Activity,       label: "Data",        color: "text-muted-foreground" },
};

const PRIORITY_BADGE = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH: "bg-amber-100 text-amber-700 border-amber-200",
  MEDIUM: "bg-blue-100 text-blue-700 border-blue-200",
  LOW: "bg-muted text-muted-foreground",
};

interface ActionCenterProps {
  items: ActionItem[];
}

export function ActionCenter({ items }: ActionCenterProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-6 text-center">
        <div className="text-emerald-600 font-medium">All clear — no critical actions needed right now</div>
        <p className="text-emerald-600/70 text-sm mt-1">Keep submitting daily metrics to stay ahead of issues.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG["METRICS"];
        const Icon = config.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-start gap-3 rounded-lg border bg-card p-3.5 hover:shadow-sm transition-shadow group"
          >
            <div className={cn("mt-0.5 shrink-0", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-medium text-sm">{item.title}</p>
                <Badge variant="outline" className={cn("text-xs h-5 shrink-0", PRIORITY_BADGE[item.priority])}>
                  {item.priority}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        );
      })}
    </div>
  );
}
