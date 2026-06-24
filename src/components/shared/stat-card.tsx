import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  status?: "green" | "orange" | "red" | "neutral";
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const STATUS_COLORS = {
  green: "text-emerald-600",
  orange: "text-amber-500",
  red: "text-red-500",
  neutral: "text-muted-foreground",
};

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: "text-emerald-600" },
  down: { icon: TrendingDown, color: "text-red-500" },
  flat: { icon: Minus, color: "text-muted-foreground" },
};

export function StatCard({
  label,
  value,
  subLabel,
  trend,
  trendValue,
  status = "neutral",
  icon,
  className,
  onClick,
}: StatCardProps) {
  const TrendIcon = trend ? TREND_CONFIG[trend].icon : null;
  const trendColor = trend ? TREND_CONFIG[trend].color : "";

  return (
    <Card
      className={cn("transition-shadow hover:shadow-sm", onClick && "cursor-pointer hover:shadow-md", className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <p className={cn("mt-2 text-2xl font-bold tracking-tight", STATUS_COLORS[status])}>
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
          {trend && TrendIcon && trendValue && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
