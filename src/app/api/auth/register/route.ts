import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { name, email, password, companyName } = await req.json();

    if (!name || !email || !password || !companyName) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const companySlug = slugify(companyName) + "-" + Date.now().toString(36);

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          slug: companySlug,
          onboardingCompleted: false,
        },
      });

      await tx.user.create({
        data: {
          companyId: company.id,
          name,
          email,
          password: hash,
          role: "CEO",
        },
      });

      return company;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
