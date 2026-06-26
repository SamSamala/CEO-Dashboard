import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCSV, parseExcelBase64, autoSuggestMappings } from "@/server/services/import.service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, contentBase64, deptSlug } = await req.json();
  if (!content && !contentBase64) {
    return NextResponse.json({ error: "No content" }, { status: 400 });
  }

  try {
    const parsed = contentBase64 ? parseExcelBase64(contentBase64) : parseCSV(content);
    const suggestions = deptSlug ? autoSuggestMappings(parsed.headers, deptSlug) : [];
    // Return ALL rows so the full file is imported (preview is sliced client-side).
    return NextResponse.json({
      parsed: { headers: parsed.headers, rows: parsed.rows },
      suggestions,
      totalRows: parsed.totalRows,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 });
  }
}
