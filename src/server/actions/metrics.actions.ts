"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { detectBottlenecks } from "@/server/services/bottleneck.service";
import { evaluateAlerts } from "@/server/services/alert.service";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

const submitMetricsSchema = z.object({
  departmentId: z.string(),
  businessDate: z.string(),
  label: z.string().optional(),
  data: z.record(z.string(), z.number()),
  notes: z.string().optional(),
});

export const submitMetrics = authActionClient
  .metadata({ actionName: "submitMetrics" })
  .schema(submitMetricsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { departmentId, businessDate, label, data, notes } = parsedInput;
    const { companyId, userId } = ctx;

    const dept = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!dept) throw new Error("Department not found");

    const entry = await prisma.metricEntry.create({
      data: {
        companyId,
        departmentId,
        submittedBy: userId,
        businessDate: new Date(businessDate),
        label: label ?? null,
        data,
        notes,
      },
    });

    await logAudit(prisma, {
      companyId,
      userId,
      action: "METRIC_CREATED",
      entityType: "MetricEntry",
      entityId: entry.id,
      after: { departmentId, businessDate, label, kpiCount: Object.keys(data).length },
    });

    // Run bottleneck detection and alert evaluation in background
    Promise.all([
      detectBottlenecks(companyId).catch(console.error),
      evaluateAlerts(companyId).catch(console.error),
    ]);

    revalidatePath(`/departments/${dept.slug.toLowerCase()}`);
    revalidatePath("/dashboard");

    return { success: true, entryId: entry.id };
  });

const deleteMetricEntrySchema = z.object({
  entryId: z.string(),
});

export const deleteMetricEntry = authActionClient
  .metadata({ actionName: "deleteMetricEntry" })
  .schema(deleteMetricEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { companyId, userId } = ctx;

    const entry = await prisma.metricEntry.findFirst({
      where: { id: parsedInput.entryId, companyId },
      include: { department: true },
    });
    if (!entry) throw new Error("Metric entry not found");

    await prisma.metricEntry.delete({ where: { id: entry.id } });

    await logAudit(prisma, {
      companyId,
      userId,
      action: "METRIC_DELETED",
      entityType: "MetricEntry",
      entityId: entry.id,
      before: { departmentId: entry.departmentId, businessDate: entry.businessDate, label: entry.label },
    });

    revalidatePath(`/departments/${entry.department.slug.toLowerCase()}`);
    revalidatePath("/dashboard");

    return { success: true };
  });
