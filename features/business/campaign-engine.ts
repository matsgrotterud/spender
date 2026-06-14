/**
 * Bulk campaign engine.
 *
 * - Matches ACTIVE demand requests against the campaign's target criteria.
 * - Deduplicates recipients: one row per (campaign, request) enforced by a DB
 *   unique constraint, plus requests the org already offered on are skipped.
 * - Spends credits per successfully sent offer (atomic with offer creation).
 * - Idempotent: re-running a campaign never sends twice (idempotency keys).
 */
import "server-only";
import { db } from "@/lib/db";
import { sendOffer } from "@/features/offers/send-offer";
import { computePrice } from "@/lib/pricing/engine";
import { notify } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { track } from "@/lib/analytics";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export interface CampaignCriteria {
  region?: string;
  maxAgeDays?: number;
  /** Snapshot raw-value filters, e.g. { hasElbil: true }. */
  snapshotFilters?: Record<string, string | boolean>;
}

export interface CampaignOfferTemplate {
  title: string;
  summary: string;
  payload: Record<string, unknown>;
}

/** Finds ACTIVE requests matching criteria that the org has not already offered on. */
export async function findMatchingRequests(params: {
  organizationId: string;
  categoryId: string;
  criteria: CampaignCriteria;
}) {
  const where: Prisma.DemandRequestWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    categoryId: params.categoryId,
    offers: { none: { organizationId: params.organizationId } },
  };
  if (params.criteria.region) {
    where.region = { contains: params.criteria.region, mode: "insensitive" };
  }
  if (params.criteria.maxAgeDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - params.criteria.maxAgeDays);
    where.createdAt = { gte: cutoff };
  }

  const candidates = await db.demandRequest.findMany({
    where,
    select: { id: true, publicSnapshotJson: true, title: true, region: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const filters = params.criteria.snapshotFilters ?? {};
  const filterEntries = Object.entries(filters).filter(
    ([, v]) => v !== "" && v !== undefined && v !== null,
  );
  if (filterEntries.length === 0) return candidates;

  return candidates.filter((request) => {
    const snapshot = request.publicSnapshotJson as unknown as {
      fields: { key: string; raw?: unknown; value: unknown }[];
    };
    return filterEntries.every(([key, expected]) => {
      const field = snapshot.fields.find((f) => f.key === key);
      if (!field) return false;
      const actual = field.raw ?? field.value;
      if (typeof expected === "boolean") return actual === expected;
      return String(actual) === String(expected);
    });
  });
}

/** Estimates recipient count and credit cost without sending anything. */
export async function estimateCampaign(params: {
  organizationId: string;
  categoryId: string;
  criteria: CampaignCriteria;
}) {
  const matches = await findMatchingRequests(params);
  const category = await db.category.findUniqueOrThrow({ where: { id: params.categoryId } });
  const subscription = await db.subscription.findFirst({
    where: { organizationId: params.organizationId, status: "ACTIVE" },
    include: { plan: true },
  });
  const price = await computePrice("CAMPAIGN_SEND", {
    categorySlug: category.slug,
    planSlug: subscription?.plan.slug,
    volume: matches.length,
  });
  return {
    recipientCount: matches.length,
    creditCostPerRecipient: price.credits,
    totalCreditCost: price.credits * matches.length,
    breakdown: price.breakdown,
  };
}

export interface RunCampaignResult {
  ok: boolean;
  error?: string;
  sent: number;
  skippedDuplicates: number;
  failed: number;
}

/**
 * Executes a campaign. Caps sends per run (rate limiting happens in the
 * calling action). Safe to re-run: already-processed recipients are skipped.
 */
export async function runCampaign(campaignId: string, actorUserId: string): Promise<RunCampaignResult> {
  const campaign = await db.bulkCampaign.findUnique({
    where: { id: campaignId },
    include: { category: true },
  });
  if (!campaign) return { ok: false, error: "Fant ikke kampanjen", sent: 0, skippedDuplicates: 0, failed: 0 };
  if (campaign.status === "RUNNING") {
    return { ok: false, error: "Kampanjen kjører allerede", sent: 0, skippedDuplicates: 0, failed: 0 };
  }
  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    return { ok: false, error: "Kampanjen er avsluttet", sent: 0, skippedDuplicates: 0, failed: 0 };
  }

  await db.bulkCampaign.update({ where: { id: campaign.id }, data: { status: "RUNNING" } });

  const template = campaign.offerTemplateJson as unknown as CampaignOfferTemplate;
  const criteria = campaign.targetCriteriaJson as unknown as CampaignCriteria;

  const matches = await findMatchingRequests({
    organizationId: campaign.organizationId,
    categoryId: campaign.categoryId,
    criteria,
  });

  let sent = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  let totalCredits = 0;

  for (const request of matches) {
    // Dedupe via unique (campaignId, demandRequestId).
    let recipientId: string;
    try {
      const recipient = await db.bulkCampaignRecipient.create({
        data: { campaignId: campaign.id, demandRequestId: request.id, status: "PENDING" },
      });
      recipientId = recipient.id;
    } catch {
      skippedDuplicates += 1;
      continue;
    }

    const result = await sendOffer({
      organizationId: campaign.organizationId,
      actorUserId,
      demandRequestId: request.id,
      title: template.title,
      summary: template.summary,
      payload: template.payload,
      idempotencyKey: `campaign-${campaign.id}-${request.id}`,
      pricingScope: "CAMPAIGN_SEND",
      campaignVolume: matches.length,
    });

    if (result.ok) {
      sent += 1;
      totalCredits += result.creditsSpent;
      await db.bulkCampaignRecipient.update({
        where: { id: recipientId },
        data: { status: "SENT", offerId: result.offerId },
      });
    } else if (result.code === "DUPLICATE") {
      skippedDuplicates += 1;
      await db.bulkCampaignRecipient.update({
        where: { id: recipientId },
        data: { status: "SKIPPED_DUPLICATE", errorMessage: result.error },
      });
    } else if (result.code === "INSUFFICIENT_CREDITS") {
      failed += 1;
      await db.bulkCampaignRecipient.update({
        where: { id: recipientId },
        data: { status: "SKIPPED_LIMIT", errorMessage: result.error },
      });
      break; // no point continuing without credits
    } else {
      failed += 1;
      await db.bulkCampaignRecipient.update({
        where: { id: recipientId },
        data: { status: "FAILED", errorMessage: result.error },
      });
    }
  }

  await db.bulkCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      actualCreditCost: { increment: totalCredits },
    },
  });

  await logAudit({
    actorUserId,
    organizationId: campaign.organizationId,
    action: "campaign.completed",
    entityType: "BulkCampaign",
    entityId: campaign.id,
    after: { sent, skippedDuplicates, failed, credits: totalCredits },
  });
  await notify({
    userId: actorUserId,
    type: "campaign_completed",
    title: "Kampanje fullført",
    body: `«${campaign.name}»: ${sent} tilbud sendt, ${skippedDuplicates} hoppet over, ${failed} feilet. ${totalCredits} kreditter brukt.`,
    linkUrl: `/bedrift/app/kampanjer/${campaign.id}`,
    email: true,
  });
  await dispatchWebhookEvent({
    organizationId: campaign.organizationId,
    eventType: "campaign.completed",
    payload: { campaignId: campaign.id, sent, skippedDuplicates, failed },
    idempotencyKey: `campaign-completed-${campaign.id}`,
  });
  await track("campaign_sent", {
    userId: actorUserId,
    orgId: campaign.organizationId,
    properties: { sent, credits: totalCredits },
  });

  return { ok: true, sent, skippedDuplicates, failed };
}
