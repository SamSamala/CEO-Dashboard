"use client";

import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
] as const;

type Period = "7d" | "30d" | "90d";

interface PeriodSelectorProps {
  className?: string;
}

export function PeriodSelector({ className }: PeriodSelectorProps) {
  const [period, setPeriod] = useQueryState<Period>("period", {
    defaultValue: "30d",
    parse: (v) => (["7d", "30d", "90d"].includes(v) ? (v as Period) : "30d"),
  });

  return (
    <div className={cn("flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5", className)}>
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-3 text-xs font-medium",
            period === p.value && "bg-background shadow-sm"
          )}
          onClick={() => setPeriod(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
