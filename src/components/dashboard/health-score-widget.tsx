"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { HealthScore } from "@/types/dashboard.types";

interface HealthScoreWidgetProps {
  healthScore: HealthScore;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Healthy";
  if (score >= 50) return "At Risk";
  return "Critical";
}

export function HealthScoreWidget({ healthScore }: HealthScoreWidgetProps) {
  const { score, breakdown } = healthScore;
  const color = getScoreColor(score);

  const data = [{ name: "score", value: score, fill: color }];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={225}
            endAngle={-45}
            data={data}
            barSize={12}
          >
            <RadialBar dataKey="value" background={{ fill: "#f3f4f6" }} cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground mt-0.5">{getScoreLabel(score)}</span>
        </div>
      </div>

      <div className="w-full space-y-2 text-xs">
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-muted-foreground capitalize">{key.replace("_", " ")}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-muted rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${val}%`, backgroundColor: getScoreColor(val) }}
                />
              </div>
              <span className="font-medium w-8 text-right">{val}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
