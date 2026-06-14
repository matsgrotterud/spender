"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireOrgMembershipOrThrow,
  assertOrgCanOperate,
} from "@/lib/auth/session";
import { orgRoleAllows } from "@/lib/permissions";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendOffer } from "@/features/offers/send-offer";
import {
  estimateCampaign,
  runCampaign,
  type CampaignCriteria,
} from "@/features/business/campaign-engine";
import { computePrice, type PriceBreakdownLine } from "@/lib/pricing/engine";
import { generateApiKey, generateWebhookSecret } from "@/lib/encryption";
import { getBillingProvider } from "@/lib/adapters/billing";
import { grantCredits, getCreditBalance } from "@/lib/pricing/credits";
import { logAudit } from "@/lib/audit";
import { dispatchWebhookEvent, type WebhookEventType } from "@/lib/webhooks";
import { track } from "@/lib/analytics";
import { hashPassword } from "@/lib/auth/password";
import { encryptJson } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

export interface BusinessActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Misc payloads */
  offerId?: string;
  creditsSpent?: number;
  apiKeyPlaintext?: string;
  campaignId?: string;
  estimate?: {
    recipientCount: number;
    creditCostPerRecipient: number;
    totalCreditCost: number;
    breakdown: PriceBreakdownLine[];
  };
  priceCredits?: number;
  priceBreakdown?: PriceBreakdownLine[];
  redirectUrl?: string | null;
  campaignRun?: { sent: number; skippedDuplicates: number; failed: number };
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

const sendOfferSchema = z.object({
  demandRequestId: z.string().min(1),
  title: z.string().trim().min(3).max(150),
  summary: z.string().trim().min(10, "Skriv en kort oppsummering (minst 10 tegn)").max(600),
  payload: z.record(z.unknown()),
  validUntil: z.string().optional(),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().trim().max(100).optional(),
});

export async function sendOfferAction(
  input: z.infer<typeof sendOfferSchema>,
): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  if (!orgRoleAllows("business.offer.send", ctx.memberRole)) {
    return { ok: false, error: "Rollen din i bedriften kan ikke sende tilbud" };
  }
  assertOrgCanOperate(ctx.organization);

  const parsed = sendOfferSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { ok: false, fieldErrors };
  }

  const rate = await checkRateLimit({
    key: `offer-send:${ctx.organization.id}`,
    ...RATE_LIMITS.offerSend,
  });
  if (!rate.allowed) {
    return { ok: false, error: `Fartsgrense nådd. Prøv igjen om ${rate.resetInSeconds} sekunder.` };
  }

  const result = await sendOffer({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
    demandRequestId: parsed.data.demandRequestId,
    title: parsed.data.title,
    summary: parsed.data.summary,
    payload: parsed.data.payload,
    validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, fieldErrors: result.fieldErrors };
  }

  if (parsed.data.saveAsTemplate && parsed.data.templateName) {
    const request = await db.demandRequest.findUnique({
      where: { id: parsed.data.demandRequestId },
      include: { category: { select: { slug: true } } },
    });
    if (request) {
      await db.offerTemplate.create({
        data: {
          organizationId: ctx.organization.id,
          categorySlug: request.category.slug,
          name: parsed.data.templateName,
          payloadJson: {
            title: parsed.data.title,
            summary: parsed.data.summary,
            payload: parsed.data.payload,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  revalidatePath("/bedrift/app/marked");
  revalidatePath("/bedrift/app/tilbud");
  return { ok: true, offerId: result.offerId, creditsSpent: result.creditsSpent };
}

/** Pricing preview shown in the offer builder before sending. */
export async function previewOfferCost(demandRequestId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  const request = await db.demandRequest.findFirst({
    where: { id: demandRequestId, deletedAt: null },
    include: {
      category: { select: { slug: true } },
      _count: { select: { offers: { where: { status: { not: "DRAFT" } } } } },
    },
  });
  if (!request) return { ok: false, error: "Fant ikke forespørselen" };

  const subscription = await db.subscription.findFirst({
    where: { organizationId: ctx.organization.id, status: "ACTIVE" },
    include: { plan: true },
  });
  const price = await computePrice("CREDIT_COST", {
    categorySlug: request.category.slug,
    region: request.region,
    freshnessHours: (Date.now() - request.createdAt.getTime()) / 3_600_000,
    planSlug: subscription?.plan.slug,
    existingOfferCount: request._count.offers,
  });
  return { ok: true, priceCredits: price.credits, priceBreakdown: price.breakdown };
}

// ---------------------------------------------------------------------------
// Templates & saved searches
// ---------------------------------------------------------------------------

const templateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  categorySlug: z.string().min(1),
  title: z.string().trim().min(3).max(150),
  summary: z.string().trim().min(10).max(600),
  payload: z.record(z.unknown()),
});

export async function saveOfferTemplate(
  input: z.infer<typeof templateSchema>,
): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kontroller feltene i malen" };

  await db.offerTemplate.create({
    data: {
      organizationId: ctx.organization.id,
      categorySlug: parsed.data.categorySlug,
      name: parsed.data.name,
      payloadJson: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        payload: parsed.data.payload,
      } as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/bedrift/app/maler");
  return { ok: true };
}

export async function deleteOfferTemplate(templateId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  await db.offerTemplate.deleteMany({
    where: { id: templateId, organizationId: ctx.organization.id },
  });
  revalidatePath("/bedrift/app/maler");
  return { ok: true };
}

const savedSearchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  categorySlug: z.string().optional(),
  region: z.string().trim().max(100).optional(),
  notifyByEmail: z.boolean().optional(),
});

export async function saveSavedSearch(
  input: z.infer<typeof savedSearchSchema>,
): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  const parsed = savedSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ugyldig lagret søk" };

  await db.savedSearch.create({
    data: {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      name: parsed.data.name,
      criteriaJson: {
        categorySlug: parsed.data.categorySlug || null,
        region: parsed.data.region || null,
      },
      notifyByEmail: parsed.data.notifyByEmail ?? false,
    },
  });
  revalidatePath("/bedrift/app/marked");
  return { ok: true };
}

export async function deleteSavedSearch(searchId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  await db.savedSearch.deleteMany({
    where: { id: searchId, organizationId: ctx.organization.id },
  });
  revalidatePath("/bedrift/app/marked");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categorySlug: z.string().min(1),
  criteria: z.object({
    region: z.string().trim().max(100).optional(),
    maxAgeDays: z.coerce.number().int().min(1).max(60).optional(),
    snapshotFilters: z.record(z.union([z.string(), z.boolean()])).optional(),
  }),
  template: z.object({
    title: z.string().trim().min(3).max(150),
    summary: z.string().trim().min(10).max(600),
    payload: z.record(z.unknown()),
  }),
});

export async function estimateCampaignAction(input: {
  categorySlug: string;
  criteria: CampaignCriteria;
}): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  const category = await db.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) return { ok: false, error: "Ugyldig kategori" };

  const estimate = await estimateCampaign({
    organizationId: ctx.organization.id,
    categoryId: category.id,
    criteria: input.criteria,
  });
  return { ok: true, estimate };
}

export async function createCampaignAction(
  input: z.infer<typeof campaignSchema>,
): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  if (!orgRoleAllows("business.campaign.manage", ctx.memberRole)) {
    return { ok: false, error: "Rollen din kan ikke opprette kampanjer" };
  }
  assertOrgCanOperate(ctx.organization);

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Kontroller kampanjefeltene" };
  }

  // Plan gating: campaigns require a plan that allows them.
  const subscription = await db.subscription.findFirst({
    where: { organizationId: ctx.organization.id, status: "ACTIVE" },
    include: { plan: true },
  });
  if (!subscription || subscription.plan.maxActiveCampaigns === 0) {
    return {
      ok: false,
      error: "Kampanjer krever Growth-plan eller høyere. Oppgrader under Betaling.",
    };
  }
  const activeCampaigns = await db.bulkCampaign.count({
    where: { organizationId: ctx.organization.id, status: { in: ["DRAFT", "SCHEDULED", "RUNNING"] } },
  });
  if (activeCampaigns >= subscription.plan.maxActiveCampaigns) {
    return {
      ok: false,
      error: `Planen tillater maks ${subscription.plan.maxActiveCampaigns} aktive kampanjer`,
    };
  }

  const category = await db.category.findUnique({ where: { slug: parsed.data.categorySlug } });
  if (!category) return { ok: false, error: "Ugyldig kategori" };

  const estimate = await estimateCampaign({
    organizationId: ctx.organization.id,
    categoryId: category.id,
    criteria: parsed.data.criteria,
  });

  const campaign = await db.bulkCampaign.create({
    data: {
      organizationId: ctx.organization.id,
      categoryId: category.id,
      name: parsed.data.name,
      status: "DRAFT",
      targetCriteriaJson: parsed.data.criteria as Prisma.InputJsonValue,
      offerTemplateJson: parsed.data.template as Prisma.InputJsonValue,
      estimatedRecipientCount: estimate.recipientCount,
      estimatedCreditCost: estimate.totalCreditCost,
      createdByUserId: ctx.user.id,
    },
  });
  await logAudit({
    actorUserId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "campaign.created",
    entityType: "BulkCampaign",
    entityId: campaign.id,
    after: { name: campaign.name, estimatedRecipients: estimate.recipientCount },
  });

  revalidatePath("/bedrift/app/kampanjer");
  return { ok: true, campaignId: campaign.id };
}

export async function runCampaignAction(campaignId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  if (!orgRoleAllows("business.campaign.manage", ctx.memberRole)) {
    return { ok: false, error: "Rollen din kan ikke kjøre kampanjer" };
  }
  assertOrgCanOperate(ctx.organization);

  const campaign = await db.bulkCampaign.findFirst({
    where: { id: campaignId, organizationId: ctx.organization.id },
  });
  if (!campaign) return { ok: false, error: "Fant ikke kampanjen" };

  const rate = await checkRateLimit({
    key: `campaign-send:${ctx.organization.id}`,
    ...RATE_LIMITS.campaignSend,
  });
  if (!rate.allowed) {
    return {
      ok: false,
      error: `Fartsgrense: maks ${RATE_LIMITS.campaignSend.limit} kampanjekjøringer per time.`,
    };
  }

  const result = await runCampaign(campaign.id, ctx.user.id);
  revalidatePath(`/bedrift/app/kampanjer/${campaign.id}`);
  revalidatePath("/bedrift/app/kampanjer");
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    campaignId: campaign.id,
    campaignRun: {
      sent: result.sent,
      skippedDuplicates: result.skippedDuplicates,
      failed: result.failed,
    },
  };
}

export async function cancelCampaignAction(campaignId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  await db.bulkCampaign.updateMany({
    where: {
      id: campaignId,
      organizationId: ctx.organization.id,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/bedrift/app/kampanjer");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

const memberSchema = z.object({
  email: z.string().email("Ugyldig e-post").max(200),
  password: z.string().min(8, "Minst 8 tegn"),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

export async function addTeamMember(
  input: z.infer<typeof memberSchema>,
): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Kontroller feltene" };
  }

  const subscription = await db.subscription.findFirst({
    where: { organizationId: ctx.organization.id, status: "ACTIVE" },
    include: { plan: true },
  });
  const memberCount = await db.organizationMember.count({
    where: { organizationId: ctx.organization.id },
  });
  const maxSeats = subscription?.plan.maxSeats ?? 1;
  if (memberCount >= maxSeats) {
    return { ok: false, error: `Planen tillater maks ${maxSeats} brukere. Oppgrader for flere.` };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "E-postadressen er allerede registrert hos Spender" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction(async (tx) => {
    const member = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "BUSINESS_MEMBER",
        privateProfile: {
          create: {
            encryptedPayload: encryptJson({
              emailPreferences: { transactional: true, marketing: false },
            }),
          },
        },
      },
    });
    await tx.organizationMember.create({
      data: {
        organizationId: ctx.organization.id,
        userId: member.id,
        role: parsed.data.role,
      },
    });
    await logAudit({
      actorUserId: ctx.user.id,
      organizationId: ctx.organization.id,
      action: "team.member_added",
      entityType: "OrganizationMember",
      entityId: member.id,
      after: { email, role: parsed.data.role },
      tx,
    });
  });

  revalidatePath("/bedrift/app/team");
  return { ok: true };
}

export async function removeTeamMember(memberUserId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  if (memberUserId === ctx.user.id) {
    return { ok: false, error: "Du kan ikke fjerne deg selv" };
  }
  const membership = await db.organizationMember.findFirst({
    where: { organizationId: ctx.organization.id, userId: memberUserId },
  });
  if (!membership) return { ok: false, error: "Fant ikke medlemmet" };
  if (membership.role === "OWNER") return { ok: false, error: "Eieren kan ikke fjernes" };

  await db.organizationMember.delete({ where: { id: membership.id } });
  await logAudit({
    actorUserId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "team.member_removed",
    entityType: "OrganizationMember",
    entityId: membership.id,
  });
  revalidatePath("/bedrift/app/team");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// API keys & webhooks
// ---------------------------------------------------------------------------

export async function createApiKey(name: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });

  const subscription = await db.subscription.findFirst({
    where: { organizationId: ctx.organization.id, status: "ACTIVE" },
    include: { plan: true },
  });
  const features = (subscription?.plan.featuresJson ?? {}) as { apiAccess?: boolean };
  if (!features.apiAccess) {
    return { ok: false, error: "API-tilgang krever Pro- eller Enterprise-plan." };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { ok: false, error: "Navn på nøkkelen må være 2–100 tegn" };
  }

  const { plaintext, hashed, prefix } = generateApiKey();
  const key = await db.apiKey.create({
    data: {
      organizationId: ctx.organization.id,
      name: trimmed,
      hashedKey: hashed,
      keyPrefix: prefix,
      scopesJson: ["read", "write"],
    },
  });
  await logAudit({
    actorUserId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "apikey.created",
    entityType: "ApiKey",
    entityId: key.id,
    after: { name: trimmed, prefix },
  });

  revalidatePath("/bedrift/app/integrasjoner");
  return { ok: true, apiKeyPlaintext: plaintext };
}

export async function revokeApiKey(keyId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  await db.apiKey.updateMany({
    where: { id: keyId, organizationId: ctx.organization.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await logAudit({
    actorUserId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "apikey.revoked",
    entityType: "ApiKey",
    entityId: keyId,
  });
  revalidatePath("/bedrift/app/integrasjoner");
  return { ok: true };
}

const webhookSchema = z.object({
  url: z.string().url("Ugyldig URL").max(500),
  events: z.array(z.string()).min(1, "Velg minst én hendelse"),
});

export async function createWebhookEndpoint(input: {
  url: string;
  events: string[];
}): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig webhook" };
  }

  await db.webhookEndpoint.create({
    data: {
      organizationId: ctx.organization.id,
      url: parsed.data.url,
      secret: generateWebhookSecret(),
      eventsJson: parsed.data.events,
    },
  });
  revalidatePath("/bedrift/app/integrasjoner");
  return { ok: true };
}

export async function deleteWebhookEndpoint(endpointId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  await db.webhookEndpoint.deleteMany({
    where: { id: endpointId, organizationId: ctx.organization.id },
  });
  revalidatePath("/bedrift/app/integrasjoner");
  return { ok: true };
}

export async function sendTestWebhook(): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow();
  await dispatchWebhookEvent({
    organizationId: ctx.organization.id,
    eventType: "webhook.test" as WebhookEventType,
    payload: { message: "Test fra Spender", sentAt: new Date().toISOString() },
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export async function subscribeToPlan(planId: string): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  const plan = await db.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return { ok: false, error: "Fant ikke planen" };

  const provider = getBillingProvider();
  const result = await provider.subscribe({
    organizationId: ctx.organization.id,
    planId: plan.id,
    actorUserId: ctx.user.id,
  });
  await track("subscription_started", {
    userId: ctx.user.id,
    orgId: ctx.organization.id,
    properties: { plan: plan.slug, provider: provider.name },
  });

  revalidatePath("/bedrift/app/betaling");
  return { ok: true, redirectUrl: result.redirectUrl };
}

export async function cancelSubscription(): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  await getBillingProvider().cancel({
    organizationId: ctx.organization.id,
    actorUserId: ctx.user.id,
  });
  revalidatePath("/bedrift/app/betaling");
  return { ok: true };
}

/** Buys extra credits. With mock billing this grants immediately. */
export async function buyCredits(amount: number): Promise<BusinessActionResult> {
  const ctx = await requireOrgMembershipOrThrow({ memberRoles: ["OWNER", "ADMIN"] });
  if (![100, 250, 500].includes(amount)) {
    return { ok: false, error: "Ugyldig kredittpakke" };
  }
  // TODO(production): with Stripe enabled, create a one-time Checkout session
  // instead of granting directly. Mock billing grants immediately for dev.
  await grantCredits({
    organizationId: ctx.organization.id,
    amount,
    type: "PURCHASE",
    reason: `Kjøp av ${amount} kreditter (mock-fakturering)`,
  });
  await logAudit({
    actorUserId: ctx.user.id,
    organizationId: ctx.organization.id,
    action: "credits.purchased",
    entityType: "Organization",
    entityId: ctx.organization.id,
    after: { amount },
  });
  revalidatePath("/bedrift/app/betaling");
  return { ok: true };
}

export async function getOrgCreditBalance(): Promise<number> {
  const ctx = await requireOrgMembershipOrThrow();
  return getCreditBalance(ctx.organization.id);
}
