import type { DeptConfig } from "@/types/department.types";

export interface TemplateRelationship {
  fromSlug: string;
  toSlug: string;
  fromKpiKey: string;
  toKpiKey: string;
}

export interface IndustryTemplate {
  id: string;
  label: string;
  description: string;
  departments: DeptConfig[];
  relationships: TemplateRelationship[];
  defaultAlertRules?: { ruleType: string; name: string; description: string; threshold?: number; thresholdUnit?: string }[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  // ── SaaS ──────────────────────────────────────────────────────────────────
  {
    id: "SAAS",
    label: "SaaS",
    description: "Software-as-a-Service: Growth, Sales, Product, Engineering, Customer Success, Finance, HR",
    relationships: [
      { fromSlug: "growth", toSlug: "sales", fromKpiKey: "mqls", toKpiKey: "sql_capacity" },
      { fromSlug: "sales", toSlug: "customer_success", fromKpiKey: "deals_closed", toKpiKey: "onboarding_capacity" },
    ],
    departments: [
      {
        slug: "growth",
        name: "Growth",
        colorHex: "#8b5cf6",
        icon: "TrendingUp",
        kpis: [
          { key: "mqls", label: "MQLs Generated", unit: "count", defaultTarget: 200, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.4, isBottleneckKpi: true, linkedTo: { dept: "sales", kpi: "sql_capacity" }, aggregation: "sum", inputType: "number", description: "Marketing Qualified Leads" },
          { key: "campaign_spend", label: "Campaign Spend", unit: "currency", defaultTarget: 30000, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "cac", label: "Customer Acquisition Cost", unit: "currency", defaultTarget: 500, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: false, aggregation: "avg", inputType: "currency" },
          { key: "website_signups", label: "Website Signups", unit: "count", defaultTarget: 500, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
        ],
      },
      {
        slug: "sales",
        name: "Sales",
        colorHex: "#10b981",
        icon: "DollarSign",
        kpis: [
          { key: "sql_capacity", label: "SQL Processing Capacity", unit: "count", defaultTarget: 150, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.15, isBottleneckKpi: true, aggregation: "sum", inputType: "number", description: "Sales Qualified Leads capacity per day" },
          { key: "demos_booked", label: "Demos Booked", unit: "count", defaultTarget: 20, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "deals_closed", label: "Deals Closed", unit: "count", defaultTarget: 8, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.3, isBottleneckKpi: true, linkedTo: { dept: "customer_success", kpi: "onboarding_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "mrr_added", label: "New MRR", unit: "currency", defaultTarget: 20000, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "currency", description: "Monthly Recurring Revenue added" },
          { key: "pipeline_value", label: "Pipeline Value", unit: "currency", defaultTarget: 300000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.05, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
        ],
      },
      {
        slug: "product",
        name: "Product",
        colorHex: "#ec4899",
        icon: "Package",
        kpis: [
          { key: "features_shipped", label: "Features Shipped", unit: "count", defaultTarget: 4, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.35, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "bugs_closed", label: "Bugs Closed", unit: "count", defaultTarget: 15, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.25, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "sprint_completion", label: "Sprint Completion Rate", unit: "percentage", defaultTarget: 85, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.25, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "nps_score", label: "NPS Score", unit: "count", defaultTarget: 50, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.15, isBottleneckKpi: false, aggregation: "last", inputType: "number" },
        ],
      },
      {
        slug: "engineering",
        name: "Engineering",
        colorHex: "#6366f1",
        icon: "Code",
        kpis: [
          { key: "deploys_per_week", label: "Deploys per Week", unit: "count", defaultTarget: 5, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.3, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "uptime_pct", label: "System Uptime", unit: "percentage", defaultTarget: 99.9, warningThreshold: 0.9, criticalThreshold: 0.8, weight: 0.35, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "p95_latency_ms", label: "P95 Latency (ms)", unit: "count", defaultTarget: 200, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "open_incidents", label: "Open Incidents", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
        ],
      },
      {
        slug: "customer_success",
        name: "Customer Success",
        colorHex: "#14b8a6",
        icon: "HeartHandshake",
        kpis: [
          { key: "onboarding_capacity", label: "Onboarding Capacity", unit: "count", defaultTarget: 30, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "churn_rate", label: "Monthly Churn Rate", unit: "percentage", defaultTarget: 2, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.35, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "csat_score", label: "CSAT Score", unit: "percentage", defaultTarget: 90, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "mrr_expansion", label: "MRR Expansion", unit: "currency", defaultTarget: 5000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.15, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
        ],
      },
      {
        slug: "finance",
        name: "Finance",
        colorHex: "#ef4444",
        icon: "DollarSign",
        kpis: [
          { key: "mrr", label: "Monthly Recurring Revenue", unit: "currency", defaultTarget: 100000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "cash_balance", label: "Cash Balance", unit: "currency", defaultTarget: 1000000, warningThreshold: 0.5, criticalThreshold: 0.25, weight: 0.3, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "burn_rate", label: "Monthly Burn Rate", unit: "currency", defaultTarget: 80000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "arr_growth", label: "ARR Growth %", unit: "percentage", defaultTarget: 10, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.15, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "hr",
        name: "HR & People",
        colorHex: "#f59e0b",
        icon: "Users",
        kpis: [
          { key: "open_roles", label: "Open Roles", unit: "count", defaultTarget: 3, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.3, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "time_to_hire", label: "Avg. Time to Hire (days)", unit: "days", defaultTarget: 30, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "employee_nps", label: "Employee NPS", unit: "count", defaultTarget: 40, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.25, isBottleneckKpi: false, aggregation: "last", inputType: "number" },
          { key: "attrition_rate", label: "Monthly Attrition %", unit: "percentage", defaultTarget: 1, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
    ],
  },

  // ── Agency ────────────────────────────────────────────────────────────────
  {
    id: "AGENCY",
    label: "Agency",
    description: "Creative/Digital Agency: Client Success, Creative, Media, Production, Finance, HR",
    relationships: [
      { fromSlug: "business_development", toSlug: "creative", fromKpiKey: "briefs_received", toKpiKey: "creative_capacity" },
      { fromSlug: "creative", toSlug: "production", fromKpiKey: "concepts_approved", toKpiKey: "production_capacity" },
    ],
    departments: [
      {
        slug: "business_development",
        name: "Business Development",
        colorHex: "#8b5cf6",
        icon: "Briefcase",
        kpis: [
          { key: "proposals_sent", label: "Proposals Sent", unit: "count", defaultTarget: 5, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.3, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "briefs_received", label: "Briefs Received", unit: "count", defaultTarget: 8, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.35, isBottleneckKpi: true, linkedTo: { dept: "creative", kpi: "creative_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "win_rate", label: "Proposal Win Rate", unit: "percentage", defaultTarget: 40, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.25, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "pipeline_value", label: "Pipeline Value", unit: "currency", defaultTarget: 200000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.1, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
        ],
      },
      {
        slug: "creative",
        name: "Creative",
        colorHex: "#ec4899",
        icon: "Palette",
        kpis: [
          { key: "creative_capacity", label: "Creative Capacity (briefs)", unit: "count", defaultTarget: 10, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "concepts_approved", label: "Concepts Approved", unit: "count", defaultTarget: 6, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.35, isBottleneckKpi: true, linkedTo: { dept: "production", kpi: "production_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "revisions_avg", label: "Avg. Revision Rounds", unit: "count", defaultTarget: 2, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.25, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "on_brief_rate", label: "On-Brief Rate", unit: "percentage", defaultTarget: 85, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "media_buying",
        name: "Media Buying",
        colorHex: "#3b82f6",
        icon: "BarChart2",
        kpis: [
          { key: "media_spend", label: "Total Media Spend", unit: "currency", defaultTarget: 100000, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "roas", label: "Return on Ad Spend", unit: "count", defaultTarget: 4, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.4, isBottleneckKpi: true, aggregation: "avg", inputType: "number", description: "ROAS (e.g. 4 = 4x)" },
          { key: "impressions", label: "Total Impressions", unit: "count", defaultTarget: 500000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "cpc", label: "Avg. Cost Per Click", unit: "currency", defaultTarget: 2, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: false, aggregation: "avg", inputType: "currency" },
        ],
      },
      {
        slug: "production",
        name: "Production",
        colorHex: "#10b981",
        icon: "Film",
        kpis: [
          { key: "production_capacity", label: "Production Capacity", unit: "count", defaultTarget: 8, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "deliverables_completed", label: "Deliverables Completed", unit: "count", defaultTarget: 6, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "on_time_rate", label: "On-Time Delivery Rate", unit: "percentage", defaultTarget: 90, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.3, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "quality_score", label: "Quality Score", unit: "percentage", defaultTarget: 90, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.15, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "finance",
        name: "Finance",
        colorHex: "#ef4444",
        icon: "DollarSign",
        kpis: [
          { key: "monthly_revenue", label: "Monthly Revenue", unit: "currency", defaultTarget: 200000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "gross_margin", label: "Gross Margin %", unit: "percentage", defaultTarget: 55, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "cash_balance", label: "Cash Balance", unit: "currency", defaultTarget: 300000, warningThreshold: 0.5, criticalThreshold: 0.25, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "overdue_invoices", label: "Overdue Invoices ($)", unit: "currency", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: true, aggregation: "last", inputType: "currency" },
        ],
      },
      {
        slug: "hr",
        name: "HR",
        colorHex: "#f59e0b",
        icon: "Users",
        kpis: [
          { key: "billable_utilization", label: "Billable Utilization %", unit: "percentage", defaultTarget: 75, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.4, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "open_roles", label: "Open Roles", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.3, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "employee_sat", label: "Employee Satisfaction", unit: "percentage", defaultTarget: 80, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
    ],
  },

  // ── Ecommerce ──────────────────────────────────────────────────────────────
  {
    id: "ECOMMERCE",
    label: "Ecommerce",
    description: "Online Retail: Marketing, Merchandising, Operations, Customer Support, Finance, HR",
    relationships: [
      { fromSlug: "marketing", toSlug: "operations", fromKpiKey: "orders_driven", toKpiKey: "fulfillment_capacity" },
    ],
    departments: [
      {
        slug: "marketing",
        name: "Marketing",
        colorHex: "#8b5cf6",
        icon: "Megaphone",
        kpis: [
          { key: "orders_driven", label: "Orders Driven", unit: "count", defaultTarget: 500, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.35, isBottleneckKpi: true, linkedTo: { dept: "operations", kpi: "fulfillment_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "roas", label: "Return on Ad Spend", unit: "count", defaultTarget: 5, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "ad_spend", label: "Ad Spend", unit: "currency", defaultTarget: 20000, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "email_revenue", label: "Email Revenue", unit: "currency", defaultTarget: 15000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.2, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
        ],
      },
      {
        slug: "merchandising",
        name: "Merchandising",
        colorHex: "#ec4899",
        icon: "ShoppingBag",
        kpis: [
          { key: "new_skus_listed", label: "New SKUs Listed", unit: "count", defaultTarget: 20, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "avg_order_value", label: "Avg. Order Value", unit: "currency", defaultTarget: 75, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "avg", inputType: "currency" },
          { key: "inventory_turnover", label: "Inventory Turnover", unit: "count", defaultTarget: 4, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.2, isBottleneckKpi: true, aggregation: "avg", inputType: "number" },
          { key: "stockout_rate", label: "Stockout Rate %", unit: "percentage", defaultTarget: 2, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "operations",
        name: "Fulfillment & Ops",
        colorHex: "#3b82f6",
        icon: "Truck",
        kpis: [
          { key: "fulfillment_capacity", label: "Daily Fulfillment Capacity", unit: "count", defaultTarget: 600, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "orders_shipped", label: "Orders Shipped", unit: "count", defaultTarget: 500, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "on_time_ship_rate", label: "On-Time Ship Rate %", unit: "percentage", defaultTarget: 95, warningThreshold: 0.85, criticalThreshold: 0.7, weight: 0.3, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "return_rate", label: "Return Rate %", unit: "percentage", defaultTarget: 5, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.2, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "customer_support",
        name: "Customer Support",
        colorHex: "#14b8a6",
        icon: "HeadphonesIcon",
        kpis: [
          { key: "tickets_resolved", label: "Tickets Resolved", unit: "count", defaultTarget: 100, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "first_response_hrs", label: "First Response (hrs)", unit: "hours", defaultTarget: 4, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: true, aggregation: "avg", inputType: "number" },
          { key: "csat_score", label: "CSAT Score", unit: "percentage", defaultTarget: 90, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "refund_rate", label: "Refund Rate %", unit: "percentage", defaultTarget: 3, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.1, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "finance",
        name: "Finance",
        colorHex: "#ef4444",
        icon: "DollarSign",
        kpis: [
          { key: "gross_revenue", label: "Gross Revenue", unit: "currency", defaultTarget: 500000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "gross_margin", label: "Gross Margin %", unit: "percentage", defaultTarget: 45, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "cash_balance", label: "Cash Balance", unit: "currency", defaultTarget: 500000, warningThreshold: 0.5, criticalThreshold: 0.25, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "cogs", label: "Cost of Goods Sold", unit: "currency", defaultTarget: 275000, warningThreshold: 0.8, criticalThreshold: 0.9, weight: 0.15, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
        ],
      },
      {
        slug: "hr",
        name: "HR",
        colorHex: "#f59e0b",
        icon: "Users",
        kpis: [
          { key: "open_roles", label: "Open Roles", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.4, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "new_hires", label: "New Hires", unit: "count", defaultTarget: 1, warningThreshold: 0.5, criticalThreshold: 0.0, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "attrition_rate", label: "Monthly Attrition %", unit: "percentage", defaultTarget: 2, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
    ],
  },

  // ── Manufacturing ──────────────────────────────────────────────────────────
  {
    id: "MANUFACTURING",
    label: "Manufacturing",
    description: "Production, Quality Control, Supply Chain, Maintenance, Finance, HR",
    relationships: [
      { fromSlug: "supply_chain", toSlug: "production", fromKpiKey: "materials_available", toKpiKey: "production_capacity" },
      { fromSlug: "production", toSlug: "quality_control", fromKpiKey: "units_produced", toKpiKey: "qc_capacity" },
    ],
    departments: [
      {
        slug: "production",
        name: "Production",
        colorHex: "#3b82f6",
        icon: "Factory",
        kpis: [
          { key: "production_capacity", label: "Daily Production Capacity", unit: "count", defaultTarget: 1000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "units_produced", label: "Units Produced", unit: "count", defaultTarget: 950, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.35, isBottleneckKpi: true, linkedTo: { dept: "quality_control", kpi: "qc_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "oee", label: "OEE %", unit: "percentage", defaultTarget: 85, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage", description: "Overall Equipment Effectiveness" },
          { key: "downtime_hrs", label: "Unplanned Downtime (hrs)", unit: "hours", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.15, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
        ],
      },
      {
        slug: "quality_control",
        name: "Quality Control",
        colorHex: "#10b981",
        icon: "CheckSquare",
        kpis: [
          { key: "qc_capacity", label: "QC Capacity (units)", unit: "count", defaultTarget: 950, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "defect_rate", label: "Defect Rate %", unit: "percentage", defaultTarget: 0.5, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.4, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "first_pass_yield", label: "First Pass Yield %", unit: "percentage", defaultTarget: 97, warningThreshold: 0.85, criticalThreshold: 0.7, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "rework_units", label: "Units Reworked", unit: "count", defaultTarget: 10, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.1, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
        ],
      },
      {
        slug: "supply_chain",
        name: "Supply Chain",
        colorHex: "#8b5cf6",
        icon: "Package",
        kpis: [
          { key: "materials_available", label: "Materials Available (days)", unit: "days", defaultTarget: 14, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.4, isBottleneckKpi: true, linkedTo: { dept: "production", kpi: "production_capacity" }, aggregation: "last", inputType: "number", description: "Days of materials inventory on hand" },
          { key: "supplier_otd", label: "Supplier On-Time Delivery %", unit: "percentage", defaultTarget: 95, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.3, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "inventory_value", label: "Inventory Value", unit: "currency", defaultTarget: 500000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "po_lead_time", label: "PO Lead Time (days)", unit: "days", defaultTarget: 7, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.1, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
        ],
      },
      {
        slug: "maintenance",
        name: "Maintenance",
        colorHex: "#f59e0b",
        icon: "Wrench",
        kpis: [
          { key: "pm_completion", label: "Preventive Maintenance %", unit: "percentage", defaultTarget: 95, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.4, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "mean_time_to_repair", label: "Mean Time to Repair (hrs)", unit: "hours", defaultTarget: 2, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "equipment_availability", label: "Equipment Availability %", unit: "percentage", defaultTarget: 98, warningThreshold: 0.9, criticalThreshold: 0.8, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "finance",
        name: "Finance",
        colorHex: "#ef4444",
        icon: "DollarSign",
        kpis: [
          { key: "monthly_revenue", label: "Monthly Revenue", unit: "currency", defaultTarget: 2000000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "cogs", label: "Cost of Goods Sold", unit: "currency", defaultTarget: 1400000, warningThreshold: 0.8, criticalThreshold: 0.9, weight: 0.25, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "cash_balance", label: "Cash Balance", unit: "currency", defaultTarget: 1000000, warningThreshold: 0.5, criticalThreshold: 0.25, weight: 0.25, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "burn_rate", label: "Monthly Burn Rate", unit: "currency", defaultTarget: 150000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.15, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
        ],
      },
      {
        slug: "hr",
        name: "HR",
        colorHex: "#64748b",
        icon: "Users",
        kpis: [
          { key: "open_positions", label: "Open Positions", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.4, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "safety_incidents", label: "Safety Incidents", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.35, isBottleneckKpi: true, aggregation: "sum", inputType: "number" },
          { key: "training_completion", label: "Training Completion %", unit: "percentage", defaultTarget: 90, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.25, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
    ],
  },

  // ── Consulting ─────────────────────────────────────────────────────────────
  {
    id: "CONSULTING",
    label: "Consulting",
    description: "Professional Services: Business Development, Delivery, Finance, HR, Operations",
    relationships: [
      { fromSlug: "business_development", toSlug: "delivery", fromKpiKey: "engagements_signed", toKpiKey: "delivery_capacity" },
    ],
    departments: [
      {
        slug: "business_development",
        name: "Business Development",
        colorHex: "#8b5cf6",
        icon: "Briefcase",
        kpis: [
          { key: "proposals_sent", label: "Proposals Sent", unit: "count", defaultTarget: 3, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "engagements_signed", label: "Engagements Signed", unit: "count", defaultTarget: 2, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.4, isBottleneckKpi: true, linkedTo: { dept: "delivery", kpi: "delivery_capacity" }, aggregation: "sum", inputType: "number" },
          { key: "pipeline_value", label: "Pipeline Value", unit: "currency", defaultTarget: 500000, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "win_rate", label: "Win Rate %", unit: "percentage", defaultTarget: 35, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.1, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "delivery",
        name: "Delivery",
        colorHex: "#10b981",
        icon: "CheckCircle",
        kpis: [
          { key: "delivery_capacity", label: "Active Project Capacity", unit: "count", defaultTarget: 10, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.2, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "billable_hours", label: "Billable Hours", unit: "count", defaultTarget: 400, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "utilization_rate", label: "Consultant Utilization %", unit: "percentage", defaultTarget: 75, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: true, aggregation: "avg", inputType: "percentage" },
          { key: "csat_score", label: "Client Satisfaction", unit: "percentage", defaultTarget: 90, warningThreshold: 0.8, criticalThreshold: 0.6, weight: 0.15, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "finance",
        name: "Finance",
        colorHex: "#ef4444",
        icon: "DollarSign",
        kpis: [
          { key: "monthly_revenue", label: "Monthly Revenue", unit: "currency", defaultTarget: 300000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "gross_margin", label: "Gross Margin %", unit: "percentage", defaultTarget: 45, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
          { key: "cash_balance", label: "Cash Balance", unit: "currency", defaultTarget: 500000, warningThreshold: 0.5, criticalThreshold: 0.25, weight: 0.2, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
          { key: "burn_rate", label: "Monthly Burn Rate", unit: "currency", defaultTarget: 100000, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.15, isBottleneckKpi: false, aggregation: "last", inputType: "currency" },
        ],
      },
      {
        slug: "hr",
        name: "HR",
        colorHex: "#f59e0b",
        icon: "Users",
        kpis: [
          { key: "open_roles", label: "Open Roles", unit: "count", defaultTarget: 0, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.4, isBottleneckKpi: true, aggregation: "last", inputType: "number" },
          { key: "time_to_hire", label: "Avg. Time to Hire (days)", unit: "days", defaultTarget: 45, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "number" },
          { key: "attrition_rate", label: "Quarterly Attrition %", unit: "percentage", defaultTarget: 5, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.3, isBottleneckKpi: false, aggregation: "avg", inputType: "percentage" },
        ],
      },
      {
        slug: "operations",
        name: "Operations",
        colorHex: "#3b82f6",
        icon: "Settings",
        kpis: [
          { key: "tools_utilization", label: "Tools & Tech Cost", unit: "currency", defaultTarget: 10000, warningThreshold: 0.8, criticalThreshold: 0.9, weight: 0.3, isBottleneckKpi: false, aggregation: "sum", inputType: "currency" },
          { key: "knowledge_articles", label: "Knowledge Articles Published", unit: "count", defaultTarget: 5, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
          { key: "process_improvements", label: "Process Improvements", unit: "count", defaultTarget: 2, warningThreshold: 0.5, criticalThreshold: 0.2, weight: 0.35, isBottleneckKpi: false, aggregation: "sum", inputType: "number" },
        ],
      },
    ],
  },

  // ── Custom ─────────────────────────────────────────────────────────────────
  {
    id: "CUSTOM",
    label: "Custom",
    description: "Start from scratch. Add your own departments and define your own KPIs.",
    relationships: [],
    departments: [],
  },
];

export function getTemplate(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}
