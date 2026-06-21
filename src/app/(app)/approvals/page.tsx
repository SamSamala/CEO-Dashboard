import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApprovalQueue } from "@/components/approvals/approval-queue";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/dashboard");

  const [pending, resolved] = await Promise.all([
    prisma.approval.findMany({
      where: { companyId: session.user.companyId, status: "PENDING" },
      include: { department: true, submitter: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.approval.findMany({
      where: {
        companyId: session.user.companyId,
        status: { not: "PENDING" },
      },
      include: { department: true, submitter: { select: { name: true } }, decisions: { include: { decider: { select: { name: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {pending.length} pending decision{pending.length !== 1 ? "s" : ""}
        </p>
      </div>
      <ApprovalQueue pending={pending as any} resolved={resolved as any} />
    </div>
  );
}
