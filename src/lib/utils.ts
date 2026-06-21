import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfMonth, startOfQuarter, getYear, getMonth, getQuarter } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Returns period key strings like "2025-06", "2025-Q2", "2025" */
export function computePeriodKey(
  date: Date,
  period: "monthly" | "quarterly" | "annual"
): string {
  const year = getYear(date);
  if (period === "monthly") {
    return `${year}-${String(getMonth(date) + 1).padStart(2, "0")}`;
  }
  if (period === "quarterly") {
    return `${year}-Q${getQuarter(date)}`;
  }
  return String(year);
}

export function getCurrentPeriodKey(period: "monthly" | "quarterly" | "annual"): string {
  return computePeriodKey(new Date(), period);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getStatusColor(status: "green" | "orange" | "red"): string {
  return {
    green: "text-emerald-600",
    orange: "text-amber-500",
    red: "text-red-500",
  }[status];
}

export function getStatusBg(status: "green" | "orange" | "red"): string {
  return {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  }[status];
}

export function scoreToStatus(
  score: number
): "green" | "orange" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "orange";
  return "red";
}
