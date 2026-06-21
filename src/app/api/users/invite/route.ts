import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CEO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role, departmentId } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { companyId: session.user.companyId, email },
  });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      companyId: session.user.companyId,
      name,
      email,
      password: hash,
      role: role ?? "EMPLOYEE",
      departmentId: departmentId || null,
    },
  });

  return NextResponse.json({ success: true });
}
