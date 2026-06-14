"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth/session";
import { encryptJson, decryptJson, safeHash } from "@/lib/encryption";
import { logAudit, logDataAccess } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { track } from "@/lib/analytics";
import { CONSENT_TEXT_VERSION, CONTACT_SCOPE_FIELDS } from "@/lib/privacy/consent";
import { headers } from "next/headers";

export interface PrivacyActionResult {
  ok: boolean;
  error?: string;
}

interface PrivateProfilePayload {
  fullName?: string;
  phone?: string;
  address?: string;
  emailPreferences?: { transactional?: boolean; marketing?: boolean };
}

function requestMeta() {
  const h = headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: h.get("user-agent") ?? "unknown",
  };
}

// ---------------------------------------------------------------------------
// Contact details (private profile)
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+47)?[ ]?[0-9 ]{8,12}$/, "Ugyldig telefonnummer")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(300).optional(),
});

export async function updateContactDetails(input: {
  fullName?: string;
  phone?: string;
  address?: string;
}): Promise<PrivacyActionResult> {
  const user = await requireUserOrThrow();
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldige kontaktdetaljer" };
  }

  const existing = await db.userPrivateProfile.findUnique({ where: { userId: user.id } });
  const current = existing
    ? decryptJson<PrivateProfilePayload>(existing.encryptedPayload)
    : {};

  const updated: PrivateProfilePayload = {
    ...current,
    fullName: parsed.data.fullName || undefined,
    phone: parsed.data.phone || undefined,
    address: parsed.data.address || undefined,
  };

  await db.userPrivateProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, encryptedPayload: encryptJson(updated) },
    update: { encryptedPayload: encryptJson(updated) },
  });

  revalidatePath("/app/profil");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recipient-specific contact consent
// ---------------------------------------------------------------------------

const grantSchema = z.object({
  offerId: z.string().min(1),
  fields: z
    .array(z.enum(CONTACT_SCOPE_FIELDS))
    .min(1, "Velg minst ett felt å dele"),
});

/**
 * "Del kontaktinfo med denne bedriften": creates a recipient-specific
 * ConsentGrant. Only after this exists can that one organization see the
 * selected contact fields.
 */
export async function grantContactAccess(input: {
  offerId: string;
  fields: string[];
}): Promise<PrivacyActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig samtykke" };
  }

  const offer = await db.offer.findFirst({
    where: { id: parsed.data.offerId, demandRequest: { consumerId: user.id, deletedAt: null } },
    include: { organization: true },
  });
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };

  const existing = await db.consentGrant.findFirst({
    where: {
      userId: user.id,
      organizationId: offer.organizationId,
      demandRequestId: offer.demandRequestId,
      purpose: "contact_access",
      status: "ACTIVE",
    },
  });
  if (existing) return { ok: false, error: "Du har allerede delt kontaktinfo med denne bedriften" };

  const meta = requestMeta();
  const grant = await db.consentGrant.create({
    data: {
      userId: user.id,
      demandRequestId: offer.demandRequestId,
      organizationId: offer.organizationId,
      offerId: offer.id,
      purpose: "contact_access",
      scopeJson: { fields: parsed.data.fields },
      status: "ACTIVE",
      consentTextVersion: CONSENT_TEXT_VERSION,
      ipHash: safeHash(meta.ip),
      userAgentHash: safeHash(meta.userAgent),
    },
  });

  await logDataAccess({
    actorUserId: user.id,
    targetUserId: user.id,
    organizationId: offer.organizationId,
    demandRequestId: offer.demandRequestId,
    offerId: offer.id,
    action: "GRANT_CONTACT_ACCESS",
    dataScope: `contact:${parsed.data.fields.join(",")}`,
    reason: "Forbruker delte kontaktinfo med valgt bedrift",
    ip: meta.ip,
  });
  await logAudit({
    actorUserId: user.id,
    organizationId: offer.organizationId,
    action: "consent.granted",
    entityType: "ConsentGrant",
    entityId: grant.id,
    after: { fields: parsed.data.fields, offerId: offer.id },
  });

  await notify({
    userId: offer.createdByUserId,
    type: "contact_shared",
    title: "Forbrukeren delte kontaktinformasjon",
    body: `Du har fått tilgang til kontaktinformasjon for tilbudet «${offer.title}». Husk: bruk den kun til å følge opp dette tilbudet.`,
    linkUrl: `/bedrift/app/marked/${offer.demandRequestId}`,
    email: true,
  });
  await dispatchWebhookEvent({
    organizationId: offer.organizationId,
    eventType: "contact_access.granted",
    payload: { demandRequestId: offer.demandRequestId, offerId: offer.id, fields: parsed.data.fields },
    idempotencyKey: `consent-${grant.id}`,
  });
  await track("contact_shared", { userId: user.id, orgId: offer.organizationId });

  revalidatePath(`/app/tilbud/${offer.id}`);
  revalidatePath("/app/personvern");
  return { ok: true };
}

export async function withdrawConsent(grantId: string): Promise<PrivacyActionResult> {
  const user = await requireUserOrThrow();

  const grant = await db.consentGrant.findFirst({
    where: { id: grantId, userId: user.id, status: "ACTIVE" },
  });
  if (!grant) return { ok: false, error: "Fant ikke aktivt samtykke" };

  await db.consentGrant.update({
    where: { id: grant.id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
  await logAudit({
    actorUserId: user.id,
    organizationId: grant.organizationId,
    action: "consent.withdrawn",
    entityType: "ConsentGrant",
    entityId: grant.id,
  });
  if (grant.organizationId && grant.demandRequestId) {
    await dispatchWebhookEvent({
      organizationId: grant.organizationId,
      eventType: "contact_access.withdrawn",
      payload: { demandRequestId: grant.demandRequestId, offerId: grant.offerId },
      idempotencyKey: `consent-withdrawn-${grant.id}`,
    });
  }

  revalidatePath("/app/personvern");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Data subject requests
// ---------------------------------------------------------------------------

export async function requestAccountDeletion(): Promise<PrivacyActionResult> {
  const user = await requireUserOrThrow();

  const open = await db.dataSubjectRequest.findFirst({
    where: { userId: user.id, type: "DELETE", status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  if (open) return { ok: false, error: "Du har allerede en åpen sletteforespørsel" };

  await db.$transaction(async (tx) => {
    await tx.dataSubjectRequest.create({
      data: { userId: user.id, type: "DELETE", status: "OPEN" },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { status: "PENDING_DELETION" },
    });
    // Pause marketplace exposure immediately.
    await tx.demandRequest.updateMany({
      where: { consumerId: user.id, status: "ACTIVE" },
      data: { status: "PAUSED" },
    });
    await logAudit({
      actorUserId: user.id,
      action: "dsr.delete_requested",
      entityType: "User",
      entityId: user.id,
      tx,
    });
  });

  revalidatePath("/app/personvern");
  return { ok: true };
}
