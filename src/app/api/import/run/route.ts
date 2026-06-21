import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMapping } from "@/server/services/import.service";
import type { ColumnMapping } from "@/types/import.types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const { rows, mappings, departmentId, date, overwriteMode, label } = await req.json() as {
    rows: Record<string, string>[];
    mappings: ColumnMapping[];
    departmentId: string;
    date: string;
    overwriteMode?: boolean;
    label?: string;
  };

  // Always derive companyId from session — never trust the request body
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const mapped = applyMapping(rows, mappings);
  const businessDate = new Date(date);
  let imported = 0;

  // If overwrite mode, delete existing entries for this businessDate + department
  if (overwriteMode) {
    await prisma.metricEntry.deleteMany({
      where: { companyId, departmentId, businessDate },
    });
  }

  for (const rowData of mapped) {
    if (Object.keys(rowData).length === 0) continue;
    try {
      await prisma.metricEntry.create({
        data: {
          companyId,
          departmentId,
          submittedBy: session.user.id,
          businessDate,
          label: label ?? null,
          data: rowData,
        },
      });
      imported++;
    } catch {}
  }

  return NextResponse.json({ imported });
}
