-- ============================================================
-- Migration: Custom Roles + Employee Management System
-- Date: 2026-06-21
-- ============================================================

-- ─── 1. Create CustomRole table ───────────────────────────────────────────────

CREATE TABLE "CustomRole" (
    "id"          TEXT NOT NULL,
    "companyId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] NOT NULL DEFAULT '{}',
    "color"       TEXT NOT NULL DEFAULT '#6366f1',
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_companyId_name_key"
    UNIQUE ("companyId", "name");

CREATE INDEX "CustomRole_companyId_idx" ON "CustomRole"("companyId");

-- ─── 2. Add new fields to User ────────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN "customRoleId"       TEXT;
ALTER TABLE "User" ADD COLUMN "employeeId"         TEXT;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "terminationNote"    TEXT;
ALTER TABLE "User" ADD COLUMN "terminatedAt"       TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "terminatedBy"       TEXT;
ALTER TABLE "User" ADD COLUMN "terminationReason"  TEXT;

-- Foreign key for customRoleId
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey"
    FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Unique constraint for employeeId within company (allow NULLs)
CREATE UNIQUE INDEX "User_companyId_employeeId_key" ON "User"("companyId", "employeeId")
    WHERE "employeeId" IS NOT NULL;

-- Index for customRoleId lookups
CREATE INDEX "User_companyId_customRoleId_idx" ON "User"("companyId", "customRoleId");
