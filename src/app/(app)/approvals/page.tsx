import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApprovalQueue } from "@/components/approvals/approval-queue";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "CEO" && role !== "DEPT_HEAD")) redirect("/dashboard");

  const companyId = session.user.companyId;
  const deptFilter = role === "DEPT_HEAD" ? { departmentId: session.user.departmentId ?? "" } : {};

  const [pending, resolved] = await Promise.all([
    prisma.approval.findMany({
      where: { companyId, status: "PENDING", ...deptFilter },
      include: { department: true, submitter: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.approval.findMany({
      where: {
        companyId,
        status: { not: "PENDING" },
        ...deptFilter,
      },
      include: { department: true, submitter: { select: { name: true } }, decisions: { include: { decider: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        subtitle={`${pending.length} pending decision${pending.length !== 1 ? "s" : ""}`}
      />
      <ApprovalQueue pending={pending as any} resolved={resolved as any} />
    </div>
  );
}
