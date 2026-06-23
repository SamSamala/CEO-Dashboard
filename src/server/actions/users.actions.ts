"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit.helper";
import { revalidatePath } from "next/cache";

function requireCeo(role: string) {
  if (role !== "CEO") throw new Error("Forbidden: CEO access required");
}

// Generate next employee ID: EMP-001, EMP-002, etc.
async function nextEmployeeId(companyId: string): Promise<string> {
  const count = await prisma.user.count({ where: { companyId, employeeId: { not: null } } });
  return `EMP-${String(count + 1).padStart(3, "0")}`;
}

// ── Bulk create employees ──────────────────────────────────────────────────────

const bulkUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  employeeId: z.string().optional(),
  customRoleId: z.string().optional(),
  departmentId: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const bulkCreateUsersSchema = z.object({
  users: z.array(bulkUserSchema).min(1),
});

export const bulkCreateUsers = authActionClient
  .metadata({ actionName: "bulkCreateUsers" })
  .schema(bulkCreateUsersSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const results: { email: string; status: "created" | "skipped"; error?: string }[] = [];
    let created = 0;
    let skipped = 0;

    // Validate uniqueness before creating anything
    const incomingEmails = parsedInput.users.map((u) => u.email.toLowerCase());
    const dupeInBatch = incomingEmails.filter((e, i) => incomingEmails.indexOf(e) !== i);
    if (dupeInBatch.length > 0) {
      throw new Error(`Duplicate emails in your list: ${[...new Set(dupeInBatch)].join(", ")}`);
    }

    // Check against existing emails in the company
    const existingUsers = await prisma.user.findMany({
      where: { companyId: ctx.companyId, email: { in: incomingEmails } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    for (const userData of parsedInput.users) {
      if (existingEmails.has(userData.email.toLowerCase())) {
        results.push({ email: userData.email, status: "skipped", error: "Email already exists" });
        skipped++;
        continue;
      }

      // Validate department and role belong to this company
      if (userData.departmentId) {
        const dept = await prisma.department.findFirst({
          where: { id: userData.departmentId, companyId: ctx.companyId },
        });
        if (!dept) {
          results.push({ email: userData.email, status: "skipped", error: "Invalid department" });
          skipped++;
          continue;
        }
      }

      if (userData.customRoleId) {
        const role = await prisma.customRole.findFirst({
          where: { id: userData.customRoleId, companyId: ctx.companyId },
        });
        if (!role) {
          results.push({ email: userData.email, status: "skipped", error: "Invalid role" });
          skipped++;
          continue;
        }
      }

      const hash = await bcrypt.hash(userData.password, 12);
      const employeeId = userData.employeeId?.trim() || (await nextEmployeeId(ctx.companyId));

      const user = await prisma.user.create({
        data: {
          companyId: ctx.companyId,
          name: userData.name,
          email: userData.email.toLowerCase(),
          password: hash,
          role: "EMPLOYEE",
          customRoleId: userData.customRoleId || null,
          departmentId: userData.departmentId || null,
          employeeId,
          mustChangePassword: true, // force password change on first login
        },
      });

      await logAudit(prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "EMPLOYEE_CREATED",
        entityType: "User",
        entityId: user.id,
        after: { name: user.name, email: user.email, employeeId, customRoleId: userData.customRoleId },
      });

      results.push({ email: userData.email, status: "created" });
      created++;
    }

    revalidatePath("/settings/users");
    return { created, skipped, results };
  });

// ── Update user ────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(1).optional(),
  customRoleId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  employeeId: z.string().optional(),
});

export const updateUser = authActionClient
  .metadata({ actionName: "updateUser" })
  .schema(updateUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const { userId, customRoleId, ...rest } = parsedInput;
    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: ctx.companyId },
    });
    if (!user) throw new Error("User not found");
    if (user.role === "CEO" && customRoleId !== undefined) {
      throw new Error("Cannot change the CEO's role assignment");
    }

    const updateData: Record<string, unknown> = { ...rest };
    if (customRoleId !== undefined) {
      updateData.customRoleId = customRoleId;
      updateData.roleVersion = { increment: 1 };
    }

    await prisma.user.update({ where: { id: userId }, data: updateData });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "EMPLOYEE_UPDATED",
      entityType: "User",
      entityId: userId,
      after: parsedInput,
    });

    revalidatePath("/settings/users");
    return { success: true };
  });

// ── Terminate / deactivate user ────────────────────────────────────────────────

const terminateUserSchema = z.object({
  userId: z.string(),
  reason: z.enum(["FIRED", "SUSPENDED", "ON_LEAVE"]),
  note: z.string().optional(),
});

export const terminateUser = authActionClient
  .metadata({ actionName: "terminateUser" })
  .schema(terminateUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    if (parsedInput.userId === ctx.userId) {
      throw new Error("You cannot deactivate your own account");
    }

    const user = await prisma.user.findFirst({
      where: { id: parsedInput.userId, companyId: ctx.companyId },
    });
    if (!user) throw new Error("User not found");
    if (!user.isActive) throw new Error("Account is already deactivated");

    // Guard: cannot deactivate the last active CEO
    if (user.role === "CEO") {
      const activeCeoCount = await prisma.user.count({
        where: { companyId: ctx.companyId, role: "CEO", isActive: true },
      });
      if (activeCeoCount <= 1) {
        throw new Error("Cannot deactivate the only active CEO — the company would be locked out");
      }
    }

    await prisma.user.update({
      where: { id: parsedInput.userId },
      data: {
        isActive: false,
        terminationNote: parsedInput.note ?? null,
        terminatedAt: new Date(),
        terminatedBy: ctx.userId,
        terminationReason: parsedInput.reason,
        roleVersion: { increment: 1 }, // invalidates all active sessions immediately
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "EMPLOYEE_TERMINATED",
      entityType: "User",
      entityId: parsedInput.userId,
      before: { isActive: true },
      after: { isActive: false, reason: parsedInput.reason, note: parsedInput.note },
      reason: parsedInput.note,
    });

    revalidatePath("/settings/users");
    return { success: true };
  });

// ── Reactivate user ────────────────────────────────────────────────────────────

const reactivateUserSchema = z.object({
  userId: z.string(),
});

export const reactivateUser = authActionClient
  .metadata({ actionName: "reactivateUser" })
  .schema(reactivateUserSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const user = await prisma.user.findFirst({
      where: { id: parsedInput.userId, companyId: ctx.companyId },
    });
    if (!user) throw new Error("User not found");
    if (user.isActive) throw new Error("Account is already active");

    await prisma.user.update({
      where: { id: parsedInput.userId },
      data: {
        isActive: true,
        terminationNote: null,
        terminatedAt: null,
        terminatedBy: null,
        terminationReason: null,
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "EMPLOYEE_REACTIVATED",
      entityType: "User",
      entityId: parsedInput.userId,
    });

    revalidatePath("/settings/users");
    return { success: true };
  });

// ── CEO resets another user's password ────────────────────────────────────────

const resetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const resetPassword = authActionClient
  .metadata({ actionName: "resetPassword" })
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput, ctx }) => {
    requireCeo(ctx.role);

    const user = await prisma.user.findFirst({
      where: { id: parsedInput.userId, companyId: ctx.companyId },
    });
    if (!user) throw new Error("User not found");

    const hash = await bcrypt.hash(parsedInput.newPassword, 12);

    await prisma.user.update({
      where: { id: parsedInput.userId },
      data: {
        password: hash,
        mustChangePassword: true,
        roleVersion: { increment: 1 },
      },
    });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "PASSWORD_RESET_BY_CEO",
      entityType: "User",
      entityId: parsedInput.userId,
    });

    revalidatePath("/settings/users");
    return { success: true };
  });

// ── Self-service password change ───────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export const changePassword = authActionClient
  .metadata({ actionName: "changePassword" })
  .schema(changePasswordSchema)
  .action(async ({ parsedInput, ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { password: true },
    });
    if (!user?.password) throw new Error("No password set on this account");

    const valid = await bcrypt.compare(parsedInput.currentPassword, user.password);
    if (!valid) throw new Error("Current password is incorrect");

    const hash = await bcrypt.hash(parsedInput.newPassword, 12);

    await prisma.user.update({
      where: { id: ctx.userId },
      data: {
        password: hash,
        mustChangePassword: false,
        // Increment roleVersion so other sessions (other devices) are invalidated
        roleVersion: { increment: 1 },
      },
    });

    revalidatePath("/settings/password");
    return { success: true };
  });
