"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

const alertIdSchema = z.object({ alertId: z.string() });

export const acknowledgeAlert = authActionClient
  .metadata({ actionName: "acknowledgeAlert" })
  .schema(alertIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "alerts:manage");
    await prisma.alert.updateMany({
      where: { id: parsedInput.alertId, companyId: ctx.companyId },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
    revalidatePath("/alerts");
    return { success: true };
  });

export const resolveAlert = authActionClient
  .metadata({ actionName: "resolveAlert" })
  .schema(alertIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "alerts:manage");
    await prisma.alert.updateMany({
      where: { id: parsedInput.alertId, companyId: ctx.companyId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    revalidatePath("/alerts");
    revalidatePath("/dashboard");
    return { success: true };
  });
