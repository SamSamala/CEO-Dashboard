import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  Building2,
  Calendar,
  Users,
  TrendingDown,
  Bell,
  CheckCircle2,
} from "lucide-react";
import type { ExecPanel } from "@/types/diagnostic.types";

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground py-2 flex items-center gap-1">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      {text}
    </p>
  );
}

export function ExecutivePanel({ panel }: { panel: ExecPanel }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Top 3 Bottlenecks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-500" />
            Top Bottlenecks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {panel.topBottlenecks.length === 0 ? (
            <EmptyState text="No bottlenecks detected" />
          ) : (
            panel.topBottlenecks.map((b) => (
              <div key={b.departmentId} className="text-xs">
                <p className="font-medium">{b.bottleneckType}</p>
                <p className="text-muted-foreground">{b.departmentName} · {b.kpisBelow} KPI{b.kpisBelow !== 1 ? "s" : ""} below target</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top 3 Risks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Emerging Risks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {panel.topRisks.length === 0 ? (
            <EmptyState text="No emerging risks detected" />
          ) : (
            panel.topRisks.map((r) => (
              <div key={r.departmentId} className="text-xs">
                <p className="font-medium">{r.departmentName}</p>
                <p className="text-muted-foreground">
                  {r.triggerMetrics.filter((m) => m.trend === "WORSENING").length} KPI{r.triggerMetrics.filter((m) => m.trend === "WORSENING").length !== 1 ? "s" : ""} declining
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top 3 Opportunities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {panel.topOpportunities.length === 0 ? (
            <EmptyState text="No improving departments yet" />
          ) : (
            panel.topOpportunities.map((o) => (
              <div key={o.departmentId} className="text-xs">
                <p className="font-medium">{o.departmentName}</p>
                <p className="text-muted-foreground">
                  {o.triggerMetrics.filter((m) => m.trend === "IMPROVING").length} KPI{o.triggerMetrics.filter((m) => m.trend === "IMPROVING").length !== 1 ? "s" : ""} improving
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Departments Requiring Attention */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-500" />
            Needs Attention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {panel.deptsRequiringAttention.length === 0 ? (
            <EmptyState text="All departments on track" />
          ) : (
            panel.deptsRequiringAttention.map((d) => (
              <div key={d.departmentId} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${d.severity === "CRITICAL" ? "bg-red-500" : "bg-amber-500"}`}
                />
                <span>{d.departmentName}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Projects Behind Schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-400" />
            Projects Behind
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {panel.projectsBehindSchedule.length === 0 ? (
            <EmptyState text="No projects critically behind" />
          ) : (
            panel.projectsBehindSchedule.map((g) => (
              <div key={g.id} className="text-xs">
                <p className="font-medium truncate">{g.title}</p>
                <p className="text-muted-foreground">
                  {g.progressPct}% complete · {g.daysRemaining}d left
                  {g.departmentName && ` · ${g.departmentName}`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Teams At Capacity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            Teams at Capacity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {panel.teamsAtCapacity.length === 0 ? (
            <EmptyState text="No teams under pressure" />
          ) : (
            panel.teamsAtCapacity.map((t) => (
              <div key={t.departmentId} className="text-xs">
                <p className="font-medium">{t.departmentName}</p>
                <p className="text-muted-foreground">
                  {t.stressedKpisCount} of {t.totalKpis} KPIs stressed
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Declining KPIs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Declining KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {panel.decliningKpis.length === 0 ? (
            <EmptyState text="No KPIs in decline" />
          ) : (
            panel.decliningKpis.map((k, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium truncate">{k.kpiLabel}</p>
                <p className="text-muted-foreground">
                  {k.departmentName} · {k.changeFromPrior}% · {k.pctOfTarget}% of target
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-500" />
            Critical Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {panel.criticalAlerts.length === 0 ? (
            <EmptyState text="No critical alerts" />
          ) : (
            panel.criticalAlerts.map((a) => (
              <div key={a.id} className="text-xs">
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground line-clamp-1">{a.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
