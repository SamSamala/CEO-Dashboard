import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const departments = await prisma.department.findMany({
    where: { companyId: session.user.companyId, isActive: true },
    select: { id: true, name: true, slug: true, colorHex: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}
