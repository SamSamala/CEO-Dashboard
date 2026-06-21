export interface HealthScore {
  score: number;
  breakdown: {
    revenue: number;
    departments: number;
    runway: number;
    goals: number;
    bottlenecks: number;
  };
}

export interface ActionItem {
  id: string;
  type:
    | "PENDING_APPROVAL"
    | "BOTTLENECK"
    | "RUNWAY"
    | "BUDGET"
    | "HIRING"
    | "GOAL"
    | "METRICS"
    | "BUDGET_OVERRUN"
    | "HIRING_STALLED"
    | "GOAL_DEADLINE"
    | "TEAM_RISK"
    | "APPROVAL_ESCALATION"
    | "DATA_MISSING";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  href: string;
  ageHours?: number;
}

export interface KpiWidget {
  label: string;
  value: number;
  formatted: string;
  trend: "up" | "down" | "flat";
  trendValue: string;
  status: "green" | "orange" | "red";
}

export interface DeptHealthScore {
  departmentId: string;
  departmentSlug: string;
  departmentName: string;
  colorHex: string;
  performanceScore: number;
  efficiencyScore: number;
  trendScore: number;
  riskScore: number;
  dataConfidenceScore: number;
  goalCompletion: number;
  budgetUtilization: number | null;
  status: "green" | "orange" | "red" | "gray";
  bottleneckCount: number;
}
