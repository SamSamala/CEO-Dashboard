import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertOctagon, AlertTriangle, Info, Bell } from "lucide-react";
import { format } from "date-fns";
import { AlertActions } from "@/components/alerts/alert-actions";

export const metadata = { title: "Alerts" };

const SEVERITY_CONFIG = {
  CRITICAL: { icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  WARNING: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  INFO: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
};

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/dashboard");

  const [active, resolved] = await Promise.all([
    prisma.alert.findMany({
      where: { companyId: session.user.companyId, status: { not: "RESOLVED" } },
      orderBy: [{ severity: "desc" }, { triggeredAt: "desc" }],
    }),
    prisma.alert.findMany({
      where: { companyId: session.user.companyId, status: "RESOLVED" },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        subtitle={`${active.filter(a => a.severity === "CRITICAL").length} critical · ${active.length} total active`}
      />

      {active.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Bell className="h-8 w-8 text-emerald-500" />
            <p>No active alerts — everything looks good!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {active.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity];
            const Icon = config.icon;
            return (
              <div key={alert.id} className={`rounded-lg border p-4 ${config.bg}`}>
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(alert.triggeredAt, "MMM d, h:mm a")}
                          {alert.status === "ACKNOWLEDGED" && " · Acknowledged"}
                        </p>
                      </div>
                      <Badge className={`shrink-0 text-xs ${config.color}`}>{alert.severity}</Badge>
                    </div>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <AlertActions alertId={alert.id} status={alert.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">Recently Resolved</h2>
          <div className="space-y-2">
            {resolved.map((alert) => (
              <div key={alert.id} className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{alert.title}</p>
                <p className="text-xs">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
