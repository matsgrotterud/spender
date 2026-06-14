"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { track } from "@/lib/analytics";
import { safeHash } from "@/lib/encryption";
import type { Prisma } from "@prisma/client";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function requireAdmin() {
  return requireUserOrThrow(["ADMIN", "SUPER_ADMIN"]);
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function reviewOrganization(input: {
  organizationId: string;
  decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "REACTIVATED";
  reason?: string;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const organization = await db.organization.findUnique({
    where: { id: input.organizationId },
    include: { members: { where: { role: "OWNER" }, select: { userId: true } } },
  });
  if (!organization) return { ok: false, error: "Fant ikke bedriften" };

  const newStatus = input.decision === "REACTIVATED" ? "VERIFIED" : input.decision;

  await db.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organization.id },
      data: {
        status: newStatus,
        suspendedReason: input.decision === "SUSPENDED" ? input.reason ?? null : null,
      },
    });
    if (input.decision === "VERIFIED" || input.decision === "REJECTED") {
      await tx.businessVerification.updateMany({
        where: { organizationId: organization.id, status: { in: ["PENDING", "NEEDS_REVIEW"] } },
        data: {
          status: input.decision === "VERIFIED" ? "PASSED" : "FAILED",
          verifiedAt: input.decision === "VERIFIED" ? new Date() : null,
          reviewedByAdminId: admin.id,
        },
      });
    }
  });

  await logAudit({
    actorUserId: admin.id,
    organizationId: organization.id,
    action: `organization.${input.decision.toLowerCase()}`,
    entityType: "Organization",
    entityId: organization.id,
    before: { status: organization.status },
    after: { status: newStatus, reason: input.reason ?? null },
  });

  const statusText: Record<string, string> = {
    VERIFIED: "Bedriften er godkjent! Dere kan nå sende tilbud.",
    REJECTED: "Søknaden ble dessverre avvist.",
    SUSPENDED: `Bedriften er suspendert.${input.reason ? ` Årsak: ${input.reason}` : ""}`,
    REACTIVATED: "Bedriften er gjenåpnet og kan sende tilbud igjen.",
  };
  for (const member of organization.members) {
    await notify({
      userId: member.userId,
      type: "business_status_changed",
      title: "Status for bedriften er endret",
      body: statusText[input.decision] ?? "Status er oppdatert.",
      linkUrl: "/bedrift/app/innstillinger",
      email: true,
    });
  }

  if (input.decision === "VERIFIED") {
    await track("business_verified", { orgId: organization.id });
  }

  revalidatePath("/admin/bedrifter");
  revalidatePath(`/admin/bedrifter/${organization.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Kun små bokstaver, tall og bindestrek"),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(500),
  consumerFormSchemaJson: z.string().min(2),
  businessOfferSchemaJson: z.string().min(2),
  publicSnapshotRulesJson: z.string().min(2),
  isActive: z.boolean(),
});

function parseJsonField(raw: string, label: string): { value?: unknown; error?: string } {
  try {
    return { value: JSON.parse(raw) };
  } catch {
    return { error: `${label} er ikke gyldig JSON` };
  }
}

export async function saveCategory(input: {
  categoryId?: string;
  data: z.infer<typeof categorySchema>;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = categorySchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige felt" };
  }

  const consumerForm = parseJsonField(parsed.data.consumerFormSchemaJson, "Forbrukerskjema");
  if (consumerForm.error) return { ok: false, error: consumerForm.error };
  const offerSchema = parseJsonField(parsed.data.businessOfferSchemaJson, "Tilbudsskjema");
  if (offerSchema.error) return { ok: false, error: offerSchema.error };
  const snapshotRules = parseJsonField(parsed.data.publicSnapshotRulesJson, "Snapshot-regler");
  if (snapshotRules.error) return { ok: false, error: snapshotRules.error };

  const data = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description,
    consumerFormSchemaJson: consumerForm.value as Prisma.InputJsonValue,
    businessOfferSchemaJson: offerSchema.value as Prisma.InputJsonValue,
    publicSnapshotRulesJson: snapshotRules.value as Prisma.InputJsonValue,
    isActive: parsed.data.isActive,
  };

  let categoryId = input.categoryId;
  if (categoryId) {
    const existing = await db.category.findUnique({ where: { id: categoryId } });
    if (!existing) return { ok: false, error: "Fant ikke kategorien" };
    await db.category.update({ where: { id: categoryId }, data });
  } else {
    const duplicate = await db.category.findUnique({ where: { slug: parsed.data.slug } });
    if (duplicate) return { ok: false, error: "Slug er allerede i bruk" };
    const created = await db.category.create({ data });
    categoryId = created.id;
  }

  await logAudit({
    actorUserId: admin.id,
    action: input.categoryId ? "category.updated" : "category.created",
    entityType: "Category",
    entityId: categoryId,
    after: { slug: parsed.data.slug, isActive: parsed.data.isActive },
  });

  revalidatePath("/admin/kategorier");
  return { ok: true, id: categoryId };
}

// ---------------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------------

const pricingRuleSchema = z.object({
  name: z.string().trim().min(2).max(150),
  scope: z.enum(["SUBSCRIPTION", "CREDIT_COST", "CONTACT_UNLOCK", "CAMPAIGN_SEND"]),
  ruleJson: z.string().min(2),
  isActive: z.boolean(),
});

export async function savePricingRule(input: {
  ruleId?: string;
  data: z.infer<typeof pricingRuleSchema>;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = pricingRuleSchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige felt" };
  }
  const rule = parseJsonField(parsed.data.ruleJson, "Regel");
  if (rule.error) return { ok: false, error: rule.error };

  const data = {
    name: parsed.data.name,
    scope: parsed.data.scope,
    ruleJson: rule.value as Prisma.InputJsonValue,
    isActive: parsed.data.isActive,
  };

  let ruleId = input.ruleId;
  if (ruleId) {
    await db.pricingRule.update({ where: { id: ruleId }, data });
  } else {
    const created = await db.pricingRule.create({ data });
    ruleId = created.id;
  }

  await logAudit({
    actorUserId: admin.id,
    action: input.ruleId ? "pricing_rule.updated" : "pricing_rule.created",
    entityType: "PricingRule",
    entityId: ruleId,
    after: { name: parsed.data.name, scope: parsed.data.scope, isActive: parsed.data.isActive },
  });

  revalidatePath("/admin/prisregler");
  return { ok: true, id: ruleId };
}

export async function deletePricingRule(ruleId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await db.pricingRule.delete({ where: { id: ruleId } });
  await logAudit({
    actorUserId: admin.id,
    action: "pricing_rule.deleted",
    entityType: "PricingRule",
    entityId: ruleId,
  });
  revalidatePath("/admin/prisregler");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Subscription plans
// ---------------------------------------------------------------------------

const planSchema = z.object({
  name: z.string().trim().min(2).max(100),
  monthlyPriceNok: z.coerce.number().int().min(0),
  includedCredits: z.coerce.number().int().min(0),
  maxSeats: z.coerce.number().int().min(1),
  maxActiveCampaigns: z.coerce.number().int().min(0),
  featuresJson: z.string().min(2),
  isActive: z.boolean(),
});

export async function updatePlan(input: {
  planId: string;
  data: z.infer<typeof planSchema>;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = planSchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige felt" };
  }
  const features = parseJsonField(parsed.data.featuresJson, "Funksjoner");
  if (features.error) return { ok: false, error: features.error };

  await db.subscriptionPlan.update({
    where: { id: input.planId },
    data: {
      name: parsed.data.name,
      monthlyPriceNok: parsed.data.monthlyPriceNok,
      includedCredits: parsed.data.includedCredits,
      maxSeats: parsed.data.maxSeats,
      maxActiveCampaigns: parsed.data.maxActiveCampaigns,
      featuresJson: features.value as Prisma.InputJsonValue,
      isActive: parsed.data.isActive,
    },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "subscription_plan.updated",
    entityType: "SubscriptionPlan",
    entityId: input.planId,
    after: { name: parsed.data.name, monthlyPriceNok: parsed.data.monthlyPriceNok },
  });

  revalidatePath("/admin/abonnement");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Content: articles & FAQ
// ---------------------------------------------------------------------------

const articleSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Kun små bokstaver, tall og bindestrek"),
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().min(2).max(400),
  body: z.string().trim().min(10),
  categorySlug: z.string().trim().max(50).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  seoTitle: z.string().trim().max(150).optional(),
  seoDescription: z.string().trim().max(300).optional(),
});

export async function saveArticle(input: {
  articleId?: string;
  data: z.infer<typeof articleSchema>;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = articleSchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige felt" };
  }

  const data = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    body: parsed.data.body,
    categorySlug: parsed.data.categorySlug || null,
    status: parsed.data.status,
    seoTitle: parsed.data.seoTitle || null,
    seoDescription: parsed.data.seoDescription || null,
  };

  let articleId = input.articleId;
  if (articleId) {
    const existing = await db.article.findUnique({ where: { id: articleId } });
    if (!existing) return { ok: false, error: "Fant ikke artikkelen" };
    await db.article.update({
      where: { id: articleId },
      data: {
        ...data,
        publishedAt:
          parsed.data.status === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
      },
    });
  } else {
    const duplicate = await db.article.findUnique({ where: { slug: parsed.data.slug } });
    if (duplicate) return { ok: false, error: "Slug er allerede i bruk" };
    const created = await db.article.create({
      data: {
        ...data,
        publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
      },
    });
    articleId = created.id;
  }

  await logAudit({
    actorUserId: admin.id,
    action: input.articleId ? "article.updated" : "article.created",
    entityType: "Article",
    entityId: articleId,
    after: { slug: parsed.data.slug, status: parsed.data.status },
  });

  revalidatePath("/admin/innhold");
  revalidatePath("/artikler");
  revalidatePath(`/artikler/${parsed.data.slug}`);
  return { ok: true, id: articleId };
}

export async function deleteArticle(articleId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await db.article.delete({ where: { id: articleId } });
  await logAudit({
    actorUserId: admin.id,
    action: "article.deleted",
    entityType: "Article",
    entityId: articleId,
  });
  revalidatePath("/admin/innhold");
  revalidatePath("/artikler");
  return { ok: true };
}

const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(2000),
  audience: z.enum(["consumer", "business", "general"]),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
});

export async function saveFaqItem(input: {
  faqId?: string;
  data: z.infer<typeof faqSchema>;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = faqSchema.safeParse(input.data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige felt" };
  }

  let faqId = input.faqId;
  if (faqId) {
    await db.faqItem.update({ where: { id: faqId }, data: parsed.data });
  } else {
    const created = await db.faqItem.create({ data: parsed.data });
    faqId = created.id;
  }

  await logAudit({
    actorUserId: admin.id,
    action: input.faqId ? "faq.updated" : "faq.created",
    entityType: "FaqItem",
    entityId: faqId,
  });

  revalidatePath("/admin/innhold");
  revalidatePath("/faq");
  return { ok: true, id: faqId };
}

export async function deleteFaqItem(faqId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  await db.faqItem.delete({ where: { id: faqId } });
  await logAudit({
    actorUserId: admin.id,
    action: "faq.deleted",
    entityType: "FaqItem",
    entityId: faqId,
  });
  revalidatePath("/admin/innhold");
  revalidatePath("/faq");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Data subject requests
// ---------------------------------------------------------------------------

export async function updateDsr(input: {
  dsrId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  adminNotes?: string;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const dsr = await db.dataSubjectRequest.findUnique({ where: { id: input.dsrId } });
  if (!dsr) return { ok: false, error: "Fant ikke forespørselen" };

  // Completing a DELETE request anonymizes the account.
  if (input.status === "COMPLETED" && dsr.type === "DELETE") {
    await anonymizeUser(dsr.userId, admin.id);
  }

  await db.dataSubjectRequest.update({
    where: { id: dsr.id },
    data: {
      status: input.status,
      adminNotes: input.adminNotes ?? dsr.adminNotes,
      completedAt: input.status === "COMPLETED" ? new Date() : null,
    },
  });

  await logAudit({
    actorUserId: admin.id,
    action: `dsr.${input.status.toLowerCase()}`,
    entityType: "DataSubjectRequest",
    entityId: dsr.id,
    after: { type: dsr.type, status: input.status },
  });

  // Don't notify on completed DELETE (account is anonymized).
  if (!(input.status === "COMPLETED" && dsr.type === "DELETE")) {
    await notify({
      userId: dsr.userId,
      type: "dsr_update",
      title: "Oppdatering på personvernforespørsel",
      body:
        input.status === "COMPLETED"
          ? "Forespørselen din er fullført."
          : input.status === "REJECTED"
            ? "Forespørselen din ble avvist. Kontakt oss for detaljer."
            : "Forespørselen din er under behandling.",
      linkUrl: "/app/personvern",
    });
  }

  revalidatePath("/admin/personvern");
  return { ok: true };
}

/**
 * GDPR deletion: scrub direct identifiers but keep pseudonymous records that
 * are needed for accounting/audit (credit ledger, audit logs reference IDs
 * only). Demand requests are anonymized and closed.
 */
async function anonymizeUser(userId: string, adminId: string): Promise<void> {
  const anonymizedEmail = `slettet-${safeHash(userId).slice(0, 12)}@anonymized.spender.local`;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        passwordHash: null,
        status: "DELETED",
        deletedAt: new Date(),
      },
    });
    await tx.userPrivateProfile.updateMany({
      where: { userId },
      data: { encryptedPayload: "", deletedAt: new Date() },
    });
    await tx.consumerProfile.updateMany({
      where: { userId },
      data: { displayAlias: "Slettet bruker", ageRange: null, householdType: null },
    });
    await tx.demandRequest.updateMany({
      where: { consumerId: userId },
      data: {
        status: "CLOSED",
        publicSnapshotJson: {},
        encryptedPrivatePayload: "",
        title: "Slettet forespørsel",
        anonymizedAt: new Date(),
        deletedAt: new Date(),
      },
    });
    await tx.message.updateMany({
      where: { senderUserId: userId },
      data: { body: "[Slettet]", deletedAt: new Date() },
    });
    await tx.consentGrant.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    await tx.notification.deleteMany({ where: { userId } });
  });

  await logAudit({
    actorUserId: adminId,
    action: "user.anonymized",
    entityType: "User",
    entityId: userId,
  });
}

// ---------------------------------------------------------------------------
// Abuse reports
// ---------------------------------------------------------------------------

export async function resolveOfferReport(input: {
  reportId: string;
  status: "REVIEWED" | "ACTION_TAKEN" | "DISMISSED";
  adminNotes?: string;
}): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const report = await db.offerReport.findUnique({ where: { id: input.reportId } });
  if (!report) return { ok: false, error: "Fant ikke rapporten" };

  await db.offerReport.update({
    where: { id: report.id },
    data: { status: input.status, adminNotes: input.adminNotes ?? report.adminNotes },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "offer_report.resolved",
    entityType: "OfferReport",
    entityId: report.id,
    after: { status: input.status },
  });

  revalidatePath("/admin");
  return { ok: true };
}
