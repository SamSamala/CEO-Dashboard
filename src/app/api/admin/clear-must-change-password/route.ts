import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// CEO-only: clears mustChangePassword for a specific user or all users in the company.
// Used by demo automation to bypass the forced-change redirect loop.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;
  const body = await req.json().catch(() => ({}));
  const email = body.email as string | undefined;

  if (email) {
    // Clear for a specific user
    const updated = await prisma.user.updateMany({
      where: { companyId, email: email.toLowerCase(), id: { not: session.user.id } },
      data: { mustChangePassword: false },
    });
    return NextResponse.json({ ok: true, updated: updated.count });
  } else {
    // Clear for all non-CEO users in the company
    const updated = await prisma.user.updateMany({
      where: { companyId, id: { not: session.user.id } },
      data: { mustChangePassword: false },
    });
    return NextResponse.json({ ok: true, updated: updated.count });
  }
}
