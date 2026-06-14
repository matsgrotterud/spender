"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth/session";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { notify } from "@/lib/notifications";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export interface MessageActionResult {
  ok: boolean;
  error?: string;
}

const sendSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, "Meldingen kan ikke være tom").max(4000),
});

/**
 * Sends a message in a conversation. Allowed for the consumer who owns the
 * conversation or members of the organization side. The consumer side stays
 * pseudonymous: businesses only ever see the display alias.
 */
export async function sendMessage(input: {
  conversationId: string;
  body: string;
}): Promise<MessageActionResult> {
  const user = await requireUserOrThrow();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ugyldig melding" };
  }

  const rate = await checkRateLimit({ key: `msg:${user.id}`, ...RATE_LIMITS.messageSend });
  if (!rate.allowed) return { ok: false, error: "For mange meldinger. Vent litt." };

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: {
      organization: { include: { members: true } },
      demandRequest: true,
      offer: true,
    },
  });
  if (!conversation) return { ok: false, error: "Fant ikke samtalen" };

  const isConsumer = conversation.consumerId === user.id;
  const isOrgMember = conversation.organization.members.some((m) => m.userId === user.id);
  if (!isConsumer && !isOrgMember) return { ok: false, error: "Ingen tilgang til samtalen" };

  await db.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: user.id,
        body: parsed.data.body,
      },
    });
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  });

  if (isConsumer) {
    // Notify the offer creator (or all org members as fallback).
    const recipientId =
      conversation.offer?.createdByUserId ?? conversation.organization.members[0]?.userId;
    if (recipientId) {
      await notify({
        userId: recipientId,
        type: "message_received",
        title: "Ny melding fra forbruker",
        body: "Du har fått en ny melding i en samtale på Spender.",
        linkUrl: `/bedrift/app/meldinger/${conversation.id}`,
        email: true,
      });
    }
    await dispatchWebhookEvent({
      organizationId: conversation.organizationId,
      eventType: "conversation.message_created",
      payload: { conversationId: conversation.id, demandRequestId: conversation.demandRequestId },
    });
  } else {
    await notify({
      userId: conversation.consumerId,
      type: "message_received",
      title: "Ny melding fra bedrift",
      body: `${conversation.organization.name} har svart deg i en samtale.`,
      linkUrl: `/app/meldinger/${conversation.id}`,
      email: true,
    });
  }

  revalidatePath(`/app/meldinger/${conversation.id}`);
  revalidatePath(`/bedrift/app/meldinger/${conversation.id}`);
  return { ok: true };
}
