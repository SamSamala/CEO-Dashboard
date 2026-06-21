-- Department: add directorId (unique FK to User)
ALTER TABLE "Department" ADD COLUMN "directorId" TEXT;
ALTER TABLE "Department" ADD CONSTRAINT "Department_directorId_key" UNIQUE ("directorId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_directorId_fkey"
  FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User: add teamId
ALTER TABLE "User" ADD COLUMN "teamId" TEXT;

-- Employee: add teamId
ALTER TABLE "Employee" ADD COLUMN "teamId" TEXT;

-- Message: add teamId
ALTER TABLE "Message" ADD COLUMN "teamId" TEXT;

-- CreateTable Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "colorHex" TEXT NOT NULL DEFAULT '#6366f1',
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_key" UNIQUE ("leaderId");

-- CreateTable EmployeeOfMonth
CREATE TABLE "EmployeeOfMonth" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reason" TEXT,
    "awardedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeOfMonth_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_teamId_month_year_key" UNIQUE ("teamId", "month", "year");

-- Indexes
CREATE INDEX "Team_companyId_departmentId_idx" ON "Team"("companyId", "departmentId");
CREATE INDEX "EmployeeOfMonth_companyId_idx" ON "EmployeeOfMonth"("companyId");
CREATE INDEX "User_teamId_idx" ON "User"("teamId");
CREATE INDEX "Employee_teamId_idx" ON "Employee"("teamId");
CREATE INDEX "Message_teamId_idx" ON "Message"("teamId");

-- Foreign keys for Team
ALTER TABLE "Team" ADD CONSTRAINT "Team_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey"
  FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys for EmployeeOfMonth
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeOfMonth" ADD CONSTRAINT "EmployeeOfMonth_awardedBy_fkey"
  FOREIGN KEY ("awardedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys back-linking from User and Employee to Team
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
