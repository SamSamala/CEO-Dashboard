import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { computeBottleneckDiagnostics } from "@/server/services/bottleneck-diagnostic.service";
import { ExecutivePanel } from "@/components/bottlenecks/executive-panel";
import { BottleneckDetailCard } from "@/components/bottlenecks/bottleneck-detail-card";
import { ProductivityPanel } from "@/components/bottlenecks/productivity-panel";
import { Gauge, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Bottleneck Center" };

export default async function BottleneckCenterPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { companyId, role, departmentId } = session.user;

  // CEO sees all departments; others see their own department only
  const scopedDeptId = role === "CEO" ? undefined : (departmentId ?? undefined);

  const result = await computeBottleneckDiagnostics(companyId, scopedDeptId);

  const isCeo = role === "CEO";
  const activeBottlenecks = result.departmentDiagnostics.filter(
    (d) => d.severity !== "NONE"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            {isCeo ? "Bottleneck Center" : "Department Bottleneck Status"}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {isCeo
            ? `${activeBottlenecks.length} active bottleneck${activeBottlenecks.length !== 1 ? "s" : ""} detected across ${result.departmentDiagnostics.length} department${result.departmentDiagnostics.length !== 1 ? "s" : ""} · Deterministic rule-based analysis`
            : "Rule-based analysis of your department's KPI performance and constraints"}
        </p>
      </div>

      {/* Executive Panel — CEO only */}
      {isCeo && result.execPanel && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Executive Diagnostic Panel</h2>
          <ExecutivePanel panel={result.execPanel} />
        </div>
      )}

      {/* Department Bottleneck Cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          {isCeo ? "Department Analysis" : "Your Department"}
        </h2>

        {result.departmentDiagnostics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p>No departments with configured KPIs found. Add KPIs in Settings to enable analysis.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active bottlenecks first */}
            {result.departmentDiagnostics
              .slice()
              .sort((a, b) => {
                const order = { CRITICAL: 0, WARNING: 1, NONE: 2 };
                return order[a.severity] - order[b.severity];
              })
              .map((diagnostic) => (
                <BottleneckDetailCard key={diagnostic.departmentId} diagnostic={diagnostic} />
              ))}
          </div>
        )}
      </div>

      {/* Productivity Panel — CEO only */}
      {isCeo && <ProductivityPanel metrics={result.productivityMetrics} />}
    </div>
  );
}
