"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createSafeActionClient } from "next-safe-action";

const action = createSafeActionClient();

// ─── APPOINT DIRECTOR ────────────────────────────────────────────────────────

const appointDirectorSchema = z.object({
  departmentId: z.string(),
  userId: z.string(),
});

export const appointDirector = action
  .schema(appointDirectorSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role !== "CEO") {
      throw new Error("Unauthorized");
    }

    const { departmentId, userId } = parsedInput;

    // Promote user to DEPT_HEAD if they aren't already
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });
    if (!user || user.companyId !== session.user.companyId) throw new Error("User not found");

    await prisma.$transaction([
      // Remove any existing director from this dept
      prisma.department.updateMany({
        where: { directorId: userId },
        data: { directorId: null },
      }),
      // Set the director
      prisma.department.update({
        where: { id: departmentId },
        data: { directorId: userId },
      }),
      // Assign user to department and elevate to DEPT_HEAD
      prisma.user.update({
        where: { id: userId },
        data: {
          departmentId,
          role: "DEPT_HEAD",
          roleVersion: { increment: 1 },
        },
      }),
    ]);

    revalidatePath("/org");
    revalidatePath("/employees");
    return { success: true };
  });

// ─── REMOVE DIRECTOR ─────────────────────────────────────────────────────────

const removeDirectorSchema = z.object({ departmentId: z.string() });

export const removeDirector = action
  .schema(removeDirectorSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role !== "CEO") throw new Error("Unauthorized");

    const dept = await prisma.department.findUnique({
      where: { id: parsedInput.departmentId },
      select: { directorId: true },
    });
    if (!dept?.directorId) return { success: true };

    await prisma.$transaction([
      prisma.department.update({
        where: { id: parsedInput.departmentId },
        data: { directorId: null },
      }),
      prisma.user.update({
        where: { id: dept.directorId },
        data: { role: "EMPLOYEE", roleVersion: { increment: 1 } },
      }),
    ]);

    revalidatePath("/org");
    return { success: true };
  });

// ─── CREATE TEAM ─────────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  departmentId: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  colorHex: z.string().optional(),
});

export const createTeam = action
  .schema(createTeamSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    const dept = await prisma.department.findUnique({
      where: { id: parsedInput.departmentId },
      select: { companyId: true, directorId: true },
    });
    if (!dept || dept.companyId !== session.user.companyId) throw new Error("Department not found");

    // DEPT_HEAD can only create teams in their own department
    if (
      session.user.role === "DEPT_HEAD" &&
      dept.directorId !== session.user.id
    ) throw new Error("Unauthorized");

    const team = await prisma.team.create({
      data: {
        companyId: session.user.companyId,
        departmentId: parsedInput.departmentId,
        name: parsedInput.name,
        description: parsedInput.description,
        colorHex: parsedInput.colorHex ?? "#6366f1",
      },
    });

    revalidatePath("/org");
    return { success: true, teamId: team.id };
  });

// ─── DELETE TEAM ─────────────────────────────────────────────────────────────

const deleteTeamSchema = z.object({ teamId: z.string() });

export const deleteTeam = action
  .schema(deleteTeamSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    const team = await prisma.team.findUnique({
      where: { id: parsedInput.teamId },
      select: { companyId: true },
    });
    if (!team || team.companyId !== session.user.companyId) throw new Error("Not found");

    // Clear member assignments first
    await prisma.$transaction([
      prisma.user.updateMany({ where: { teamId: parsedInput.teamId }, data: { teamId: null } }),
      prisma.employee.updateMany({ where: { teamId: parsedInput.teamId }, data: { teamId: null } }),
      prisma.team.delete({ where: { id: parsedInput.teamId } }),
    ]);

    revalidatePath("/org");
    return { success: true };
  });

// ─── APPOINT TEAM LEADER ─────────────────────────────────────────────────────

const appointLeaderSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export const appointTeamLeader = action
  .schema(appointLeaderSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    const team = await prisma.team.findUnique({
      where: { id: parsedInput.teamId },
      select: { companyId: true, departmentId: true },
    });
    if (!team || team.companyId !== session.user.companyId) throw new Error("Not found");

    await prisma.$transaction([
      // Ensure the user is in the team
      prisma.user.update({
        where: { id: parsedInput.userId },
        data: { teamId: parsedInput.teamId },
      }),
      // Set as leader
      prisma.team.update({
        where: { id: parsedInput.teamId },
        data: { leaderId: parsedInput.userId },
      }),
    ]);

    revalidatePath("/org");
    return { success: true };
  });

// ─── ADD MEMBER TO TEAM ───────────────────────────────────────────────────────

const addTeamMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export const addTeamMember = action
  .schema(addTeamMemberSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    const team = await prisma.team.findUnique({
      where: { id: parsedInput.teamId },
      select: { companyId: true },
    });
    if (!team || team.companyId !== session.user.companyId) throw new Error("Not found");

    const emp = await prisma.employee.findFirst({
      where: { companyId: session.user.companyId, userId: parsedInput.userId },
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: parsedInput.userId },
        data: { teamId: parsedInput.teamId },
      }),
      ...(emp
        ? [prisma.employee.update({ where: { id: emp.id }, data: { teamId: parsedInput.teamId } })]
        : []),
    ]);

    revalidatePath("/org");
    return { success: true };
  });

// ─── REMOVE MEMBER FROM TEAM ──────────────────────────────────────────────────

const removeTeamMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
});

export const removeTeamMember = action
  .schema(removeTeamMemberSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user || session.user.role === "EMPLOYEE") throw new Error("Unauthorized");

    const team = await prisma.team.findUnique({
      where: { id: parsedInput.teamId },
      select: { companyId: true, leaderId: true },
    });
    if (!team || team.companyId !== session.user.companyId) throw new Error("Not found");

    const emp = await prisma.employee.findFirst({
      where: { companyId: session.user.companyId, userId: parsedInput.userId },
    });

    const ops: any[] = [
      prisma.user.update({ where: { id: parsedInput.userId }, data: { teamId: null } }),
    ];
    if (emp) ops.push(prisma.employee.update({ where: { id: emp.id }, data: { teamId: null } }));
    // Remove leader role if removing the leader
    if (team.leaderId === parsedInput.userId) {
      ops.push(prisma.team.update({ where: { id: parsedInput.teamId }, data: { leaderId: null } }));
    }

    await prisma.$transaction(ops);
    revalidatePath("/org");
    return { success: true };
  });

// ─── AWARD EMPLOYEE OF THE MONTH ─────────────────────────────────────────────

const awardEomSchema = z.object({
  teamId: z.string(),
  employeeId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  reason: z.string().optional(),
});

export const awardEmployeeOfMonth = action
  .schema(awardEomSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const team = await prisma.team.findUnique({
      where: { id: parsedInput.teamId },
      select: { companyId: true, leaderId: true },
    });
    if (!team || team.companyId !== session.user.companyId) throw new Error("Not found");

    // Only CEO, the dept director, or the team leader can award
    const isLeader = team.leaderId === session.user.id;
    if (session.user.role === "EMPLOYEE" && !isLeader) throw new Error("Unauthorized");

    await prisma.employeeOfMonth.upsert({
      where: {
        teamId_month_year: {
          teamId: parsedInput.teamId,
          month: parsedInput.month,
          year: parsedInput.year,
        },
      },
      update: {
        employeeId: parsedInput.employeeId,
        reason: parsedInput.reason,
        awardedBy: session.user.id,
      },
      create: {
        companyId: session.user.companyId,
        teamId: parsedInput.teamId,
        employeeId: parsedInput.employeeId,
        month: parsedInput.month,
        year: parsedInput.year,
        reason: parsedInput.reason,
        awardedBy: session.user.id,
      },
    });

    revalidatePath("/org");
    return { success: true };
  });
