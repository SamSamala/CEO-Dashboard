"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrentPeriodKey } from "@/lib/utils";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const upsertBudgetSchema = z.object({
  departmentId: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
  period: z.string().optional(),
});

export const upsertBudgetAllocation = authActionClient
  .metadata({ actionName: "upsertBudgetAllocation" })
  .schema(upsertBudgetSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.role !== "CEO") throw new Error("Only CEO can set budget allocations");

    const dept = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, companyId: ctx.companyId },
    });
    if (!dept) throw new Error("Department not found");

    const period = parsedInput.period ?? getCurrentPeriodKey("monthly");

    const existing = await prisma.budgetAllocation.findFirst({
      where: { companyId: ctx.companyId, departmentId: parsedInput.departmentId, period },
    });

    if (existing) {
      await prisma.budgetAllocation.update({
        where: { id: existing.id },
        data: { amount: parsedInput.amount, notes: parsedInput.notes },
      });
    } else {
      await prisma.budgetAllocation.create({
        data: {
          companyId: ctx.companyId,
          departmentId: parsedInput.departmentId,
          period,
          amount: parsedInput.amount,
          notes: parsedInput.notes,
        },
      });
    }

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "BUDGET_ALLOCATED",
      entityType: "BudgetAllocation",
      entityId: parsedInput.departmentId,
      after: { departmentId: parsedInput.departmentId, amount: parsedInput.amount, period },
    });

    revalidatePath("/budget");
    return { success: true };
  });
