import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export const metadata = { title: "Hiring" };

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  FILLED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-muted text-muted-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-600",
  HIGH: "text-amber-600",
  MEDIUM: "text-blue-600",
  LOW: "text-muted-foreground",
};

export default async function HiringPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const where =
    session.user.role === "CEO"
      ? { companyId: session.user.companyId }
      : { companyId: session.user.companyId, departmentId: session.user.departmentId ?? "" };

  const requests = await prisma.hiringRequest.findMany({
    where,
    include: {
      department: { select: { name: true, colorHex: true } },
      _count: { select: { candidates: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  type HiringRow = (typeof requests)[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hiring</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {requests.filter((r: HiringRow) => r.status === "ACTIVE").length} active positions
          </p>
        </div>
        <Link href="/hiring/new" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors">
          <Plus className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p>No hiring requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((r: HiringRow) => (
            <Link key={r.id} href={`/hiring/${r.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{r.jobTitle}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[r.status]}`}>{r.status.replace("_", " ")}</Badge>
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full inline-block"
                          style={{ backgroundColor: r.department.colorHex }}
                        />
                        <span className="text-xs text-muted-foreground">{r.department.name}</span>
                        {r.salaryMin && r.salaryMax && (
                          <span className="text-xs text-muted-foreground">
                            · ${r.salaryMin.toLocaleString()}–${r.salaryMax.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{r._count.candidates} candidates</p>
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
