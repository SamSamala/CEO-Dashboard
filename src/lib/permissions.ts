type Permission =
  | "approvals:submit"
  | "approvals:decide"
  | "approvals:decide:own_dept"
  | "budget:allocate"
  | "budget:request"
  | "budget:view"
  | "metrics:submit"
  | "metrics:view"
  | "hiring:create"
  | "hiring:approve"
  | "hiring:manage"
  | "employees:manage"
  | "employees:view"
  | "goals:create"
  | "goals:update"
  | "company:settings"
  | "reports:view"
  | "reports:generate"
  | "alerts:manage"
  | "import:run"
  | "departments:manage"
  | "kpis:manage"
  | "audit:view";

type Role = "CEO" | "DEPT_HEAD" | "EMPLOYEE";

// Legacy fallback map (for users without a customRole assigned)
const PERMISSION_MAP: Record<Permission, Role[]> = {
  "approvals:submit": ["CEO", "DEPT_HEAD"],
  "approvals:decide": ["CEO"],
  "approvals:decide:own_dept": ["CEO", "DEPT_HEAD"],
  "budget:allocate": ["CEO"],
  "budget:request": ["CEO", "DEPT_HEAD"],
  "budget:view": ["CEO", "DEPT_HEAD"],
  "metrics:submit": ["CEO", "DEPT_HEAD", "EMPLOYEE"],
  "metrics:view": ["CEO", "DEPT_HEAD", "EMPLOYEE"],
  "hiring:create": ["CEO", "DEPT_HEAD"],
  "hiring:approve": ["CEO"],
  "hiring:manage": ["CEO", "DEPT_HEAD"],
  "employees:manage": ["CEO", "DEPT_HEAD"],
  "employees:view": ["CEO", "DEPT_HEAD", "EMPLOYEE"],
  "goals:create": ["CEO", "DEPT_HEAD"],
  "goals:update": ["CEO", "DEPT_HEAD", "EMPLOYEE"],
  "company:settings": ["CEO"],
  "reports:view": ["CEO", "DEPT_HEAD"],
  "reports:generate": ["CEO", "DEPT_HEAD"],
  "alerts:manage": ["CEO"],
  "import:run": ["CEO", "DEPT_HEAD"],
  "departments:manage": ["CEO"],
  "kpis:manage": ["CEO"],
  "audit:view": ["CEO"],
};

export function hasPermission(
  role: string,
  permission: Permission,
  customRolePermissions?: string[]
): boolean {
  // CEO always has all permissions
  if (role === "CEO") return true;
  // Custom role: use its explicit permission list
  if (customRolePermissions && customRolePermissions.length > 0) {
    return customRolePermissions.includes(permission);
  }
  // Legacy fallback for DEPT_HEAD / EMPLOYEE without a custom role
  return PERMISSION_MAP[permission]?.includes(role as Role) ?? false;
}

export function requirePermission(
  role: string,
  permission: Permission,
  customRolePermissions?: string[]
): void {
  if (!hasPermission(role, permission, customRolePermissions)) {
    throw new Error(`Forbidden: requires ${permission}`);
  }
}

// Permissions that can be assigned to custom roles (CEO-only ones excluded)
export const ALL_ASSIGNABLE_PERMISSIONS: {
  key: Permission;
  label: string;
  section: string;
}[] = [
  // Metrics
  { key: "metrics:submit", label: "Submit Metrics", section: "Metrics" },
  { key: "metrics:view", label: "View Metrics", section: "Metrics" },
  // Approvals
  { key: "approvals:submit", label: "Submit Approval Requests", section: "Approvals" },
  { key: "approvals:decide:own_dept", label: "Decide Approvals (Own Dept)", section: "Approvals" },
  // Budget
  { key: "budget:view", label: "View Budget", section: "Budget" },
  { key: "budget:request", label: "Request Budget", section: "Budget" },
  // Hiring
  { key: "hiring:create", label: "Create Hiring Requests", section: "Hiring" },
  { key: "hiring:manage", label: "Manage Hiring Pipeline", section: "Hiring" },
  // Employees
  { key: "employees:view", label: "View Employees", section: "Employees" },
  { key: "employees:manage", label: "Manage Employees", section: "Employees" },
  // Goals
  { key: "goals:create", label: "Create Goals", section: "Goals" },
  { key: "goals:update", label: "Update Goal Progress", section: "Goals" },
  // Reports
  { key: "reports:view", label: "View Reports", section: "Reports" },
  { key: "reports:generate", label: "Generate Reports", section: "Reports" },
  // Data
  { key: "import:run", label: "Import Data", section: "Data" },
  { key: "alerts:manage", label: "Manage Alert Rules", section: "Data" },
];

// Default permission sets for the 3 system roles created on onboarding
export const DEFAULT_ROLE_PERMISSIONS = {
  DEPT_HEAD: [
    "metrics:submit", "metrics:view",
    "approvals:submit", "approvals:decide:own_dept",
    "budget:view", "budget:request",
    "hiring:create", "hiring:manage",
    "employees:view", "employees:manage",
    "goals:create", "goals:update",
    "reports:view", "reports:generate",
    "import:run",
  ] as Permission[],
  EMPLOYEE: [
    "metrics:submit", "metrics:view",
    "goals:update",
    "employees:view",
  ] as Permission[],
  READ_ONLY: [
    "metrics:view",
    "employees:view",
    "reports:view",
  ] as Permission[],
};
