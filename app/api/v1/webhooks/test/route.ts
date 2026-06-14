import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/auth/api-key";
import { dispatchWebhookEvent } from "@/lib/webhooks";

/** Dispatches a webhook.test event to all the organization's active endpoints. */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, "write");
  if (!auth.ok) return auth.response;

  await dispatchWebhookEvent({
    organizationId: auth.ctx.organization.id,
    eventType: "webhook.test",
    payload: { message: "Testhendelse fra Spender", sentAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true, message: "Testhendelse sendt til aktive endepunkter" });
}
