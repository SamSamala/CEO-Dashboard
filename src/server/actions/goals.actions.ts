"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const createGoalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["COMPANY", "DEPARTMENT", "QUARTERLY", "ANNUAL"]),
  departmentId: z.string().optional(),
  targetValue: z.number().positive(),
  unit: z.string().default("percentage"),
  startDate: z.string(),
  dueDate: z.string(),
  parentGoalId: z.string().optional(),
});

export const createGoal = authActionClient
  .metadata({ actionName: "createGoal" })
  .schema(createGoalSchema)
  .action(async ({ parsedInput, ctx }) => {
    const goal = await prisma.goal.create({
      data: {
        companyId: ctx.companyId,
        ownerId: ctx.userId,
        title: parsedInput.title,
        description: parsedInput.description,
        type: parsedInput.type,
        departmentId: parsedInput.departmentId,
        targetValue: parsedInput.targetValue,
        currentValue: 0,
        unit: parsedInput.unit,
        startDate: new Date(parsedInput.startDate),
        dueDate: new Date(parsedInput.dueDate),
        parentGoalId: parsedInput.parentGoalId,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "GOAL_CREATED",
      entityType: "Goal",
      entityId: goal.id,
      after: { title: goal.title, type: goal.type, targetValue: goal.targetValue },
    });

    revalidatePath("/goals");
    return { goalId: goal.id };
  });

const updateGoalProgressSchema = z.object({
  goalId: z.string(),
  currentValue: z.number(),
});

export const updateGoalProgress = authActionClient
  .metadata({ actionName: "updateGoalProgress" })
  .schema(updateGoalProgressSchema)
  .action(async ({ parsedInput, ctx }) => {
    const goal = await prisma.goal.findFirst({
      where: { id: parsedInput.goalId, companyId: ctx.companyId },
    });
    if (!goal) throw new Error("Goal not found");

    const prevValue = goal.currentValue;
    const prevStatus = goal.status;

    const status =
      parsedInput.currentValue >= goal.targetValue
        ? "COMPLETED"
        : parsedInput.currentValue / goal.targetValue >= 0.9
        ? "ON_TRACK"
        : parsedInput.currentValue / goal.targetValue >= 0.6
        ? "AT_RISK"
        : "BEHIND";

    await prisma.goal.update({
      where: { id: goal.id },
      data: { currentValue: parsedInput.currentValue, status },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: status === "COMPLETED" ? "GOAL_COMPLETED" : "GOAL_UPDATED",
      entityType: "Goal",
      entityId: goal.id,
      before: { currentValue: prevValue, status: prevStatus },
      after: { currentValue: parsedInput.currentValue, status },
    });

    revalidatePath("/goals");
    return { success: true };
  });
