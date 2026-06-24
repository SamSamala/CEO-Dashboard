import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { computeDeptScorecard } from "@/server/services/kpi.service";
import { DeptStatusBadge } from "@/components/departments/dept-status-badge";
import { CreateDepartmentDialog } from "@/components/departments/create-department-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const departments = await prisma.department.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    orderBy: { name: "asc" },
  });

  const scorecards = await Promise.all(
    departments.map((d) =>
      computeDeptScorecard(d.id, session.user.companyId).catch(() => null)
    )
  );

  const isCeo = session.user.role === "CEO";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="All departments and their current performance"
        actions={isCeo ? <CreateDepartmentDialog /> : undefined}
      />

      {departments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p className="font-medium text-foreground">No departments yet</p>
            <p className="text-sm text-center max-w-sm">
              Create your first department to start tracking KPIs, hiring, and performance.
            </p>
            {isCeo && <CreateDepartmentDialog />}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, i) => {
          const scorecard = scorecards[i];
          const score = scorecard?.performanceScore ?? 0;
          const status = scorecard?.status ?? "red";

          return (
            <Link key={dept.id} href={`/departments/${dept.slug.toLowerCase()}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: dept.colorHex }}
                      />
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                    </div>
                    <DeptStatusBadge status={status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-medium">{score.toFixed(0)}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{scorecard?.kpis.length ?? 0} KPIs tracked</span>
                    <span className="flex items-center gap-1">
                      View details <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
