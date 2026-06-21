"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/config/nav.config";
import {
  LayoutDashboard, Building2, CheckCircle, PieChart, CreditCard,
  UserPlus, Users, Target, Bell, FileText, Upload, Settings, Gauge,
  PanelLeftClose, PanelLeftOpen, MessageSquare, Network,
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Building2, CheckCircle, PieChart, CreditCard,
  UserPlus, Users, Target, Bell, FileText, Upload, Settings, Gauge, MessageSquare, Network,
};

interface AppSidebarProps {
  role: string;
  pendingApprovals?: number;
  activeAlerts?: number;
  activeBottlenecks?: number;
  unreadMessages?: number;
}

export function AppSidebar({ role, pendingApprovals = 0, activeAlerts = 0, activeBottlenecks = 0, unreadMessages = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const badgeCounts: Record<string, number> = {
    pending: pendingApprovals,
    alerts: activeAlerts,
    bottlenecks: activeBottlenecks,
    messages: unreadMessages,
  };

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.roles.includes(role as "CEO" | "DEPT_HEAD" | "EMPLOYEE")
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar h-screen transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-14 border-b px-4 shrink-0", collapsed && "justify-center px-0")}>
        <Link
          href={role === "CEO" ? "/dashboard" : "/departments"}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0">
            OS
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm truncate">CEO Operating System</span>
          )}
        </Link>
      </div>

      {/* Nav — scrollable but no visible scrollbar */}
      <nav
        className="flex-1 py-4 px-2 space-y-4 overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {visibleSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICON_MAP[item.icon] ?? Settings;
                const href = item.href === "/dashboard" && role !== "CEO"
                  ? "/departments"
                  : item.href;
                const isActive = pathname === href || pathname.startsWith(href + "/");
                const badgeCount = item.badge ? badgeCounts[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                            {badgeCount > 9 ? "9+" : badgeCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse button — clean, fixed at bottom */}
      <div className="shrink-0 border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
            : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="text-xs">Collapse</span>
              </>
            )
          }
        </button>
      </div>
    </aside>
  );
}
