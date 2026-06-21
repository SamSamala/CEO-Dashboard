"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

// CEO-only guard helper
function requireCeo(role: string) {
  if (role !== "CEO") throw new Error("Forbidden: CEO access required");
}

const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  permissions: z.array(z.string()),
});

export const createRole = authActionClient
  .metadata({ actionName: "createRole" })
  .schema(createRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const existing = await prisma.customRole.findFirst({
      where: { companyId: ctx.companyId, name: parsedInput.name },
    });
    if (existing) throw new Error(`A role named "${parsedInput.name}" already exists`);

    const role = await prisma.customRole.create({
      data: {
        companyId: ctx.companyId,
        name: parsedInput.name,
        description: parsedInput.description,
        color: parsedInput.color,
        permissions: parsedInput.permissions,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "ROLE_CREATED",
      entityType: "CustomRole",
      entityId: role.id,
      after: { name: role.name, permissions: role.permissions },
    });

    revalidatePath("/settings/roles");
    return { roleId: role.id };
  });

const updateRoleSchema = z.object({
  roleId: z.string(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateRole = authActionClient
  .metadata({ actionName: "updateRole" })
  .schema(updateRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const { roleId, ...updates } = parsedInput;
    const existing = await prisma.customRole.findFirst({
      where: { id: roleId, companyId: ctx.companyId },
    });
    if (!existing) throw new Error("Role not found");

    const updatedRole = await prisma.customRole.update({
      where: { id: roleId },
      data: updates,
    });

    // Invalidate sessions of all users with this role so they get fresh permissions
    await prisma.user.updateMany({
      where: { companyId: ctx.companyId, customRoleId: roleId },
      data: { roleVersion: { increment: 1 } },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "ROLE_UPDATED",
      entityType: "CustomRole",
      entityId: roleId,
      before: { name: existing.name, permissions: existing.permissions },
      after: { name: updatedRole.name, permissions: updatedRole.permissions },
    });

    revalidatePath("/settings/roles");
    return { success: true };
  });

const deleteRoleSchema = z.object({
  roleId: z.string(),
});

export const deleteRole = authActionClient
  .metadata({ actionName: "deleteRole" })
  .schema(deleteRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const role = await prisma.customRole.findFirst({
      where: { id: parsedInput.roleId, companyId: ctx.companyId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new Error("Role not found");
    if (role._count.users > 0) {
      throw new Error(`Cannot delete "${role.name}" — ${role._count.users} user(s) are assigned to it. Reassign them first.`);
    }

    await prisma.customRole.delete({ where: { id: parsedInput.roleId } });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "ROLE_DELETED",
      entityType: "CustomRole",
      entityId: parsedInput.roleId,
      before: { name: role.name },
    });

    revalidatePath("/settings/roles");
    return { success: true };
  });

const assignRoleSchema = z.object({
  userId: z.string(),
  customRoleId: z.string().nullable(),
});

export const assignRole = authActionClient
  .metadata({ actionName: "assignRole" })
  .schema(assignRoleSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const user = await prisma.user.findFirst({
      where: { id: parsedInput.userId, companyId: ctx.companyId },
    });
    if (!user) throw new Error("User not found");
    if (user.role === "CEO") throw new Error("Cannot reassign the CEO role");

    if (parsedInput.customRoleId) {
      const role = await prisma.customRole.findFirst({
        where: { id: parsedInput.customRoleId, companyId: ctx.companyId },
      });
      if (!role) throw new Error("Role not found");
    }

    const prevRoleId = user.customRoleId;
    await prisma.user.update({
      where: { id: parsedInput.userId },
      data: {
        customRoleId: parsedInput.customRoleId,
        roleVersion: { increment: 1 },
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "ROLE_ASSIGNED",
      entityType: "User",
      entityId: parsedInput.userId,
      before: { customRoleId: prevRoleId },
      after: { customRoleId: parsedInput.customRoleId },
    });

    revalidatePath("/settings/users");
    revalidatePath("/settings/roles");
    return { success: true };
  });
