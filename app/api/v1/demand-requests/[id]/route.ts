import { NextResponse } from "next/server";
import { authenticateApiRequest, apiError } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { getConsentedContact } from "@/lib/privacy/consent";
import { logDataAccess } from "@/lib/audit";

/**
 * Single demand request: public snapshot + own offer status. Contact details
 * are included ONLY when the consumer has granted this exact organization
 * recipient-specific consent – and the read is logged.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request, "read");
  if (!auth.ok) return auth.response;
  const { organization } = auth.ctx;

  const demandRequest = await db.demandRequest.findFirst({
    where: { id: params.id, deletedAt: null, anonymizedAt: null },
    include: {
      category: { select: { slug: true, name: true } },
      consumer: { select: { id: true, consumerProfile: { select: { displayAlias: true } } } },
      offers: {
        where: { organizationId: organization.id },
        select: { id: true, status: true, sentAt: true },
      },
    },
  });
  if (!demandRequest || demandRequest.status === "DRAFT") {
    return apiError(404, "not_found", "Fant ikke forespørselen");
  }

  // OWNER acts as the audit actor for API key reads.
  const owner = await db.organizationMember.findFirst({
    where: { organizationId: organization.id, role: "OWNER" },
    select: { userId: true },
  });

  if (owner) {
    await logDataAccess({
      actorUserId: owner.userId,
      targetUserId: demandRequest.consumer.id,
      organizationId: organization.id,
      demandRequestId: demandRequest.id,
      action: "READ_SNAPSHOT",
      dataScope: "public_snapshot",
      reason: "API-oppslag /api/v1/demand-requests/:id",
    });
  }

  const contact = owner
    ? await getConsentedContact({
        organizationId: organization.id,
        demandRequestId: demandRequest.id,
        actorUserId: owner.userId,
        via: "api",
      })
    : null;

  return NextResponse.json({
    id: demandRequest.id,
    title: demandRequest.title,
    status: demandRequest.status,
    category: demandRequest.category.slug,
    categoryName: demandRequest.category.name,
    consumerAlias: demandRequest.consumer.consumerProfile?.displayAlias ?? "Forbruker",
    region: demandRequest.region,
    priceZone: demandRequest.priceZone,
    publicSnapshot: demandRequest.publicSnapshotJson,
    expiresAt: demandRequest.expiresAt,
    createdAt: demandRequest.createdAt,
    ourOffer: demandRequest.offers[0] ?? null,
    /** Only present with active recipient-specific consent. */
    consentedContact: contact
      ? { fields: contact.fields, grantedAt: contact.grantedAt }
      : null,
  });
}
