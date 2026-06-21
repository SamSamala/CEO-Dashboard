export type BottleneckSeverity = "NONE" | "WARNING" | "CRITICAL";
export type BottleneckTrend = "IMPROVING" | "STABLE" | "WORSENING";

export interface BottleneckResult {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  kpiKey: string;
  kpiLabel: string;
  severity: BottleneckSeverity;
  severityScore: number;
  actualValue: number;
  expectedValue: number;
  trend: BottleneckTrend;
  investigationArea: string | null;
  linkedDeptId: string | null;
  estimatedRevenueImpact: number | null;
  isPrimaryConstraint: boolean;
  detectedAt: Date;
}
