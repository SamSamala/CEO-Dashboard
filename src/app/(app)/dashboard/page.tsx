import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getExecutiveDashboardData, getFounderActionItems } from "@/server/queries/dashboard.queries";
import { HealthScoreWidget } from "@/components/dashboard/health-score-widget";
import { DeptHealthGrid } from "@/components/dashboard/dept-health-grid";
import { ActionCenter } from "@/components/dashboard/action-center";
import { BottleneckSummary } from "@/components/dashboard/bottleneck-summary";
import { PendingApprovalsWidget } from "@/components/dashboard/pending-approvals-widget";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import {
  DollarSign, Wallet, TrendingUp, Clock, Users, AlertTriangle, Flame
} from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "CEO") {
    redirect("/departments");
  }

  const companyId = session.user.companyId;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent companyId={companyId} />
    </Suspense>
  );
}

async function DashboardContent({ companyId }: { companyId: string }) {
  const [dashData, actionItems] = await Promise.all([
    getExecutiveDashboardData(companyId),
    getFounderActionItems(companyId),
  ]);

  const { healthScore, deptScorecards, pendingApprovals, activeAlerts, bottlenecks, employeeCount, finance } = dashData;

  const runway = finance.burnRate > 0
    ? Math.round((finance.cash / finance.burnRate) * 30)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CEO Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your company at a glance — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(finance.revenue)}
          status={finance.revenue > 0 ? "green" : "red"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Cash Balance"
          value={formatCurrency(finance.cash)}
          subLabel={runway ? `${runway} day runway` : undefined}
          status={runway && runway < 60 ? "red" : runway && runway < 90 ? "orange" : "green"}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="Monthly Burn"
          value={formatCurrency(finance.burnRate)}
          status="neutral"
          icon={<Flame className="h-4 w-4" />}
        />
        <StatCard
          label="Employees"
          value={formatNumber(employeeCount)}
          status="neutral"
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      {/* Main content: Health Score + Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthScoreWidget healthScore={healthScore} />
          </CardContent>
        </Card>

        {/* Founder Action Center */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Founder Action Center
              {actionItems.length > 0 && (
                <span className="ml-2 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                  {actionItems.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionCenter items={actionItems} />
          </CardContent>
        </Card>
      </div>

      {/* Department Health Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Department Performance</h2>
        <DeptHealthGrid scorecards={deptScorecards} />
      </div>

      {/* Bottlenecks + Approvals + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Active Bottlenecks
              {bottlenecks.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{bottlenecks.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BottleneckSummary bottlenecks={bottlenecks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Approvals
              {pendingApprovals.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{pendingApprovals.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingApprovalsWidget approvals={pendingApprovals as any} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              Active Alerts
              {activeAlerts.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">{activeAlerts.length}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAlerts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">No active alerts</p>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-3 text-sm">
                    <p className={`font-medium ${alert.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"}`}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
