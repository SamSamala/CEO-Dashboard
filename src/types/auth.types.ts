export type UserRole = "CEO" | "DEPT_HEAD" | "EMPLOYEE";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: UserRole;
  companyId: string;
  departmentId: string | null;
}
