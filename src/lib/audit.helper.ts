import type { PrismaClient } from "@/generated/prisma/client";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

interface AuditParams {
  companyId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

export async function logAudit(
  tx: TransactionClient | PrismaClient,
  params: AuditParams
): Promise<void> {
  await (tx as any).auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before ?? null,
      after: params.after ?? null,
      reason: params.reason,
    },
  });
}
