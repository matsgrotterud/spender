/**
 * Credit ledger helpers. The balance is always the SUM of ledger entries –
 * never a mutable counter – so every krone of credit movement is auditable.
 */
import { db } from "@/lib/db";
import type { CreditEntryType, Prisma } from "@prisma/client";

export async function getCreditBalance(
  organizationId: string,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const client = tx ?? db;
  const result = await client.creditLedger.aggregate({
    where: { organizationId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public available: number) {
    super(`Ikke nok kreditter: trenger ${required}, har ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

/**
 * Spends credits inside an existing transaction. Throws if the balance is
 * insufficient. Idempotent when an idempotencyKey is provided: a repeated
 * call with the same key is a no-op (credits are never charged twice).
 */
export async function spendCredits(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    amount: number;
    reason: string;
    referenceType?: string;
    referenceId?: string;
    idempotencyKey?: string;
  },
): Promise<{ charged: boolean }> {
  if (params.amount <= 0) return { charged: false };

  if (params.idempotencyKey) {
    const existing = await tx.creditLedger.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return { charged: false };
  }

  const balance = await getCreditBalance(params.organizationId, tx);
  if (balance < params.amount) {
    throw new InsufficientCreditsError(params.amount, balance);
  }

  await tx.creditLedger.create({
    data: {
      organizationId: params.organizationId,
      amount: -params.amount,
      type: "SPEND",
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
    },
  });
  return { charged: true };
}

export async function grantCredits(params: {
  organizationId: string;
  amount: number;
  type?: CreditEntryType;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  tx?: Prisma.TransactionClient;
}): Promise<void> {
  const client = params.tx ?? db;
  if (params.idempotencyKey) {
    const existing = await client.creditLedger.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return;
  }
  await client.creditLedger.create({
    data: {
      organizationId: params.organizationId,
      amount: Math.abs(params.amount),
      type: params.type ?? "GRANT",
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      idempotencyKey: params.idempotencyKey,
    },
  });
}
