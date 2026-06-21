"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const createKpiSchema = z.object({
  departmentId: z.string(),
  key: z.string().min(1).regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, or underscores"),
  label: z.string().min(1),
  unit: z.string().default("count"),
  targetValue: z.number().nonnegative(),
  warningThreshold: z.number().min(0).max(1).default(0.75),
  criticalThreshold: z.number().min(0).max(1).default(0.5),
  weight: z.number().positive().default(1),
  aggregation: z.enum(["sum", "avg", "last"]).default("sum"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
  isBottleneckKpi: z.boolean().default(false),
});

export const createKpi = authActionClient
  .metadata({ actionName: "createKpi" })
  .schema(createKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "kpis:manage");

    const dept = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, companyId: ctx.companyId },
    });
    if (!dept) throw new Error("Department not found");

    const existing = await prisma.kpiConfig.findFirst({
      where: { companyId: ctx.companyId, departmentId: parsedInput.departmentId, key: parsedInput.key },
    });
    if (existing) throw new Error(`KPI with key "${parsedInput.key}" already exists in this department`);

    const kpi = await prisma.kpiConfig.create({
      data: {
        companyId: ctx.companyId,
        departmentId: parsedInput.departmentId,
        key: parsedInput.key,
        label: parsedInput.label,
        unit: parsedInput.unit,
        targetValue: parsedInput.targetValue,
        warningThreshold: parsedInput.warningThreshold,
        criticalThreshold: parsedInput.criticalThreshold,
        weight: parsedInput.weight,
        aggregation: parsedInput.aggregation,
        frequency: parsedInput.frequency,
        isBottleneckKpi: parsedInput.isBottleneckKpi,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "KPI_CREATED",
      entityType: "KpiConfig",
      entityId: kpi.id,
      after: { key: kpi.key, label: kpi.label, departmentId: kpi.departmentId },
    });

    revalidatePath("/settings/kpis");
    return { kpiId: kpi.id };
  });

const updateKpiSchema = z.object({
  kpiId: z.string(),
  label: z.string().min(1).optional(),
  unit: z.string().optional(),
  targetValue: z.number().nonnegative().optional(),
  warningThreshold: z.number().min(0).max(1).optional(),
  criticalThreshold: z.number().min(0).max(1).optional(),
  weight: z.number().positive().optional(),
  aggregation: z.enum(["sum", "avg", "last"]).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
  isBottleneckKpi: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateKpi = authActionClient
  .metadata({ actionName: "updateKpi" })
  .schema(updateKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "kpis:manage");

    const { kpiId, ...updates } = parsedInput;
    const kpi = await prisma.kpiConfig.findFirst({
      where: { id: kpiId, companyId: ctx.companyId },
    });
    if (!kpi) throw new Error("KPI not found");

    const updated = await prisma.kpiConfig.update({
      where: { id: kpiId },
      data: updates,
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "KPI_UPDATED",
      entityType: "KpiConfig",
      entityId: kpiId,
      before: { label: kpi.label, targetValue: kpi.targetValue, isActive: kpi.isActive },
      after: updates,
    });

    revalidatePath("/settings/kpis");
    return { success: true };
  });

const deleteKpiSchema = z.object({
  kpiId: z.string(),
});

export const deleteKpi = authActionClient
  .metadata({ actionName: "deleteKpi" })
  .schema(deleteKpiSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "kpis:manage");

    const kpi = await prisma.kpiConfig.findFirst({
      where: { id: parsedInput.kpiId, companyId: ctx.companyId },
    });
    if (!kpi) throw new Error("KPI not found");

    // Soft delete (mark inactive)
    await prisma.kpiConfig.update({
      where: { id: parsedInput.kpiId },
      data: { isActive: false },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "KPI_DELETED",
      entityType: "KpiConfig",
      entityId: parsedInput.kpiId,
      before: { key: kpi.key, label: kpi.label },
    });

    revalidatePath("/settings/kpis");
    return { success: true };
  });
