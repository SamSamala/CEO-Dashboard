-- ============================================================
-- Migration: Production Architecture Upgrade
-- Date: 2026-06-20
-- ============================================================

-- ─── 1. Convert DepartmentSlug enum to TEXT ──────────────────────────────────

-- Add temporary text column
ALTER TABLE "Department" ADD COLUMN "_slug_text" TEXT;

-- Populate from enum (cast to text)
UPDATE "Department" SET "_slug_text" = slug::TEXT;

-- Drop the old enum column (this also drops the unique constraint on it)
ALTER TABLE "Department" DROP COLUMN "slug";

-- Rename temp column to slug
ALTER TABLE "Department" RENAME COLUMN "_slug_text" TO "slug";

-- Make it NOT NULL
ALTER TABLE "Department" ALTER COLUMN "slug" SET NOT NULL;

-- Add sortOrder column
ALTER TABLE "Department" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Re-add unique constraint
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_slug_key" UNIQUE ("companyId", "slug");

-- Drop the old enum type
DROP TYPE IF EXISTS "DepartmentSlug";

-- ─── 2. MetricEntry: rename date → businessDate, remove unique, add label ─────

-- Rename date column to businessDate
ALTER TABLE "MetricEntry" RENAME COLUMN "date" TO "businessDate";

-- Drop the unique constraint (was on the old 'date' column name)
ALTER TABLE "MetricEntry" DROP CONSTRAINT IF EXISTS "MetricEntry_companyId_departmentId_date_key";

-- Drop old indexes that referenced 'date'
DROP INDEX IF EXISTS "MetricEntry_companyId_departmentId_date_idx";
DROP INDEX IF EXISTS "MetricEntry_companyId_date_idx";

-- Add label column
ALTER TABLE "MetricEntry" ADD COLUMN "label" TEXT;

-- Re-add indexes on businessDate (not unique)
CREATE INDEX "MetricEntry_companyId_departmentId_businessDate_idx" ON "MetricEntry"("companyId", "departmentId", "businessDate");
CREATE INDEX "MetricEntry_companyId_businessDate_idx" ON "MetricEntry"("companyId", "businessDate");

-- ─── 3. Company: add new fields ──────────────────────────────────────────────

ALTER TABLE "Company" ADD COLUMN "deptHeadApprovalLimit" DOUBLE PRECISION NOT NULL DEFAULT 500;
ALTER TABLE "Company" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- ─── 4. User: add roleVersion ────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "roleVersion" INTEGER NOT NULL DEFAULT 0;

-- ─── 5. KpiConfig: add frequency and ownerId ─────────────────────────────────

ALTER TABLE "KpiConfig" ADD COLUMN "frequency" TEXT NOT NULL DEFAULT 'DAILY';
ALTER TABLE "KpiConfig" ADD COLUMN "ownerId" TEXT;

-- ─── 6. Bottleneck: add new fields ───────────────────────────────────────────

ALTER TABLE "Bottleneck" ADD COLUMN "estimatedRevenueImpact" DOUBLE PRECISION;
ALTER TABLE "Bottleneck" ADD COLUMN "isPrimaryConstraint" BOOLEAN NOT NULL DEFAULT false;

-- ─── 7. AuditLog: add reason field ───────────────────────────────────────────

ALTER TABLE "AuditLog" ADD COLUMN "reason" TEXT;

-- ─── 8. Create DepartmentRelationship table ───────────────────────────────────

CREATE TABLE "DepartmentRelationship" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fromDepartmentId" TEXT NOT NULL,
    "toDepartmentId" TEXT NOT NULL,
    "fromKpiKey" TEXT NOT NULL,
    "toKpiKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DepartmentRelationship_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for DepartmentRelationship
ALTER TABLE "DepartmentRelationship" ADD CONSTRAINT "DepartmentRelationship_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentRelationship" ADD CONSTRAINT "DepartmentRelationship_fromDepartmentId_fkey"
    FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartmentRelationship" ADD CONSTRAINT "DepartmentRelationship_toDepartmentId_fkey"
    FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint and index for DepartmentRelationship
ALTER TABLE "DepartmentRelationship" ADD CONSTRAINT "DepartmentRelationship_companyId_fromDepartmentId_toDepartmentId_key"
    UNIQUE ("companyId", "fromDepartmentId", "toDepartmentId");
CREATE INDEX "DepartmentRelationship_companyId_idx" ON "DepartmentRelationship"("companyId");
