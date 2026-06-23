"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computePeriodKey } from "@/lib/utils";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const logExpenseSchema = z.object({
  departmentId: z.string(),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  date: z.string(),
  vendorName: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export const logExpense = authActionClient
  .metadata({ actionName: "logExpense" })
  .schema(logExpenseSchema)
  .action(async ({ parsedInput, ctx }) => {
    const expenseDate = new Date(parsedInput.date);
    const period = computePeriodKey(expenseDate, "monthly");

    const dept = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, companyId: ctx.companyId },
    });
    if (!dept) throw new Error("Department not found");

    // Require an approved budget allocation for this dept/period
    const allocation = await prisma.budgetAllocation.findFirst({
      where: { companyId: ctx.companyId, departmentId: parsedInput.departmentId, period },
    });
    if (!allocation) {
      throw new Error(
        `No approved budget for ${dept.name} this period. ` +
        `A department head must submit a budget request via /budget that the CEO approves first.`
      );
    }

    // Block if this expense would exceed remaining budget
    const alreadySpent = await prisma.expense.aggregate({
      where: { companyId: ctx.companyId, departmentId: parsedInput.departmentId, period },
      _sum: { amount: true },
    });
    const remaining = allocation.amount - (alreadySpent._sum.amount ?? 0);
    if (parsedInput.amount > remaining) {
      throw new Error(
        `Expense of $${parsedInput.amount.toFixed(2)} exceeds remaining budget of $${remaining.toFixed(2)} for ${dept.name}.`
      );
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: ctx.companyId,
        departmentId: parsedInput.departmentId,
        submittedBy: ctx.userId,
        amount: parsedInput.amount,
        category: parsedInput.category,
        description: parsedInput.description,
        date: expenseDate,
        period,
        vendorName: parsedInput.vendorName,
        receiptUrl: parsedInput.receiptUrl,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      after: { departmentId: parsedInput.departmentId, amount: parsedInput.amount, category: parsedInput.category },
    });

    revalidatePath("/spending");
    revalidatePath("/budget");
    return { expenseId: expense.id };
  });
