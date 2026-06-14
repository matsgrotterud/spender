/**
 * Core offer-sending service used by the dashboard, the bulk campaign engine
 * and the public API. Single source of truth for:
 *  - schema validation against the category's offer schema
 *  - pricing via the rules engine
 *  - atomic credit spend + offer creation (Prisma transaction, idempotent)
 *  - explainable scoring
 *  - notifications, webhooks, analytics, audit
 */
import "server-only";
import { db } from "@/lib/db";
import { validateDynamicForm } from "@/lib/validators/category-form";
import { computePrice } from "@/lib/pricing/engine";
import { spendCredits, InsufficientCreditsError } from "@/lib/pricing/credits";
import { scoreOffer } from "@/features/offers/scoring";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { track } from "@/lib/analytics";
import type { OfferSchema, PublicSnapshot } from "@/features/categories/types";
import type { Prisma, PricingScope } from "@prisma/client";

export interface SendOfferInput {
  organizationId: string;
  actorUserId: string;
  demandRequestId: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  validUntil?: Date | null;
  idempotencyKey?: string;
  /** CAMPAIGN_SEND uses cheaper campaign pricing. */
  pricingScope?: Extract<PricingScope, "CREDIT_COST" | "CAMPAIGN_SEND">;
  campaignVolume?: number;
  /** Skip notification/webhook side effects (campaign sends batch these). */
  quiet?: boolean;
  tx?: Prisma.TransactionClient;
}

export type SendOfferResult =
  | { ok: true; offerId: string; creditsSpent: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: string };

export async function sendOffer(input: SendOfferInput): Promise<SendOfferResult> {
  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!organization) return { ok: false, error: "Fant ikke bedriften" };
  if (organization.status !== "VERIFIED") {
    return {
      ok: false,
      error: "Bedriften må være godkjent av Spender før den kan sende tilbud",
      code: "ORG_NOT_VERIFIED",
    };
  }

  const request = await db.demandRequest.findFirst({
    where: { id: input.demandRequestId, deletedAt: null },
    include: { category: true, _count: { select: { offers: { where: { status: { not: "DRAFT" } } } } } },
  });
  if (!request) return { ok: false, error: "Fant ikke forespørselen", code: "NOT_FOUND" };
  if (request.status !== "ACTIVE") {
    return { ok: false, error: "Forespørselen er ikke aktiv", code: "NOT_ACTIVE" };
  }

  // One offer per organization per request (also enforced by DB constraint).
  const existing = await db.offer.findUnique({
    where: {
      organizationId_demandRequestId: {
        organizationId: input.organizationId,
        demandRequestId: input.demandRequestId,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "Bedriften har allerede sendt tilbud på denne forespørselen", code: "DUPLICATE" };
  }

  if (!input.title.trim() || input.title.length > 150) {
    return { ok: false, error: "Tittel er påkrevd (maks 150 tegn)", fieldErrors: { title: "Tittel er påkrevd" } };
  }
  if (!input.summary.trim() || input.summary.length > 600) {
    return { ok: false, error: "Oppsummering er påkrevd (maks 600 tegn)", fieldErrors: { summary: "Oppsummering er påkrevd" } };
  }

  const offerSchema = request.category.businessOfferSchemaJson as unknown as OfferSchema;
  const validation = validateDynamicForm(offerSchema.fields, input.payload);
  if (!validation.success) {
    return { ok: false, error: "Kontroller tilbudsfeltene", fieldErrors: validation.errors };
  }

  // Pricing
  const subscription = await db.subscription.findFirst({
    where: { organizationId: input.organizationId, status: "ACTIVE" },
    include: { plan: true },
  });
  const freshnessHours = (Date.now() - request.createdAt.getTime()) / 3_600_000;
  const price = await computePrice(input.pricingScope ?? "CREDIT_COST", {
    categorySlug: request.category.slug,
    region: request.region,
    freshnessHours,
    planSlug: subscription?.plan.slug,
    existingOfferCount: request._count.offers,
    volume: input.campaignVolume,
  });

  const snapshot = request.publicSnapshotJson as unknown as PublicSnapshot;
  const score = scoreOffer(offerSchema.scoring, validation.data, snapshot);

  try {
    const offer = await db.$transaction(async (tx) => {
      await spendCredits(tx, {
        organizationId: input.organizationId,
        amount: price.credits,
        reason:
          input.pricingScope === "CAMPAIGN_SEND"
            ? `Kampanjetilbud – ${request.title}`
            : `Tilbud sendt – ${request.title}`,
        referenceType: "demand_request",
        referenceId: request.id,
        idempotencyKey: input.idempotencyKey ? `spend-${input.idempotencyKey}` : undefined,
      });

      const created = await tx.offer.create({
        data: {
          organizationId: input.organizationId,
          demandRequestId: request.id,
          categoryId: request.categoryId,
          status: "SENT",
          title: input.title.trim(),
          summary: input.summary.trim(),
          offerPayloadJson: validation.data as Prisma.InputJsonValue,
          priceEstimateJson: {
            credits: price.credits,
            breakdown: price.breakdown,
          } as unknown as Prisma.InputJsonValue,
          validUntil: input.validUntil ?? null,
          createdByUserId: input.actorUserId,
          sentAt: new Date(),
          comparisonScore: {
            create: {
              score: score.score,
              explanationJson: score.explanation as unknown as Prisma.InputJsonValue,
            },
          },
        },
      });

      await logAudit({
        actorUserId: input.actorUserId,
        organizationId: input.organizationId,
        action: "offer.sent",
        entityType: "Offer",
        entityId: created.id,
        after: { demandRequestId: request.id, credits: price.credits, title: created.title },
        tx,
      });

      return created;
    });

    if (!input.quiet) {
      await notify({
        userId: request.consumerId,
        type: "offer_received",
        title: "Nytt tilbud mottatt",
        body: `${organization.name} har sendt deg et tilbud på «${request.title}».`,
        linkUrl: `/app/tilbud/${offer.id}`,
        email: true,
      });
    }
    await dispatchWebhookEvent({
      organizationId: input.organizationId,
      eventType: "offer.sent",
      payload: { offerId: offer.id, demandRequestId: request.id, credits: price.credits },
      idempotencyKey: `offer-sent-${offer.id}`,
    });
    await track("offer_sent", {
      userId: input.actorUserId,
      orgId: input.organizationId,
      properties: { category: request.category.slug, credits: price.credits },
    });

    return { ok: true, offerId: offer.id, creditsSpent: price.credits };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: err.message, code: "INSUFFICIENT_CREDITS" };
    }
    // Unique constraint race: another offer landed first.
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
      return { ok: false, error: "Bedriften har allerede sendt tilbud på denne forespørselen", code: "DUPLICATE" };
    }
    throw err;
  }
}
