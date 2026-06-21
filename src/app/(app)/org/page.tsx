import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrgClient } from "@/components/org/org-client";

export const metadata = { title: "Organization" };

export default async function OrgPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: userId, companyId, role } = session.user;

  // Departments with directors and teams
  const departments = await prisma.department.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      directorId: true,
      director: {
        select: { id: true, name: true, email: true, role: true },
      },
      teams: {
        where: { isActive: true },
        include: {
          leader: { select: { id: true, name: true, email: true } },
          members: { select: { id: true, name: true, email: true, role: true } },
          employeesOfMonth: {
            orderBy: [{ year: "desc" }, { month: "desc" }],
            take: 1,
            include: {
              employee: { select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // All users in company (for assigning directors, members, leaders)
  const companyUsers = await prisma.user.findMany({
    where: { companyId, isActive: true },
    select: { id: true, name: true, email: true, role: true, departmentId: true, teamId: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  // All employees (for EoM awards — must have Employee record)
  const employees = await prisma.employee.findMany({
    where: { companyId, employmentStatus: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true, departmentId: true, teamId: true, userId: true },
    orderBy: { firstName: "asc" },
  });

  return (
    <OrgClient
      departments={departments as any}
      companyUsers={companyUsers}
      employees={employees}
      currentUserId={userId}
      currentUserRole={role}
    />
  );
}
