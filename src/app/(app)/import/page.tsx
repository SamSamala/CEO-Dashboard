import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DataImportClient } from "@/components/import/data-import-client";

export const metadata = { title: "Data Import" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [departments, templates, recentJobs, kpiConfigs] = await Promise.all([
    prisma.department.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.importMappingTemplate.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.importJob.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.kpiConfig.findMany({
      where: { companyId: session.user.companyId, isActive: true },
      select: { departmentId: true, key: true, label: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Group each department's real KPI keys so the importer can map and build
  // templates against the actual metrics that department tracks.
  const deptKpis: Record<string, { key: string; label: string }[]> = {};
  for (const k of kpiConfigs) {
    (deptKpis[k.departmentId] ??= []).push({ key: k.key, label: k.label });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Import</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import metrics from CSV, Excel, or CRM exports
        </p>
      </div>
      <DataImportClient
        departments={departments}
        templates={templates as any}
        recentJobs={recentJobs}
        deptKpis={deptKpis}
        companyId={session.user.companyId}
      />
    </div>
  );
}
