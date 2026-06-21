import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Shield } from "lucide-react";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CEO") redirect("/dashboard");

  const companyId = session.user.companyId;

  const logs = await prisma.auditLog.findMany({
    where: { companyId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const ACTION_COLORS: Record<string, string> = {
    APPROVAL_SUBMITTED: "bg-blue-100 text-blue-700",
    APPROVAL_DECIDED: "bg-emerald-100 text-emerald-700",
    METRIC_CREATED: "bg-purple-100 text-purple-700",
    METRIC_DELETED: "bg-red-100 text-red-700",
    EXPENSE_CREATED: "bg-amber-100 text-amber-700",
    GOAL_CREATED: "bg-teal-100 text-teal-700",
    GOAL_UPDATED: "bg-teal-100 text-teal-700",
    GOAL_COMPLETED: "bg-emerald-100 text-emerald-700",
    HIRING_CREATED: "bg-indigo-100 text-indigo-700",
    DEPARTMENT_CREATED: "bg-violet-100 text-violet-700",
    TEMPLATE_APPLIED: "bg-violet-100 text-violet-700",
    SETTINGS_CHANGED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm">Every critical action recorded. Last 100 entries.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {logs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No audit events recorded yet.
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-medium">{log.user?.name ?? "Unknown"}</span>
                    <span className="text-muted-foreground"> · {log.entityType} </span>
                    {log.entityId && (
                      <span className="text-muted-foreground font-mono text-xs">{log.entityId.slice(-8)}</span>
                    )}
                    {log.reason && (
                      <span className="text-muted-foreground"> · &quot;{log.reason}&quot;</span>
                    )}
                  </div>
                  {(log.before || log.after) && (
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      {log.before && (
                        <span className="line-clamp-1">
                          Before: {JSON.stringify(log.before).slice(0, 80)}
                        </span>
                      )}
                      {log.after && (
                        <span className="line-clamp-1">
                          After: {JSON.stringify(log.after).slice(0, 80)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {format(log.createdAt, "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
