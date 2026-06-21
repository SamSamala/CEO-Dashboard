import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { computeDeptScorecard, getMetricHistory } from "@/server/services/kpi.service";
import { getDeptConfig } from "@/config/departments.config";
import { DeptStatusBadge } from "@/components/departments/dept-status-badge";
import { DeptKpiScorecard } from "@/components/departments/dept-kpi-scorecard";
import { MetricInputForm } from "@/components/departments/metric-input-form";
import { DeptMetricChart } from "@/components/departments/dept-metric-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays } from "date-fns";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DepartmentPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const dept = await prisma.department.findFirst({
    where: { companyId: session.user.companyId, slug: slug.toLowerCase() },
  });
  if (!dept) notFound();

  // Employee access control: employees can only see their assigned department
  if (session.user.role === "EMPLOYEE" && session.user.departmentId !== dept.id) {
    redirect("/departments");
  }

  // Try to get config from template if available, or load KPIs from DB
  const config = getDeptConfig(dept.slug);
  const kpiConfigs = await prisma.kpiConfig.findMany({
    where: { departmentId: dept.id, companyId: session.user.companyId, isActive: true },
  });

  const kpiKeys = config?.kpis.map((k) => k.key) ?? kpiConfigs.map((k) => k.key);

  const recentBusinessDate = subDays(new Date(), 1);

  const [scorecard, recentEntries, history] = await Promise.all([
    computeDeptScorecard(dept.id, session.user.companyId).catch(() => null),
    prisma.metricEntry.findMany({
      where: {
        departmentId: dept.id,
        companyId: session.user.companyId,
        businessDate: new Date(format(recentBusinessDate, "yyyy-MM-dd")),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getMetricHistory(dept.id, session.user.companyId, 30, kpiKeys),
  ]);

  const canSubmit =
    session.user.role === "CEO" ||
    session.user.departmentId === dept.id ||
    session.user.role === "EMPLOYEE";

  const isEmployee = session.user.role === "EMPLOYEE";
  const todayEntry = recentEntries[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: dept.colorHex }} />
            <h1 className="text-2xl font-bold">{dept.name}</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Last updated:{" "}
            {todayEntry
              ? `Yesterday (${format(todayEntry.businessDate, "MMM d")})`
              : scorecard
              ? "Awaiting data"
              : "No data yet"}
          </p>
        </div>
        {scorecard && <DeptStatusBadge status={scorecard.status} />}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {!isEmployee && <TabsTrigger value="trends">Trends</TabsTrigger>}
          {canSubmit && <TabsTrigger value="submit">Submit Metrics</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {scorecard ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="text-3xl font-bold">{scorecard.performanceScore.toFixed(0)}%</div>
                  <div className="text-muted-foreground text-xs">Performance Score</div>
                </div>
                {!isEmployee && (
                  <>
                    <div className="border-l pl-4">
                      <div className="text-xl font-semibold">{scorecard.dataConfidenceScore}%</div>
                      <div className="text-muted-foreground text-xs">Data Confidence</div>
                    </div>
                    <div className="border-l pl-4">
                      <div className="text-xl font-semibold">{scorecard.riskScore.toFixed(0)}</div>
                      <div className="text-muted-foreground text-xs">Risk Score</div>
                    </div>
                  </>
                )}
              </div>
              <DeptKpiScorecard kpis={scorecard.kpis} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No metrics submitted yet. Go to &quot;Submit Metrics&quot; to record your data.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {!isEmployee && (
          <TabsContent value="trends" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {kpiConfigs.slice(0, 4).map((kpi) => (
                <Card key={kpi.key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{kpi.label} (30 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DeptMetricChart
                      data={history as any}
                      kpiKey={kpi.key}
                      targetValue={kpi.targetValue}
                      color={dept.colorHex}
                      chartType={kpi.aggregation === "last" ? "line" : "bar"}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        {canSubmit && (
          <TabsContent value="submit" className="mt-4">
            <MetricInputForm
              departmentId={dept.id}
              departmentSlug={dept.slug}
              kpiConfigs={kpiConfigs.map((k) => ({
                key: k.key,
                label: k.label,
                unit: k.unit,
                aggregation: k.aggregation,
                inputType: "number",
                description: undefined,
              }))}
              recentEntries={recentEntries.map((e) => ({
                id: e.id,
                businessDate: format(e.businessDate, "yyyy-MM-dd"),
                label: e.label,
                data: e.data as Record<string, number>,
              }))}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
