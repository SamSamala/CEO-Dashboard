import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UsersClient } from "@/components/settings/users-client";
import { Users } from "lucide-react";

export const metadata = { title: "User Management" };

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/settings");

  const companyId = session.user.companyId;

  const [users, departments, customRoles] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      include: {
        department: { select: { name: true } },
        customRole: { select: { name: true, color: true } },
      },
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customRole.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Never expose passwords — strip them before sending to client
  const safeUsers = users.map(({ password: _pw, ...u }) => u);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">
            {users.filter((u) => u.isActive).length} active · {users.filter((u) => !u.isActive).length} deactivated
          </p>
        </div>
      </div>
      <UsersClient
        users={safeUsers}
        departments={departments}
        customRoles={customRoles}
        currentUserId={session.user.id}
      />
    </div>
  );
}
