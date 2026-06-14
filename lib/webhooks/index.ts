/**
 * Outgoing webhooks to business endpoints.
 *
 * Deliveries are persisted (WebhookDelivery) with idempotency keys, signed
 * with HMAC-SHA256 (X-Spender-Signature) and retried up to 3 times.
 *
 * PRIVACY RULE: webhook payloads only ever contain data the organization is
 * already entitled to (its own offers, public snapshots, consent *events*
 * without the contact data itself).
 */
import { db } from "@/lib/db";
import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";

export type WebhookEventType =
  | "offer.sent"
  | "offer.viewed"
  | "offer.accepted"
  | "offer.declined"
  | "contact_access.granted"
  | "contact_access.withdrawn"
  | "conversation.message_created"
  | "demand_request.created_matching_saved_search"
  | "campaign.completed"
  | "webhook.test";

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  "offer.sent",
  "offer.viewed",
  "offer.accepted",
  "offer.declined",
  "contact_access.granted",
  "contact_access.withdrawn",
  "conversation.message_created",
  "demand_request.created_matching_saved_search",
  "campaign.completed",
];

export function signPayload(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

async function attemptDelivery(deliveryId: string): Promise<void> {
  const delivery = await db.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhookEndpoint: true },
  });
  if (!delivery || delivery.status === "DELIVERED") return;

  const body = JSON.stringify({
    id: delivery.id,
    type: delivery.eventType,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payloadJson,
  });

  try {
    const res = await fetch(delivery.webhookEndpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Spender-Event": delivery.eventType,
        "X-Spender-Signature": signPayload(delivery.webhookEndpoint.secret, body),
        "X-Spender-Delivery": delivery.id,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "DELIVERED", attempts: { increment: 1 }, deliveredAt: new Date() },
      });
      return;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const attempts = delivery.attempts + 1;
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempts,
        status: attempts >= 3 ? "FAILED" : "PENDING",
        lastError: err instanceof Error ? err.message : "Ukjent feil",
      },
    });
  }
}

/**
 * Queues and dispatches a webhook event to all matching active endpoints of
 * the organization. Fire-and-forget: never blocks or breaks the calling flow.
 */
export async function dispatchWebhookEvent(params: {
  organizationId: string;
  eventType: WebhookEventType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const endpoints = await db.webhookEndpoint.findMany({
      where: { organizationId: params.organizationId, isActive: true },
    });

    for (const endpoint of endpoints) {
      const events = endpoint.eventsJson as string[];
      if (!events.includes(params.eventType) && !events.includes("*")) continue;

      const idempotencyKey = params.idempotencyKey
        ? `${endpoint.id}:${params.idempotencyKey}`
        : undefined;

      if (idempotencyKey) {
        const existing = await db.webhookDelivery.findUnique({ where: { idempotencyKey } });
        if (existing) continue;
      }

      const delivery = await db.webhookDelivery.create({
        data: {
          webhookEndpointId: endpoint.id,
          eventType: params.eventType,
          payloadJson: params.payload as Prisma.InputJsonValue,
          idempotencyKey,
        },
      });

      // In-process async delivery; a Redis-backed queue can replace this by
      // swapping lib/queue without touching callers.
      void attemptDelivery(delivery.id);
    }
  } catch (err) {
    console.error("[webhooks] dispatch failed", err);
  }
}

/** Retries pending deliveries – callable from a cron/queue worker. */
export async function retryPendingDeliveries(): Promise<number> {
  const pending = await db.webhookDelivery.findMany({
    where: { status: "PENDING", attempts: { gt: 0, lt: 3 } },
    take: 50,
  });
  for (const delivery of pending) {
    await attemptDelivery(delivery.id);
  }
  return pending.length;
}
