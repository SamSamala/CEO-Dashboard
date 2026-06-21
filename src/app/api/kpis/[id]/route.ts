import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  const kpi = await prisma.kpiConfig.findFirst({
    where: { id, companyId: session.user.companyId },
  });
  if (!kpi) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.kpiConfig.update({
    where: { id },
    data: {
      targetValue: body.targetValue ?? kpi.targetValue,
      warningThreshold: body.warningThreshold ?? kpi.warningThreshold,
      criticalThreshold: body.criticalThreshold ?? kpi.criticalThreshold,
    },
  });
  return NextResponse.json({ success: true });
}
