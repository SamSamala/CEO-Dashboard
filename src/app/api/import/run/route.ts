import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyMapping, extractRowDates } from "@/server/services/import.service";
import type { ColumnMapping } from "@/types/import.types";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = session.user.companyId;

  const { rows, mappings, departmentId, date, overwriteMode, label, filename } = (await req.json()) as {
    rows: Record<string, string>[];
    mappings: ColumnMapping[];
    departmentId: string;
    date: string;
    overwriteMode?: boolean;
    label?: string;
    filename?: string;
  };

  // Always derive companyId from session — never trust the request body
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, companyId },
  });
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

  const mapped = applyMapping(rows, mappings);
  const dates = extractRowDates(rows, mappings, date);

  // Build one entry per non-empty row, each with its own business date.
  const entries = mapped
    .map((rowData, i) => ({ rowData, businessDate: dates[i] }))
    .filter((e) => Object.keys(e.rowData).length > 0)
    .map((e) => ({
      companyId,
      departmentId,
      submittedBy: session.user.id,
      businessDate: e.businessDate,
      label: label ?? null,
      data: e.rowData,
    }));

  // Overwrite mode: clear existing entries on every date present in this file.
  if (overwriteMode && entries.length > 0) {
    const distinctDates = [...new Set(entries.map((e) => e.businessDate.toISOString()))].map(
      (s) => new Date(s)
    );
    await prisma.metricEntry.deleteMany({
      where: { companyId, departmentId, businessDate: { in: distinctDates } },
    });
  }

  let imported = 0;
  if (entries.length > 0) {
    const result = await prisma.metricEntry.createMany({ data: entries });
    imported = result.count;
  }

  // Record the import so it appears under "Recent Imports".
  await prisma.importJob.create({
    data: {
      companyId,
      submittedBy: session.user.id,
      departmentId,
      filename: filename ?? "import.csv",
      fileUrl: "",
      status: "COMPLETED",
      rowsTotal: rows.length,
      rowsImported: imported,
      rowsFailed: rows.length - imported,
      completedAt: new Date(),
    },
  }).catch(() => {});

  return NextResponse.json({ imported });
}
