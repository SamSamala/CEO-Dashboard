import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CEO-only: wipes all company data except the CEO User + Company record.
// After this call the CEO is redirected to onboarding on next /dashboard visit.
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const ceoUserId = session.user.id;

  await prisma.$transaction(async (tx) => {
    // Delete in FK-safe order
    await tx.auditLog.deleteMany({ where: { companyId } });
    await tx.message.deleteMany({ where: { companyId } });
    await tx.employeeOfMonth.deleteMany({ where: { companyId } });
    await tx.candidateStageHistory.deleteMany({
      where: { candidate: { hiringRequest: { companyId } } },
    });
    await tx.candidate.deleteMany({
      where: { hiringRequest: { companyId } },
    });
    await tx.hiringRequest.deleteMany({ where: { companyId } });
    await tx.alert.deleteMany({ where: { companyId } });
    await tx.alertRule.deleteMany({ where: { companyId } });
    await tx.bottleneck.deleteMany({ where: { companyId } });
    await tx.metricEntry.deleteMany({ where: { companyId } });
    await tx.kpiConfig.deleteMany({ where: { companyId } });
    await tx.goal.deleteMany({ where: { companyId } });
    await tx.report.deleteMany({ where: { companyId } });
    await tx.importJob.deleteMany({ where: { companyId } });
    await tx.importMappingTemplate.deleteMany({ where: { companyId } });
    await tx.expense.deleteMany({ where: { companyId } });
    await tx.budgetAllocation.deleteMany({ where: { companyId } });
    await tx.approvalDecision.deleteMany({
      where: { approval: { companyId } },
    });
    await tx.approval.deleteMany({ where: { companyId } });
    await tx.team.deleteMany({ where: { companyId } });
    await tx.employee.deleteMany({ where: { companyId } });
    await tx.department.deleteMany({ where: { companyId } });
    await tx.departmentRelationship.deleteMany({ where: { companyId } });
    await tx.customRole.deleteMany({ where: { companyId } });

    // Delete all users except the CEO
    await tx.user.deleteMany({
      where: { companyId, id: { not: ceoUserId } },
    });

    // Reset CEO's own state
    await tx.user.update({
      where: { id: ceoUserId },
      data: { teamId: null, departmentId: null },
    });

    // Reset company to pre-onboarding state
    await tx.company.update({
      where: { id: companyId },
      data: { onboardingCompleted: false },
    });
  });

  return NextResponse.json({ ok: true });
}
