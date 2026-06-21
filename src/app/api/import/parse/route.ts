import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCSV, autoSuggestMappings } from "@/server/services/import.service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, filename, deptSlug } = await req.json();
  if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

  try {
    const parsed = parseCSV(content);
    const suggestions = deptSlug ? autoSuggestMappings(parsed.headers, deptSlug) : [];
    return NextResponse.json({ parsed: { headers: parsed.headers, rows: parsed.rows.slice(0, 5) }, suggestions, totalRows: parsed.totalRows });
  } catch (err) {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 400 });
  }
}
