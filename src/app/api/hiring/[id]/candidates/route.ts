import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const { id } = await params;
  const candidates = await prisma.candidate.findMany({
    where: {
      hiringRequestId: id,
      hiringRequest: { companyId: session.user.companyId },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(candidates);
}
