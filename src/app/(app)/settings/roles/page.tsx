import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RolesClient } from "@/components/settings/roles-client";
import { Shield } from "lucide-react";

export default async function RolesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "CEO") redirect("/settings");

  const [roles, userCounts] = await Promise.all([
    prisma.customRole.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.groupBy({
      by: ["customRoleId"],
      where: { companyId: session.user.companyId, customRoleId: { not: null } },
      _count: { customRoleId: true },
    }),
  ]);

  const countMap = new Map(
    userCounts.map((r) => [r.customRoleId!, r._count.customRoleId])
  );

  const rolesWithCounts = roles.map((r) => ({
    ...r,
    userCount: countMap.get(r.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">
            Create custom roles and control what each role can access.
          </p>
        </div>
      </div>
      <RolesClient roles={rolesWithCounts} />
    </div>
  );
}
