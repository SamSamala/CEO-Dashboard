import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import CandidatesPage from "./candidates/page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HiringDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const request = await prisma.hiringRequest.findFirst({
    where: { id, companyId: session.user.companyId },
    include: {
      department: true,
      _count: { select: { candidates: true } },
    },
  });
  if (!request) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{request.jobTitle}</h1>
          <Badge>{request.status.replace("_", " ")}</Badge>
          <Badge variant="outline">{request.priority}</Badge>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {request.department.name} · Created {format(request.createdAt, "MMM d, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Department", value: request.department.name },
          { label: "Priority", value: request.priority },
          { label: "Salary Range", value: request.salaryMin ? `${formatCurrency(request.salaryMin)} – ${formatCurrency(request.salaryMax ?? 0)}` : "Not set" },
          { label: "Target Start", value: request.targetStartDate ? format(request.targetStartDate, "MMM d, yyyy") : "Flexible" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-medium text-sm mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Reason for Hire</CardTitle></CardHeader>
        <CardContent><p className="text-sm">{request.reason}</p></CardContent>
      </Card>

      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">Candidates ({request._count.candidates})</TabsTrigger>
        </TabsList>
        <TabsContent value="candidates" className="mt-4">
          <CandidatesPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
