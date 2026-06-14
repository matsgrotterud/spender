/**
 * Recipient-specific contact reveal.
 *
 * The ONLY code path through which a business can read consumer contact
 * fields. Requires an ACTIVE ConsentGrant for that exact organization and
 * demand request, reveals only the fields listed in the grant's scope, and
 * logs every read to DataAccessLog.
 */
import "server-only";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { logDataAccess } from "@/lib/audit";

export const CONSENT_TEXT_VERSION = "2026-06-v1";

export const CONTACT_SCOPE_FIELDS = ["fullName", "email", "phone"] as const;
export type ContactScopeField = (typeof CONTACT_SCOPE_FIELDS)[number];

export interface RevealedContact {
  fields: Partial<Record<ContactScopeField, string>>;
  grantId: string;
  grantedAt: Date;
}

interface PrivateProfilePayload {
  fullName?: string;
  phone?: string;
  address?: string;
}

/**
 * Returns the consumer's consented contact fields for a specific organization
 * and demand request – or null when no active grant exists.
 */
export async function getConsentedContact(params: {
  organizationId: string;
  demandRequestId: string;
  actorUserId: string;
  /** "ui" | "api" – recorded in the access log */
  via: string;
}): Promise<RevealedContact | null> {
  const grant = await db.consentGrant.findFirst({
    where: {
      organizationId: params.organizationId,
      demandRequestId: params.demandRequestId,
      status: "ACTIVE",
      purpose: "contact_access",
    },
    orderBy: { grantedAt: "desc" },
  });
  if (!grant) return null;

  const request = await db.demandRequest.findUnique({
    where: { id: params.demandRequestId },
    include: { consumer: { include: { privateProfile: true } } },
  });
  if (!request) return null;

  const scope = (grant.scopeJson as { fields?: string[] }).fields ?? [];
  const fields: Partial<Record<ContactScopeField, string>> = {};

  if (scope.includes("email")) {
    fields.email = request.consumer.email;
  }
  if (request.consumer.privateProfile) {
    const profile = decryptJson<PrivateProfilePayload>(
      request.consumer.privateProfile.encryptedPayload,
    );
    if (scope.includes("fullName") && profile.fullName) fields.fullName = profile.fullName;
    if (scope.includes("phone") && profile.phone) fields.phone = profile.phone;
  }

  await logDataAccess({
    actorUserId: params.actorUserId,
    targetUserId: request.consumerId,
    organizationId: params.organizationId,
    demandRequestId: params.demandRequestId,
    offerId: grant.offerId,
    action: "REVEAL_CONTACT",
    dataScope: `contact:${scope.join(",")}`,
    reason: `Samtykkebasert visning via ${params.via} (grant ${grant.id})`,
  });

  return { fields, grantId: grant.id, grantedAt: grant.grantedAt };
}

/** True when the organization holds an active contact grant for the request. */
export async function hasActiveContactGrant(
  organizationId: string,
  demandRequestId: string,
): Promise<boolean> {
  const grant = await db.consentGrant.findFirst({
    where: {
      organizationId,
      demandRequestId,
      status: "ACTIVE",
      purpose: "contact_access",
    },
    select: { id: true },
  });
  return Boolean(grant);
}
