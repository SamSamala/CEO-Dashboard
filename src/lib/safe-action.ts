import { createSafeActionClient } from "next-safe-action";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    });
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Fetch current DB user to validate session freshness and active status
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      roleVersion: true,
      role: true,
      isActive: true,
      customRoleId: true,
      mustChangePassword: true,
    },
  });

  if (!dbUser || !dbUser.isActive) {
    throw new Error("Account not found or deactivated");
  }

  // Detect stale sessions after role changes or permission updates
  const sessionRoleVersion = session.user.roleVersion ?? 0;
  if (dbUser.roleVersion !== sessionRoleVersion) {
    throw new Error("Session expired due to role change. Please sign in again.");
  }

  // Fetch custom role permissions (if user has a custom role)
  let customRolePermissions: string[] = [];
  if (dbUser.customRoleId) {
    const customRole = await prisma.customRole.findUnique({
      where: { id: dbUser.customRoleId },
      select: { permissions: true },
    });
    customRolePermissions = customRole?.permissions ?? [];
  }

  return next({
    ctx: {
      userId: session.user.id,
      companyId: session.user.companyId,
      role: dbUser.role as string,
      departmentId: session.user.departmentId,
      roleVersion: dbUser.roleVersion,
      customRoleId: dbUser.customRoleId,
      customRolePermissions,
    },
  });
});
