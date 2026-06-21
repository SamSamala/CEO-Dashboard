export type DiagnosticSeverity = "CRITICAL" | "WARNING" | "NONE";
export type DiagnosticTrend = "IMPROVING" | "STABLE" | "WORSENING";

export interface TriggerMetric {
  kpiKey: string;
  kpiLabel: string;
  actual: number;
  target: number;
  pctOfTarget: number;
  trend: DiagnosticTrend;
  changeFromPrior: number;
}

export interface DepartmentDiagnostic {
  departmentId: string;
  departmentName: string;
  departmentSlug: string;
  bottleneckType: string;
  severity: DiagnosticSeverity;
  triggerMetrics: TriggerMetric[];
  kpisBelow: number;
  totalKpis: number;
  affectedDownstreamSlugs: string[];
  businessImpact: string;
  investigationArea: string;
}

export interface ProductivityMetrics {
  revenuePerEmployee: number;
  profitPerEmployee: number;
  totalRevenue: number;
  totalEmployees: number;
  burnRate: number;
}

export interface DeptAttention {
  departmentId: string;
  departmentName: string;
  severity: DiagnosticSeverity;
  kpisBelow: number;
}

export interface GoalBrief {
  id: string;
  title: string;
  progressPct: number;
  daysRemaining: number;
  departmentName: string | null;
}

export interface TeamCapacity {
  departmentId: string;
  departmentName: string;
  stressedKpisCount: number;
  totalKpis: number;
}

export interface DecliningKpi {
  kpiLabel: string;
  departmentName: string;
  changeFromPrior: number;
  pctOfTarget: number;
}

export interface AlertBrief {
  id: string;
  title: string;
  message: string;
}

export interface ExecPanel {
  topBottlenecks: DepartmentDiagnostic[];
  topRisks: DepartmentDiagnostic[];
  topOpportunities: DepartmentDiagnostic[];
  deptsRequiringAttention: DeptAttention[];
  projectsBehindSchedule: GoalBrief[];
  teamsAtCapacity: TeamCapacity[];
  decliningKpis: DecliningKpi[];
  criticalAlerts: AlertBrief[];
}

export interface BottleneckDiagnosticsResult {
  departmentDiagnostics: DepartmentDiagnostic[];
  productivityMetrics: ProductivityMetrics;
  execPanel: ExecPanel | null;
}
