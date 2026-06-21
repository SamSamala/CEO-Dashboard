"use server";

import { authActionClient } from "@/lib/safe-action";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getTemplate } from "@/config/industry-templates.config";
import { BUILT_IN_ALERT_RULES } from "@/config/alert-rules.config";
import { logAudit } from "@/lib/audit.helper";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { getDeptConfig } from "@/config/departments.config";

const updateCompanyDetailsSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  currency: z.string().default("USD"),
  timezone: z.string().default("America/New_York"),
  fiscalYearEnd: z.number().min(1).max(12).default(12),
});

export const updateCompanyDetails = authActionClient
  .metadata({ actionName: "updateCompanyDetails" })
  .schema(updateCompanyDetailsSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "company:settings");

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: {
        name: parsedInput.name,
        industry: parsedInput.industry,
        currency: parsedInput.currency,
        timezone: parsedInput.timezone,
        fiscalYearEnd: parsedInput.fiscalYearEnd,
      },
    });

    return { success: true };
  });

const departmentCustomizationSchema = z.object({
  slug: z.string(),
  name: z.string(),
  colorHex: z.string().optional(),
  enabled: z.boolean().default(true),
  kpiOverrides: z.record(z.string(), z.object({
    label: z.string().optional(),
    targetValue: z.number().optional(),
  })).optional(),
});

const applyTemplateSchema = z.object({
  templateId: z.string(),
  departments: z.array(departmentCustomizationSchema),
});

export const applyTemplate = authActionClient
  .metadata({ actionName: "applyTemplate" })
  .schema(applyTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "company:settings");

    const template = getTemplate(parsedInput.templateId);
    if (!template && parsedInput.templateId !== "CUSTOM") {
      throw new Error("Template not found");
    }

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      include: { departments: true },
    });
    if (!company) throw new Error("Company not found");

    // Don't re-apply if already onboarded
    if (company.onboardingCompleted && company.departments.length > 0) {
      throw new Error("Onboarding already completed. Use settings to manage departments.");
    }

    const templateDepts = template?.departments ?? [];
    const enabledSlugs = new Set(
      parsedInput.departments.filter((d) => d.enabled).map((d) => d.slug)
    );

    await prisma.$transaction(async (tx) => {
      const createdDeptMap = new Map<string, string>(); // slug → id

      let order = 0;
      for (const deptCfg of templateDepts) {
        if (!enabledSlugs.has(deptCfg.slug)) continue;

        const override = parsedInput.departments.find((d) => d.slug === deptCfg.slug);

        const dept = await tx.department.create({
          data: {
            companyId: ctx.companyId,
            slug: deptCfg.slug,
            name: override?.name ?? deptCfg.name,
            colorHex: override?.colorHex ?? deptCfg.colorHex,
            sortOrder: order++,
          },
        });
        createdDeptMap.set(deptCfg.slug, dept.id);

        // Create KPI configs
        await tx.kpiConfig.createMany({
          data: deptCfg.kpis.map((kpi) => {
            const kpiOverride = override?.kpiOverrides?.[kpi.key];
            return {
              companyId: ctx.companyId,
              departmentId: dept.id,
              key: kpi.key,
              label: kpiOverride?.label ?? kpi.label,
              unit: kpi.unit,
              targetValue: kpiOverride?.targetValue ?? kpi.defaultTarget,
              warningThreshold: kpi.warningThreshold,
              criticalThreshold: kpi.criticalThreshold,
              weight: kpi.weight,
              isBottleneckKpi: kpi.isBottleneckKpi,
              aggregation: kpi.aggregation,
            };
          }),
        });
      }

      // Create department relationships
      if (template) {
        for (const rel of template.relationships) {
          const fromId = createdDeptMap.get(rel.fromSlug);
          const toId = createdDeptMap.get(rel.toSlug);
          if (fromId && toId) {
            // Resolve linkedKpiId for the fromKpiKey
            const fromKpiConfig = await tx.kpiConfig.findFirst({
              where: { companyId: ctx.companyId, departmentId: fromId, key: rel.fromKpiKey },
            });
            const toKpiConfig = await tx.kpiConfig.findFirst({
              where: { companyId: ctx.companyId, departmentId: toId, key: rel.toKpiKey },
            });

            await tx.departmentRelationship.create({
              data: {
                companyId: ctx.companyId,
                fromDepartmentId: fromId,
                toDepartmentId: toId,
                fromKpiKey: rel.fromKpiKey,
                toKpiKey: rel.toKpiKey,
              },
            });

            // Wire up linkedKpiId on the from-KPI if it points to a to-KPI
            if (fromKpiConfig && toKpiConfig) {
              await tx.kpiConfig.update({
                where: { id: fromKpiConfig.id },
                data: { linkedKpiId: toKpiConfig.id },
              });
            }
          }
        }
      }

      // Seed alert rules
      await tx.alertRule.createMany({
        data: BUILT_IN_ALERT_RULES.map((r) => ({
          companyId: ctx.companyId,
          name: r.name,
          description: r.description,
          ruleType: r.ruleType,
          threshold: r.threshold,
          thresholdUnit: r.thresholdUnit,
        })),
      });

      // Create 3 default custom roles
      const { DEFAULT_ROLE_PERMISSIONS } = await import("@/lib/permissions");
      await (tx as any).customRole.createMany({
        data: [
          {
            id: `${ctx.companyId}-dept-head`,
            companyId: ctx.companyId,
            name: "Department Head",
            description: "Manages a department, submits approvals and metrics, manages team",
            permissions: DEFAULT_ROLE_PERMISSIONS.DEPT_HEAD,
            color: "#3b82f6",
            isProtected: false,
          },
          {
            id: `${ctx.companyId}-employee`,
            companyId: ctx.companyId,
            name: "Employee",
            description: "Standard employee — can submit metrics and update goals",
            permissions: DEFAULT_ROLE_PERMISSIONS.EMPLOYEE,
            color: "#10b981",
            isProtected: false,
          },
          {
            id: `${ctx.companyId}-read-only`,
            companyId: ctx.companyId,
            name: "Read Only",
            description: "Can view data but cannot submit or modify anything",
            permissions: DEFAULT_ROLE_PERMISSIONS.READ_ONLY,
            color: "#6b7280",
            isProtected: false,
          },
        ],
      });

      // Mark onboarding complete
      await tx.company.update({
        where: { id: ctx.companyId },
        data: { onboardingCompleted: true, industry: template?.label },
      });

      await (tx as any).auditLog.create({
        data: {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "TEMPLATE_APPLIED",
          entityType: "Company",
          entityId: ctx.companyId,
          after: {
            templateId: parsedInput.templateId,
            departmentsCreated: createdDeptMap.size,
          },
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/departments");

    return { success: true };
  });

const createCustomDepartmentSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  colorHex: z.string().default("#6366f1"),
});

export const createCustomDepartment = authActionClient
  .metadata({ actionName: "createCustomDepartment" })
  .schema(createCustomDepartmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "departments:manage");

    const slug = parsedInput.slug.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    const existing = await prisma.department.findFirst({
      where: { companyId: ctx.companyId, slug },
    });
    if (existing) throw new Error(`A department with slug "${slug}" already exists`);

    const deptCount = await prisma.department.count({ where: { companyId: ctx.companyId } });

    const dept = await prisma.department.create({
      data: {
        companyId: ctx.companyId,
        slug,
        name: parsedInput.name,
        colorHex: parsedInput.colorHex,
        sortOrder: deptCount,
      },
    });

    // Seed KPIs: use predefined template if slug matches, else create generic ones
    const deptCfg = getDeptConfig(slug);
    const kpisToCreate = deptCfg
      ? deptCfg.kpis.map((kpi) => ({
          companyId: ctx.companyId,
          departmentId: dept.id,
          key: kpi.key,
          label: kpi.label,
          unit: kpi.unit,
          targetValue: kpi.defaultTarget,
          warningThreshold: kpi.warningThreshold,
          criticalThreshold: kpi.criticalThreshold,
          weight: kpi.weight,
          isBottleneckKpi: kpi.isBottleneckKpi,
          aggregation: kpi.aggregation,
        }))
      : [
          { companyId: ctx.companyId, departmentId: dept.id, key: "tasks_completed", label: "Tasks Completed", unit: "count", targetValue: 10, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.4, isBottleneckKpi: false, aggregation: "sum" },
          { companyId: ctx.companyId, departmentId: dept.id, key: "efficiency_rate", label: "Efficiency Rate", unit: "percentage", targetValue: 80, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "avg" },
          { companyId: ctx.companyId, departmentId: dept.id, key: "issues_resolved", label: "Issues Resolved", unit: "count", targetValue: 5, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.25, isBottleneckKpi: false, aggregation: "sum" },
        ];

    await prisma.kpiConfig.createMany({ data: kpisToCreate });

    await logAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.userId,
      action: "DEPARTMENT_CREATED",
      entityType: "Department",
      entityId: dept.id,
      after: { name: dept.name, slug: dept.slug },
    });

    revalidatePath("/departments");
    revalidatePath("/settings");

    return { departmentId: dept.id };
  });

const initDepartmentKpisSchema = z.object({ departmentId: z.string() });

export const initDepartmentKpis = authActionClient
  .metadata({ actionName: "initDepartmentKpis" })
  .schema(initDepartmentKpisSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(ctx.role, "departments:manage");

    const dept = await prisma.department.findFirst({
      where: { id: parsedInput.departmentId, companyId: ctx.companyId },
    });
    if (!dept) throw new Error("Department not found");

    const existing = await prisma.kpiConfig.count({
      where: { departmentId: dept.id, companyId: ctx.companyId },
    });
    if (existing > 0) throw new Error("Department already has KPIs configured");

    const deptCfg = getDeptConfig(dept.slug);
    const kpisToCreate = deptCfg
      ? deptCfg.kpis.map((kpi) => ({
          companyId: ctx.companyId,
          departmentId: dept.id,
          key: kpi.key,
          label: kpi.label,
          unit: kpi.unit,
          targetValue: kpi.defaultTarget,
          warningThreshold: kpi.warningThreshold,
          criticalThreshold: kpi.criticalThreshold,
          weight: kpi.weight,
          isBottleneckKpi: kpi.isBottleneckKpi,
          aggregation: kpi.aggregation,
        }))
      : [
          { companyId: ctx.companyId, departmentId: dept.id, key: "tasks_completed", label: "Tasks Completed", unit: "count", targetValue: 10, warningThreshold: 0.7, criticalThreshold: 0.4, weight: 0.4, isBottleneckKpi: false, aggregation: "sum" },
          { companyId: ctx.companyId, departmentId: dept.id, key: "efficiency_rate", label: "Efficiency Rate", unit: "percentage", targetValue: 80, warningThreshold: 0.7, criticalThreshold: 0.5, weight: 0.35, isBottleneckKpi: false, aggregation: "avg" },
          { companyId: ctx.companyId, departmentId: dept.id, key: "issues_resolved", label: "Issues Resolved", unit: "count", targetValue: 5, warningThreshold: 0.6, criticalThreshold: 0.3, weight: 0.25, isBottleneckKpi: false, aggregation: "sum" },
        ];

    await prisma.kpiConfig.createMany({ data: kpisToCreate });
    revalidatePath(`/departments/${dept.slug}`);
    return { count: kpisToCreate.length };
  });

const completeOnboardingSchema = z.object({});

export const completeOnboarding = authActionClient
  .metadata({ actionName: "completeOnboarding" })
  .schema(completeOnboardingSchema)
  .action(async ({ ctx }) => {
    requirePermission(ctx.role, "company:settings");

    await prisma.company.update({
      where: { id: ctx.companyId },
      data: { onboardingCompleted: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  });
