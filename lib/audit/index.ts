/**
 * Audit and data-access logging.
 *
 * - logDataAccess: every read/reveal/export of person-related data.
 * - logAudit: every state-changing action on important entities.
 *
 * Both are append-only; nothing in the app deletes from these tables.
 */
import { db } from "@/lib/db";
import { safeHash } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

export interface DataAccessParams {
  actorUserId?: string | null;
  targetUserId?: string | null;
  organizationId?: string | null;
  demandRequestId?: string | null;
  offerId?: string | null;
  /** e.g. "VIEW_SNAPSHOT", "REVEAL_CONTACT", "EXPORT_DATA", "API_LIST_REQUESTS" */
  action: string;
  /** Which data fields/scope was touched, e.g. "public_snapshot", "contact:name,phone" */
  dataScope: string;
  reason?: string;
  ip?: string | null;
  tx?: Prisma.TransactionClient;
}

export async function logDataAccess(params: DataAccessParams): Promise<void> {
  const client = params.tx ?? db;
  await client.dataAccessLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      targetUserId: params.targetUserId ?? null,
      organizationId: params.organizationId ?? null,
      demandRequestId: params.demandRequestId ?? null,
      offerId: params.offerId ?? null,
      action: params.action,
      dataScope: params.dataScope,
      reason: params.reason ?? null,
      ipHash: params.ip ? safeHash(params.ip) : null,
    },
  });
}

export interface AuditParams {
  actorUserId?: string | null;
  organizationId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  tx?: Prisma.TransactionClient;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const client = params.tx ?? db;
  await client.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      organizationId: params.organizationId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before === undefined ? undefined : (params.before as Prisma.InputJsonValue),
      afterJson: params.after === undefined ? undefined : (params.after as Prisma.InputJsonValue),
    },
  });
}
