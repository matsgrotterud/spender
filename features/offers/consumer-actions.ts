"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";
import { track } from "@/lib/analytics";

export interface OfferActionResult {
  ok: boolean;
  error?: string;
  conversationId?: string;
}

/** Loads an offer and verifies the current consumer owns the underlying request. */
async function getOwnOffer(offerId: string, userId: string) {
  return db.offer.findFirst({
    where: { id: offerId, demandRequest: { consumerId: userId, deletedAt: null } },
    include: { demandRequest: true, organization: true },
  });
}

export async function acceptOffer(offerId: string): Promise<OfferActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const offer = await getOwnOffer(offerId, user.id);
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };
  if (offer.status !== "SENT" && offer.status !== "VIEWED") {
    return { ok: false, error: "Tilbudet kan ikke aksepteres i nåværende status" };
  }

  await db.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offer.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await logAudit({
      actorUserId: user.id,
      organizationId: offer.organizationId,
      action: "offer.accepted",
      entityType: "Offer",
      entityId: offer.id,
      tx,
    });
  });

  await notify({
    userId: offer.createdByUserId,
    type: "offer_accepted",
    title: "Tilbudet ditt ble akseptert",
    body: `${offer.title} ble akseptert av forbrukeren. Du får kontaktinformasjon hvis forbrukeren deler den.`,
    linkUrl: `/bedrift/app/tilbud`,
    email: true,
  });
  await dispatchWebhookEvent({
    organizationId: offer.organizationId,
    eventType: "offer.accepted",
    payload: { offerId: offer.id, demandRequestId: offer.demandRequestId },
    idempotencyKey: `offer-accepted-${offer.id}`,
  });
  await track("offer_accepted", { userId: user.id, orgId: offer.organizationId });

  revalidatePath(`/app/tilbud/${offer.id}`);
  revalidatePath("/app/tilbud");
  return { ok: true };
}

const declineSchema = z.object({
  offerId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export async function declineOffer(input: {
  offerId: string;
  reason?: string;
}): Promise<OfferActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const parsed = declineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ugyldig forespørsel" };

  const offer = await getOwnOffer(parsed.data.offerId, user.id);
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };
  if (offer.status !== "SENT" && offer.status !== "VIEWED") {
    return { ok: false, error: "Tilbudet kan ikke avslås i nåværende status" };
  }

  await db.offer.update({
    where: { id: offer.id },
    data: {
      status: "DECLINED",
      respondedAt: new Date(),
      declineReason: parsed.data.reason || null,
    },
  });
  await logAudit({
    actorUserId: user.id,
    organizationId: offer.organizationId,
    action: "offer.declined",
    entityType: "Offer",
    entityId: offer.id,
  });
  await notify({
    userId: offer.createdByUserId,
    type: "offer_declined",
    title: "Tilbud avslått",
    body: `Tilbudet «${offer.title}» ble avslått${parsed.data.reason ? ` med begrunnelse: ${parsed.data.reason}` : ""}.`,
    linkUrl: "/bedrift/app/tilbud",
  });
  await dispatchWebhookEvent({
    organizationId: offer.organizationId,
    eventType: "offer.declined",
    payload: { offerId: offer.id, demandRequestId: offer.demandRequestId },
    idempotencyKey: `offer-declined-${offer.id}`,
  });

  revalidatePath(`/app/tilbud/${offer.id}`);
  revalidatePath("/app/tilbud");
  return { ok: true };
}

export async function toggleShortlist(offerId: string): Promise<OfferActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const offer = await getOwnOffer(offerId, user.id);
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };

  await db.offer.update({
    where: { id: offer.id },
    data: { isShortlisted: !offer.isShortlisted },
  });
  revalidatePath(`/app/tilbud/${offer.id}`);
  revalidatePath("/app/tilbud");
  return { ok: true };
}

const reportSchema = z.object({
  offerId: z.string().min(1),
  reason: z.string().trim().min(5, "Beskriv hva som er galt").max(1000),
});

export async function reportOffer(input: {
  offerId: string;
  reason: string;
}): Promise<OfferActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig rapport" };
  }
  const offer = await getOwnOffer(parsed.data.offerId, user.id);
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };

  await db.offerReport.create({
    data: { offerId: offer.id, reporterUserId: user.id, reason: parsed.data.reason },
  });
  await logAudit({
    actorUserId: user.id,
    organizationId: offer.organizationId,
    action: "offer.reported",
    entityType: "Offer",
    entityId: offer.id,
  });
  revalidatePath(`/app/tilbud/${offer.id}`);
  return { ok: true };
}

/**
 * Starts (or finds) the conversation tied to an offer so the consumer can ask
 * questions pseudonymously.
 */
export async function startConversation(offerId: string): Promise<OfferActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const offer = await getOwnOffer(offerId, user.id);
  if (!offer) return { ok: false, error: "Fant ikke tilbudet" };

  const conversation = await db.conversation.upsert({
    where: {
      demandRequestId_organizationId: {
        demandRequestId: offer.demandRequestId,
        organizationId: offer.organizationId,
      },
    },
    create: {
      demandRequestId: offer.demandRequestId,
      offerId: offer.id,
      consumerId: user.id,
      organizationId: offer.organizationId,
    },
    update: {},
  });

  return { ok: true, conversationId: conversation.id };
}

/** Marks an offer as viewed (called from the consumer offer detail page). */
export async function markOfferViewed(offerId: string): Promise<void> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const offer = await getOwnOffer(offerId, user.id);
  if (!offer || offer.status !== "SENT") return;

  await db.offer.update({
    where: { id: offer.id },
    data: { status: "VIEWED", viewedAt: new Date() },
  });
  await dispatchWebhookEvent({
    organizationId: offer.organizationId,
    eventType: "offer.viewed",
    payload: { offerId: offer.id, demandRequestId: offer.demandRequestId },
    idempotencyKey: `offer-viewed-${offer.id}`,
  });
  await track("offer_viewed", { userId: user.id, orgId: offer.organizationId });
}
