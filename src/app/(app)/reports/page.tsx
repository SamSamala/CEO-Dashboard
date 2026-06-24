import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GenerateReportButton } from "@/components/reports/generate-report-button";
import Link from "next/link";
import { FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const reports = await prisma.report.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { generatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Auto-generated business summaries"
        actions={<GenerateReportButton />}
      />

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>No reports generated yet — click &quot;Generate Report&quot; to create your first one</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/reports/${report.periodKey}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{report.period}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(report.generatedAt, "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
