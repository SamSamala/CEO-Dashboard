// @ts-nocheck — Prisma types generated at runtime; run `npm run db:generate` first
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { DEPT_CONFIG } from "../src/config/departments.config";
import { BUILT_IN_ALERT_RULES } from "../src/config/alert-rules.config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  const hash = await bcrypt.hash("password123", 12);

  const company = await prisma.company.upsert({
    where: { slug: "acme-corp-demo" },
    update: { onboardingCompleted: true },
    create: {
      name: "Acme Corp (Demo)",
      slug: "acme-corp-demo",
      industry: "SaaS",
      currency: "USD",
      onboardingCompleted: true,
    },
  });

  const ceo = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "ceo@acme.com" } },
    update: {},
    create: {
      companyId: company.id,
      name: "Sarah Chen",
      email: "ceo@acme.com",
      password: hash,
      role: "CEO",
    },
  });

  // Create departments + KPI configs (using lowercase slugs)
  const departments: Record<string, { id: string }> = {};
  let sortOrder = 0;
  for (const deptCfg of DEPT_CONFIG) {
    const dept = await prisma.department.upsert({
      where: { companyId_slug: { companyId: company.id, slug: deptCfg.slug } },
      update: { colorHex: deptCfg.colorHex },
      create: {
        companyId: company.id,
        slug: deptCfg.slug,
        name: deptCfg.name,
        colorHex: deptCfg.colorHex,
        sortOrder: sortOrder++,
      },
    });
    departments[deptCfg.slug] = dept;

    for (const kpi of deptCfg.kpis) {
      await prisma.kpiConfig.upsert({
        where: { companyId_departmentId_key: { companyId: company.id, departmentId: dept.id, key: kpi.key } },
        update: {},
        create: {
          companyId: company.id,
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
        },
      });
    }
  }

  // Wire up linkedKpiId for bottleneck chain detection
  const mktDept = departments["marketing"];
  const salesDept = departments["sales"];
  const opsDept = departments["operations"];
  if (mktDept && salesDept) {
    const leadsGenKpi = await prisma.kpiConfig.findFirst({ where: { companyId: company.id, departmentId: mktDept.id, key: "leads_generated" } });
    const leadsCapKpi = await prisma.kpiConfig.findFirst({ where: { companyId: company.id, departmentId: salesDept.id, key: "leads_capacity" } });
    if (leadsGenKpi && leadsCapKpi) {
      await prisma.kpiConfig.update({ where: { id: leadsGenKpi.id }, data: { linkedKpiId: leadsCapKpi.id } });
      await prisma.departmentRelationship.upsert({
        where: { companyId_fromDepartmentId_toDepartmentId: { companyId: company.id, fromDepartmentId: mktDept.id, toDepartmentId: salesDept.id } },
        update: {},
        create: { companyId: company.id, fromDepartmentId: mktDept.id, toDepartmentId: salesDept.id, fromKpiKey: "leads_generated", toKpiKey: "leads_capacity", sortOrder: 0 },
      });
    }
  }
  if (salesDept && opsDept) {
    const dealsKpi = await prisma.kpiConfig.findFirst({ where: { companyId: company.id, departmentId: salesDept.id, key: "deals_closed" } });
    const projDelivKpi = await prisma.kpiConfig.findFirst({ where: { companyId: company.id, departmentId: opsDept.id, key: "projects_delivered" } });
    if (dealsKpi && projDelivKpi) {
      await prisma.kpiConfig.update({ where: { id: projDelivKpi.id }, data: { linkedKpiId: dealsKpi.id } });
      await prisma.departmentRelationship.upsert({
        where: { companyId_fromDepartmentId_toDepartmentId: { companyId: company.id, fromDepartmentId: salesDept.id, toDepartmentId: opsDept.id } },
        update: {},
        create: { companyId: company.id, fromDepartmentId: salesDept.id, toDepartmentId: opsDept.id, fromKpiKey: "deals_closed", toKpiKey: "projects_delivered", sortOrder: 1 },
      });
    }
  }

  // Seed department heads
  const deptHeads = [
    { name: "Mike Rodriguez", email: "mike@acme.com", dept: "marketing" },
    { name: "Lisa Park", email: "lisa@acme.com", dept: "sales" },
    { name: "Tom Williams", email: "tom@acme.com", dept: "finance" },
  ];

  for (const head of deptHeads) {
    const deptId = departments[head.dept]?.id;
    if (!deptId) continue;
    await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: head.email } },
      update: {},
      create: {
        companyId: company.id,
        name: head.name,
        email: head.email,
        password: hash,
        role: "DEPT_HEAD",
        departmentId: deptId,
      },
    });
  }

  // Seed sample employees
  const sampleEmployees = [
    { firstName: "Alice", lastName: "Johnson", jobTitle: "Marketing Manager", dept: "marketing" },
    { firstName: "Bob", lastName: "Smith", jobTitle: "Sales Executive", dept: "sales" },
    { firstName: "Carol", lastName: "Davis", jobTitle: "Software Engineer", dept: "product" },
    { firstName: "David", lastName: "Brown", jobTitle: "Customer Success Manager", dept: "customer_success" },
    { firstName: "Emma", lastName: "Wilson", jobTitle: "Operations Analyst", dept: "operations" },
  ];

  for (const emp of sampleEmployees) {
    const deptId = departments[emp.dept]?.id;
    if (!deptId) continue;
    const email = `${emp.firstName.toLowerCase()}@acme.com`;
    const existing = await prisma.employee.findFirst({ where: { companyId: company.id, email } });
    if (!existing) {
      await prisma.employee.create({
        data: {
          companyId: company.id,
          departmentId: deptId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email,
          jobTitle: emp.jobTitle,
          startDate: new Date("2024-01-15"),
          salary: 75000,
          employmentStatus: "ACTIVE",
        },
      });
    }
  }

  // Seed 30 days of sample metrics (using businessDate)
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const businessDate = new Date(now);
    businessDate.setDate(businessDate.getDate() - i);
    businessDate.setHours(0, 0, 0, 0);

    // Check if entry already exists before creating
    const mktExisting = await prisma.metricEntry.findFirst({
      where: { companyId: company.id, departmentId: departments["marketing"]?.id, businessDate },
    });
    if (!mktExisting && departments["marketing"]) {
      await prisma.metricEntry.create({
        data: {
          companyId: company.id,
          departmentId: departments["marketing"].id,
          submittedBy: ceo.id,
          businessDate,
          data: {
            campaign_spend: Math.round(1200 + Math.random() * 800),
            leads_generated: Math.round(35 + Math.random() * 30),
            cost_per_lead: Math.round((25 + Math.random() * 15) * 100) / 100,
            conversion_rate: Math.round((3.5 + Math.random() * 3) * 100) / 100,
          },
        },
      });
    }

    const salesExisting = await prisma.metricEntry.findFirst({
      where: { companyId: company.id, departmentId: departments["sales"]?.id, businessDate },
    });
    if (!salesExisting && departments["sales"]) {
      await prisma.metricEntry.create({
        data: {
          companyId: company.id,
          departmentId: departments["sales"].id,
          submittedBy: ceo.id,
          businessDate,
          data: {
            calls_completed: Math.round(22 + Math.random() * 15),
            leads_capacity: 30,
            deals_closed: Math.round(2 + Math.random() * 4),
            revenue_generated: Math.round(15000 + Math.random() * 12000),
            pipeline_value: Math.round(350000 + Math.random() * 80000),
          },
        },
      });
    }

    const finExisting = await prisma.metricEntry.findFirst({
      where: { companyId: company.id, departmentId: departments["finance"]?.id, businessDate },
    });
    if (!finExisting && departments["finance"]) {
      await prisma.metricEntry.create({
        data: {
          companyId: company.id,
          departmentId: departments["finance"].id,
          submittedBy: ceo.id,
          businessDate,
          data: {
            cash_balance: 480000 - i * 1400,
            monthly_expenses: 82000 + Math.round(Math.random() * 8000),
            monthly_revenue: 138000 + Math.round(Math.random() * 15000),
            burn_rate: 42000,
          },
        },
      });
    }
  }

  // Seed alert rules
  for (const rule of BUILT_IN_ALERT_RULES) {
    const existing = await prisma.alertRule.findFirst({ where: { companyId: company.id, ruleType: rule.ruleType } });
    if (!existing) {
      await prisma.alertRule.create({
        data: { companyId: company.id, name: rule.name, description: rule.description, ruleType: rule.ruleType, threshold: rule.threshold, thresholdUnit: rule.thresholdUnit },
      });
    }
  }

  // Seed a sample goal
  const existingGoal = await prisma.goal.findFirst({ where: { companyId: company.id, title: "Q2 2026 Revenue Target" } });
  if (!existingGoal) {
    await prisma.goal.create({
      data: {
        companyId: company.id,
        ownerId: ceo.id,
        type: "QUARTERLY",
        title: "Q2 2026 Revenue Target",
        description: "Reach $500K MRR by end of Q2",
        targetValue: 500000,
        currentValue: 142000,
        unit: "currency",
        startDate: new Date("2026-04-01"),
        dueDate: new Date("2026-06-30"),
        status: "ON_TRACK",
      },
    });
  }

  console.log("✅ Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log("   CEO:        ceo@acme.com / password123");
  console.log("   Mkt Head:   mike@acme.com / password123");
  console.log("   Sales Head: lisa@acme.com / password123");
  console.log("   Finance:    tom@acme.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
