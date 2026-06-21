export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: ("CEO" | "DEPT_HEAD" | "EMPLOYEE")[];
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "LayoutDashboard",
        roles: ["CEO"],
      },
      {
        label: "Departments",
        href: "/departments",
        icon: "Building2",
        roles: ["CEO", "DEPT_HEAD"],
      },
      {
        label: "My Department",
        href: "/departments",
        icon: "Building2",
        roles: ["EMPLOYEE"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Approvals",
        href: "/approvals",
        icon: "CheckCircle",
        roles: ["CEO", "DEPT_HEAD"],
        badge: "pending",
      },
      {
        label: "Budget",
        href: "/budget",
        icon: "PieChart",
        roles: ["CEO"],
      },
      {
        label: "Spending",
        href: "/spending",
        icon: "CreditCard",
        roles: ["CEO", "DEPT_HEAD"],
      },
      {
        label: "Hiring",
        href: "/hiring",
        icon: "UserPlus",
        roles: ["CEO", "DEPT_HEAD"],
      },
      {
        label: "Employees",
        href: "/employees",
        icon: "Users",
        roles: ["CEO", "DEPT_HEAD"],
      },
    ],
  },
  {
    title: "Strategy",
    items: [
      {
        label: "Bottleneck Center",
        href: "/bottlenecks",
        icon: "Gauge",
        roles: ["CEO", "DEPT_HEAD", "EMPLOYEE"],
        badge: "bottlenecks",
      },
      {
        label: "Goals",
        href: "/goals",
        icon: "Target",
        roles: ["CEO", "DEPT_HEAD", "EMPLOYEE"],
      },
      {
        label: "Alerts",
        href: "/alerts",
        icon: "Bell",
        roles: ["CEO"],
        badge: "alerts",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: "FileText",
        roles: ["CEO", "DEPT_HEAD"],
      },
      {
        label: "Data Import",
        href: "/import",
        icon: "Upload",
        roles: ["CEO", "DEPT_HEAD"],
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        label: "Settings",
        href: "/settings",
        icon: "Settings",
        roles: ["CEO"],
      },
      {
        label: "Roles & Permissions",
        href: "/settings/roles",
        icon: "Shield",
        roles: ["CEO"],
      },
      {
        label: "Audit Log",
        href: "/settings/audit",
        icon: "FileText",
        roles: ["CEO"],
      },
    ],
  },
];
