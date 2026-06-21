"use client";

import { useSession } from "next-auth/react";

interface RoleGateProps {
  allowedRoles: ("CEO" | "DEPT_HEAD" | "EMPLOYEE")[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { data: session } = useSession();
  const role = session?.user?.role as string;

  if (!role || !allowedRoles.includes(role as "CEO" | "DEPT_HEAD" | "EMPLOYEE")) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
