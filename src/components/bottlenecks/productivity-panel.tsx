import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp } from "lucide-react";
import type { ProductivityMetrics } from "@/types/diagnostic.types";

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export function ProductivityPanel({ metrics }: { metrics: ProductivityMetrics }) {
  const stats = [
    {
      label: "Revenue per Employee",
      value: formatCurrency(metrics.revenuePerEmployee),
      sub: `${metrics.totalEmployees} employees · ${formatCurrency(metrics.totalRevenue)} total revenue`,
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "Profit per Employee",
      value: formatCurrency(metrics.profitPerEmployee),
      sub: `${formatCurrency(metrics.burnRate)} monthly burn rate`,
      icon: TrendingUp,
      color: metrics.profitPerEmployee >= 0 ? "text-emerald-500" : "text-red-500",
    },
    {
      label: "Total Headcount",
      value: metrics.totalEmployees.toString(),
      sub: "Active employees",
      icon: Users,
      color: "text-blue-500",
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3">Productivity Analysis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`mt-0.5 ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
