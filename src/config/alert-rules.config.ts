export const BUILT_IN_ALERT_RULES = [
  {
    name: "Budget Exceeded",
    ruleType: "BUDGET_EXCEEDED",
    description: "Fires when any department exceeds their allocated budget",
    threshold: 1.0,
    thresholdUnit: "ratio",
  },
  {
    name: "Revenue Drop",
    ruleType: "REVENUE_DROP",
    description: "Fires when weekly revenue drops more than 20% vs prior week",
    threshold: 20,
    thresholdUnit: "percentage",
  },
  {
    name: "Low Cash Runway",
    ruleType: "RUNWAY_LOW",
    description: "Fires when cash runway falls below 60 days",
    threshold: 60,
    thresholdUnit: "days",
  },
  {
    name: "Hiring Delay",
    ruleType: "HIRING_DELAY",
    description: "Fires when an active hiring request has no activity for 14 days",
    threshold: 14,
    thresholdUnit: "days",
  },
  {
    name: "Approval Backlog",
    ruleType: "APPROVAL_BACKLOG",
    description: "Fires when there are more than 5 pending approvals",
    threshold: 5,
    thresholdUnit: "count",
  },
  {
    name: "Department Bottleneck",
    ruleType: "DEPT_BOTTLENECK",
    description: "Fires when a department is detected as a critical bottleneck",
    threshold: 0,
    thresholdUnit: "count",
  },
  {
    name: "Low Department Productivity",
    ruleType: "LOW_PRODUCTIVITY",
    description:
      "Fires when a department's performance score is below 50% for 3 consecutive days",
    threshold: 50,
    thresholdUnit: "percentage",
  },
] as const;

export type AlertRuleType =
  | "BUDGET_EXCEEDED"
  | "REVENUE_DROP"
  | "RUNWAY_LOW"
  | "HIRING_DELAY"
  | "APPROVAL_BACKLOG"
  | "DEPT_BOTTLENECK"
  | "LOW_PRODUCTIVITY";
