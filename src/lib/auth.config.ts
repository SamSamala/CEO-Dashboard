// Extend the NextAuth types
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      companyId: string;
      departmentId: string | null;
      roleVersion: number;
      customRoleId: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}
