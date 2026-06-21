import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiSettingsClient } from "@/components/settings/kpi-settings-client";

export const metadata = { title: "KPI Configuration" };

export default async function KpiSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") redirect("/settings");

  const configs = await prisma.kpiConfig.findMany({
    where: { companyId: session.user.companyId },
    include: { department: { select: { name: true, colorHex: true } } },
    orderBy: [{ department: { name: "asc" } }, { label: "asc" }],
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold">KPI Configuration</h1>
        <p className="text-muted-foreground text-sm mt-1">Adjust targets and thresholds for each department KPI</p>
      </div>
      <KpiSettingsClient configs={configs as any} />
    </div>
  );
}
