import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DataImportClient } from "@/components/import/data-import-client";

export const metadata = { title: "Data Import" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [departments, templates, recentJobs] = await Promise.all([
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
  ]);

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
        companyId={session.user.companyId}
      />
    </div>
  );
}
