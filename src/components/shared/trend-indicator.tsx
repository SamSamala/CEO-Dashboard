import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  trend: "up" | "down" | "flat" | "IMPROVING" | "WORSENING" | "STABLE";
  value?: string;
  className?: string;
  invertColors?: boolean;
}

export function TrendIndicator({ trend, value, className, invertColors = false }: TrendIndicatorProps) {
  const normalized =
    trend === "IMPROVING" ? "up" : trend === "WORSENING" ? "down" : trend === "STABLE" ? "flat" : trend;

  const config = {
    up: {
      icon: TrendingUp,
      color: invertColors ? "text-red-500" : "text-emerald-600",
      label: "up",
    },
    down: {
      icon: TrendingDown,
      color: invertColors ? "text-emerald-600" : "text-red-500",
      label: "down",
    },
    flat: {
      icon: Minus,
      color: "text-muted-foreground",
      label: "stable",
    },
  }[normalized];

  const Icon = config.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", config.color, className)}>
      <Icon className="h-3 w-3" />
      {value && <span>{value}</span>}
    </span>
  );
}
