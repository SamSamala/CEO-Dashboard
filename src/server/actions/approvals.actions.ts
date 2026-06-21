"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const submitApprovalSchema = z.object({
  departmentId: z.string(),
  type: z.enum(["BUDGET_REQUEST", "HIRING_REQUEST", "EXPENSE_APPROVAL", "CUSTOM"]),
  title: z.string().min(1),
  description: z.string().min(1),
  requestedAmount: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  dueDate: z.string().optional(),
});

export const submitApproval = authActionClient
  .metadata({ actionName: "submitApproval" })
  .schema(submitApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "approvals:submit", ctx.customRolePermissions);

    // Validate amount is non-negative
    if (parsedInput.requestedAmount !== undefined && parsedInput.requestedAmount < 0) {
      throw new Error("Requested amount cannot be negative");
    }

    // Validate department belongs to this company
    const dept = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, companyId: ctx.companyId },
    });
    if (!dept) throw new Error("Department not found");

    const approval = await prisma.approval.create({
      data: {
        companyId: ctx.companyId,
        departmentId: parsedInput.departmentId,
        submittedBy: ctx.userId,
        type: parsedInput.type,
        title: parsedInput.title,
        description: parsedInput.description,
        requestedAmount: parsedInput.requestedAmount,
        metadata: parsedInput.metadata,
        dueDate: parsedInput.dueDate ? new Date(parsedInput.dueDate) : undefined,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "APPROVAL_SUBMITTED",
      entityType: "Approval",
      entityId: approval.id,
      after: { type: approval.type, title: approval.title, requestedAmount: approval.requestedAmount },
    });

    revalidatePath("/approvals");
    return { approvalId: approval.id };
  });

const decideApprovalSchema = z.object({
  approvalId: z.string(),
  decision: z.enum(["APPROVED", "PARTIALLY_APPROVED", "REJECTED"]),
  approvedAmount: z.number().optional(),
  reason: z.string().optional(),
});

export const decideApproval = authActionClient
  .metadata({ actionName: "decideApproval" })
  .schema(decideApprovalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const approval = await prisma.approval.findFirst({
      where: { id: parsedInput.approvalId, companyId: ctx.companyId },
      include: { department: true },
    });
    if (!approval) throw new Error("Approval not found");

    // Threshold-based routing: DEPT_HEAD can decide if requestedAmount <= company limit
    // CEO can decide all approvals
    if (ctx.role !== "CEO") {
      requirePermission(ctx.role, "approvals:decide:own_dept", ctx.customRolePermissions);

      // DEPT_HEAD can only decide approvals for their own department
      if (ctx.departmentId !== approval.departmentId) {
        throw new Error("Forbidden: you can only decide approvals for your own department");
      }

      // Check approval threshold
      if (approval.requestedAmount !== null && approval.requestedAmount !== undefined) {
        const company = await prisma.company.findUnique({
          where: { id: ctx.companyId },
          select: { deptHeadApprovalLimit: true },
        });
        const limit = company?.deptHeadApprovalLimit ?? 500;
        if (approval.requestedAmount > limit) {
          throw new Error(`Requests above $${limit} require CEO approval`);
        }
      }
    }

    // Validation: approvedAmount rules
    const finalAmount = parsedInput.approvedAmount;
    if (parsedInput.decision !== "REJECTED") {
      if (finalAmount !== undefined) {
        if (finalAmount < 0) {
          throw new Error("Approved amount cannot be negative");
        }
        if (finalAmount === 0) {
          throw new Error("Approved amount must be greater than zero when approving");
        }
        // Allow up to 10% over requested amount (for overhead/contingency)
        if (approval.requestedAmount && finalAmount > approval.requestedAmount * 1.1) {
          throw new Error("Approved amount cannot exceed requested amount by more than 10%");
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: { id: approval.id },
        data: {
          status: parsedInput.decision,
          approvedAmount: finalAmount ?? approval.requestedAmount,
        },
      });

      await tx.approvalDecision.create({
        data: {
          approvalId: approval.id,
          decidedBy: ctx.userId,
          status: parsedInput.decision,
          approvedAmount: finalAmount,
          reason: parsedInput.reason,
        },
      });

      // Auto-create budget allocation for approved budget requests
      if (
        parsedInput.decision !== "REJECTED" &&
        approval.type === "BUDGET_REQUEST" &&
        finalAmount
      ) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await tx.budgetAllocation.create({
          data: {
            companyId: ctx.companyId,
            departmentId: approval.departmentId,
            approvalId: approval.id,
            period,
            amount: finalAmount,
          },
        });
      }

      // Mark hiring request as approved
      if (parsedInput.decision !== "REJECTED" && approval.type === "HIRING_REQUEST") {
        await tx.hiringRequest.updateMany({
          where: { approvalId: approval.id },
          data: { status: "ACTIVE" },
        });
      }

      await (tx as any).auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "APPROVAL_DECIDED",
          entityType: "Approval",
          entityId: approval.id,
          before: { status: approval.status },
          after: { status: parsedInput.decision, approvedAmount: finalAmount },
          reason: parsedInput.reason,
        },
      });
    });

    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { success: true };
  });
