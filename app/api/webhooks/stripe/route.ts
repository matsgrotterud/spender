/**
 * Stripe webhook handler for the subscription lifecycle.
 *
 * Active only when FEATURE_STRIPE=true and the keys are set; otherwise it
 * responds 503 so accidental calls are harmless in mock mode. Signature is
 * verified against STRIPE_WEBHOOK_SECRET.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { grantCredits } from "@/lib/pricing/credits";
import { logAudit } from "@/lib/audit";
import { track } from "@/lib/analytics";

/** Subscription ID lives in different places across Stripe API versions. */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  };
  const raw = inv.subscription ?? inv.parent?.subscription_details?.subscription ?? null;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

export async function POST(request: Request) {
  if (!env.features.stripe || !env.stripe.secretKey || !env.stripe.webhookSecret) {
    return NextResponse.json(
      { error: "Stripe er ikke konfigurert (mock-fakturering er aktiv)" },
      { status: 503 },
    );
  }

  const { default: StripeSdk } = await import("stripe");
  const stripe = new StripeSdk(env.stripe.secretKey);

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Mangler stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripe.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.metadata?.organizationId;
      const planId = session.metadata?.planId;
      const stripeSubscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;
      if (!organizationId || !planId || !stripeSubscriptionId) break;

      const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) break;

      // Idempotent: skip if this Stripe subscription is already recorded.
      const existing = await db.subscription.findUnique({
        where: { stripeSubscriptionId },
      });
      if (existing) break;

      const subscription = await db.$transaction(async (tx) => {
        await tx.subscription.updateMany({
          where: { organizationId, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });
        const sub = await tx.subscription.create({
          data: {
            organizationId,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
            stripeSubscriptionId,
          },
        });
        await tx.organization.update({
          where: { id: organizationId },
          data: { billingStatus: "ACTIVE" },
        });
        return sub;
      });

      await grantCredits({
        organizationId,
        amount: plan.includedCredits,
        type: "GRANT",
        reason: `Inkluderte kreditter – ${plan.name} (Stripe)`,
        referenceType: "subscription",
        referenceId: subscription.id,
        idempotencyKey: `sub-grant-${subscription.id}`,
      });

      await logAudit({
        organizationId,
        action: "subscription.started",
        entityType: "Subscription",
        entityId: subscription.id,
        after: { planSlug: plan.slug, provider: "stripe" },
      });
      await track("subscription_started", {
        orgId: organizationId,
        properties: { plan: plan.slug, provider: "stripe" },
      });
      break;
    }

    case "invoice.paid": {
      // Monthly renewal: extend the period and grant the month's credits.
      const invoice = event.data.object;
      const stripeSubscriptionId = invoiceSubscriptionId(invoice);
      if (!stripeSubscriptionId || invoice.billing_reason !== "subscription_cycle") break;

      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId },
        include: { plan: true },
      });
      if (!subscription) break;

      await db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      await grantCredits({
        organizationId: subscription.organizationId,
        amount: subscription.plan.includedCredits,
        type: "GRANT",
        reason: `Fornyelse – ${subscription.plan.name}`,
        referenceType: "invoice",
        referenceId: invoice.id ?? subscription.id,
        idempotencyKey: `invoice-${invoice.id}`,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const stripeSubscriptionId = invoiceSubscriptionId(invoice);
      if (!stripeSubscriptionId) break;

      const subscription = await db.subscription.findUnique({ where: { stripeSubscriptionId } });
      if (!subscription) break;

      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "PAST_DUE" },
      });
      await db.organization.update({
        where: { id: subscription.organizationId },
        data: { billingStatus: "PAST_DUE" },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object;
      const subscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: stripeSub.id },
      });
      if (!subscription) break;

      await db.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELLED" },
      });
      await db.organization.update({
        where: { id: subscription.organizationId },
        data: { billingStatus: "CANCELLED" },
      });
      await logAudit({
        organizationId: subscription.organizationId,
        action: "subscription.cancelled",
        entityType: "Subscription",
        entityId: subscription.id,
        after: { provider: "stripe", reason: "stripe_subscription_deleted" },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
