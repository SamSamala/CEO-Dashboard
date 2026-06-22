"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit.helper";

const createHiringRequestSchema = z.object({
  departmentId: z.string(),
  jobTitle: z.string().min(1),
  reason: z.string().min(1),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  jobDescription: z.string().optional(),
  targetStartDate: z.string().optional(),
});

export const createHiringRequest = authActionClient
  .metadata({ actionName: "createHiringRequest" })
  .schema(createHiringRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const approval = await prisma.approval.create({
      data: {
        companyId: ctx.companyId,
        departmentId: parsedInput.departmentId,
        submittedBy: ctx.userId,
        type: "HIRING_REQUEST",
        title: `Hire: ${parsedInput.jobTitle}`,
        description: parsedInput.reason,
        metadata: {
          priority: parsedInput.priority,
          salaryMin: parsedInput.salaryMin,
          salaryMax: parsedInput.salaryMax,
        },
      },
    });

    const hiringRequest = await prisma.hiringRequest.create({
      data: {
        companyId: ctx.companyId,
        departmentId: parsedInput.departmentId,
        approvalId: approval.id,
        jobTitle: parsedInput.jobTitle,
        reason: parsedInput.reason,
        priority: parsedInput.priority,
        salaryMin: parsedInput.salaryMin,
        salaryMax: parsedInput.salaryMax,
        jobDescription: parsedInput.jobDescription,
        targetStartDate: parsedInput.targetStartDate ? new Date(parsedInput.targetStartDate) : undefined,
        status: "PENDING_APPROVAL",
      },
    });

    revalidatePath("/hiring");
    revalidatePath("/approvals");
    return { hiringRequestId: hiringRequest.id };
  });

const advanceCandidateSchema = z.object({
  candidateId: z.string(),
  toStage: z.enum(["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]),
  notes: z.string().optional(),
  offerAmount: z.number().optional(),
});

export const advanceCandidate = authActionClient
  .metadata({ actionName: "advanceCandidate" })
  .schema(advanceCandidateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const candidate = await prisma.candidate.findFirst({
      where: { id: parsedInput.candidateId },
      include: { hiringRequest: true },
    });
    if (!candidate || candidate.hiringRequest.companyId !== ctx.companyId) {
      throw new Error("Candidate not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.candidateStageHistory.create({
        data: {
          candidateId: candidate.id,
          fromStage: candidate.currentStage,
          toStage: parsedInput.toStage,
          changedBy: ctx.userId,
          notes: parsedInput.notes,
        },
      });

      await tx.candidate.update({
        where: { id: candidate.id },
        data: {
          currentStage: parsedInput.toStage,
          offerAmount: parsedInput.offerAmount ?? candidate.offerAmount,
        },
      });

      // Auto-create employee + user account when hired
      if (parsedInput.toStage === "HIRED") {
        const employee = await tx.employee.create({
          data: {
            companyId: ctx.companyId,
            departmentId: candidate.hiringRequest.departmentId,
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email ?? "",
            jobTitle: candidate.hiringRequest.jobTitle,
            startDate: new Date(),
            salary: candidate.offerAmount,
            employmentStatus: "ACTIVE",
          },
        });

        // Create user account if the candidate has an email and no account exists yet
        if (candidate.email) {
          const emailLower = candidate.email.toLowerCase();
          const existing = await tx.user.findFirst({
            where: { companyId: ctx.companyId, email: emailLower },
            select: { id: true },
          });

          if (existing) {
            // Link existing user to the new employee record
            await tx.employee.update({ where: { id: employee.id }, data: { userId: existing.id } });
          } else {
            // Default password = part of email before '@'
            const defaultPassword = emailLower.split("@")[0];
            const hash = await bcrypt.hash(defaultPassword, 12);

            // Generate sequential employee ID (EMP-001 etc.)
            const empCount = await tx.user.count({ where: { companyId: ctx.companyId, employeeId: { not: null } } });
            const employeeId = `EMP-${String(empCount + 1).padStart(3, "0")}`;

            const user = await tx.user.create({
              data: {
                companyId: ctx.companyId,
                name: `${candidate.firstName} ${candidate.lastName}`,
                email: emailLower,
                password: hash,
                role: "EMPLOYEE",
                departmentId: candidate.hiringRequest.departmentId,
                employeeId,
                mustChangePassword: true,
              },
            });

            await tx.employee.update({ where: { id: employee.id }, data: { userId: user.id } });

            await logAudit(tx as any, {
              companyId: ctx.companyId,
              userId: ctx.userId,
              action: "EMPLOYEE_HIRED",
              entityType: "User",
              entityId: user.id,
              after: { name: user.name, email: user.email, employeeId },
            });
          }
        }

        await tx.hiringRequest.update({
          where: { id: candidate.hiringRequestId },
          data: { status: "FILLED" },
        });
      }
    });

    revalidatePath(`/hiring/${candidate.hiringRequestId}`);
    revalidatePath("/employees");
    revalidatePath("/dashboard");
    return { success: true };
  });

const addCandidateSchema = z.object({
  hiringRequestId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  resumeUrl: z.string().optional(),
  salaryExpectation: z.number().optional(),
});

export const addCandidate = authActionClient
  .metadata({ actionName: "addCandidate" })
  .schema(addCandidateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const hiringRequest = await prisma.hiringRequest.findFirst({
      where: { id: parsedInput.hiringRequestId, companyId: ctx.companyId },
    });
    if (!hiringRequest) throw new Error("Hiring request not found");

    const candidate = await prisma.candidate.create({
      data: {
        hiringRequestId: parsedInput.hiringRequestId,
        firstName: parsedInput.firstName,
        lastName: parsedInput.lastName,
        email: parsedInput.email,
        phone: parsedInput.phone,
        source: parsedInput.source,
        resumeUrl: parsedInput.resumeUrl,
        salaryExpectation: parsedInput.salaryExpectation,
        currentStage: "APPLIED",
      },
    });

    revalidatePath(`/hiring/${parsedInput.hiringRequestId}`);
    return { candidateId: candidate.id };
  });
