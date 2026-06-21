export interface KpiField {
  key: string;
  label: string;
  unit: "count" | "currency" | "percentage" | "hours" | "days";
  defaultTarget: number;
  warningThreshold: number;
  criticalThreshold: number;
  weight: number;
  isBottleneckKpi: boolean;
  linkedTo?: { dept: string; kpi: string };
  aggregation: "sum" | "avg" | "last";
  inputType?: "number" | "currency" | "percentage";
  description?: string;
}

export interface DeptConfig {
  slug: string;
  name: string;
  colorHex: string;
  icon: string;
  kpis: KpiField[];
}

export interface KpiResult {
  key: string;
  label: string;
  unit: string;
  actual: number;
  target: number;
  achievement: number;
  status: "green" | "orange" | "red";
  trend: "up" | "down" | "flat";
  trendValue: string;
}

export interface DeptScorecard {
  departmentId: string;
  date: string;
  kpis: KpiResult[];
  performanceScore: number;
  trendScore: number;
  riskScore: number;
  dataConfidenceScore: number;
  status: "green" | "orange" | "red" | "gray";
}

export interface MetricDataPoint {
  date: string;
  [key: string]: number | string;
}
