import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // trustHost allows NextAuth to work on Vercel without NEXTAUTH_URL
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findFirst({
          where: { email: parsed.data.email },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        // Throw a structured error for deactivated accounts so the login page
        // can show the employee their termination note
        if (!user.isActive) {
          const note = user.terminationNote ?? "Your account has been deactivated. Please contact your employer.";
          throw new Error(`DEACTIVATED|${note}`);
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          companyId: user.companyId,
          departmentId: user.departmentId,
          roleVersion: user.roleVersion,
          customRoleId: user.customRoleId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.departmentId = (user as any).departmentId;
        token.userId = user.id;
        token.roleVersion = (user as any).roleVersion ?? 0;
        token.customRoleId = (user as any).customRoleId ?? null;
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.companyId = token.companyId as string;
        session.user.departmentId = (token.departmentId as string) ?? null;
        session.user.roleVersion = (token.roleVersion as number) ?? 0;
        session.user.customRoleId = (token.customRoleId as string) ?? null;
        session.user.mustChangePassword = (token.mustChangePassword as boolean) ?? false;
      }
      return session;
    },
  },
});
