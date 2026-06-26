import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface PageProps {
  params: Promise<{ period: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { period } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const report = await prisma.report.findFirst({
    where: { companyId: session.user.companyId, periodKey: period },
  });
  if (!report) notFound();

  const content = report.content as any;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{report.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generated {format(report.generatedAt, "MMMM d, yyyy 'at' h:mm a")}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Revenue", value: formatCurrency(content.summary.revenue) },
          { label: "Cash Balance", value: formatCurrency(content.summary.cash) },
          { label: "Burn Rate", value: formatCurrency(content.summary.burnRate) + "/mo" },
          { label: "Team Size", value: content.summary.headcount + " people" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Department Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {content.departments.map((d: any) => (
              <div key={d.slug} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground">
                    {d.status === "gray" ? "No data" : `${d.score.toFixed(0)}%`}
                  </span>
                </div>
                <Progress value={d.status === "gray" ? 0 : d.score} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader><CardTitle className="text-base">Budget Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold">{formatCurrency(content.summary.totalBudget)}</p>
              <p className="text-xs text-muted-foreground">Allocated</p>
            </div>
            <div>
              <p className="text-xl font-bold">{formatCurrency(content.summary.totalSpent)}</p>
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
            <div>
              <p className="text-xl font-bold">{content.summary.totalBudget > 0 ? ((content.summary.totalSpent / content.summary.totalBudget) * 100).toFixed(0) : 0}%</p>
              <p className="text-xs text-muted-foreground">Utilized</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader><CardTitle className="text-base">Goal Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {content.goals.map((g: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{g.title}</p>
                </div>
                <Badge className={g.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : g.status === "BEHIND" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                  {g.status}
                </Badge>
                <span className="text-sm text-muted-foreground w-12 text-right">{g.progress.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottlenecks */}
      {content.bottlenecks.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Active Bottlenecks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.bottlenecks.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{b.departmentName}</span>
                  <Badge className={b.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                    {b.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
