import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users, Target, Bell, Building2, Shield, FileText } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/dashboard");

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    include: {
      _count: { select: { users: true, departments: true, employees: true } },
    },
  });

  const links = [
    { href: "/settings/users", label: "User Management", description: "Add employees, assign roles, manage accounts", icon: Users },
    { href: "/settings/roles", label: "Roles & Permissions", description: "Create custom roles and set what each role can access", icon: Shield },
    { href: "/settings/kpis", label: "KPI Configuration", description: "Adjust targets and thresholds for each department", icon: Target },
    { href: "/settings/alerts", label: "Alert Rules", description: "Configure when alerts fire and thresholds", icon: Bell },
    { href: "/settings/audit", label: "Audit Log", description: "Review every action taken in your workspace", icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle="Configure your CEO Operating System"
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Company Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">{company?.name}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{company?._count.users} users</span>
                <span className="text-xs text-muted-foreground">{company?._count.departments} departments</span>
                <span className="text-xs text-muted-foreground">{company?._count.employees} employees</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
