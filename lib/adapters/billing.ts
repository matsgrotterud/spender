/**
 * BillingProvider adapter: Stripe in production, mock in development.
 *
 * The mock provider activates subscriptions immediately without payment so
 * the whole platform works locally. Switch to Stripe by setting
 * STRIPE_SECRET_KEY, the price IDs and FEATURE_STRIPE=true.
 */
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { grantCredits } from "@/lib/pricing/credits";
import { logAudit } from "@/lib/audit";

export interface SubscribeResult {
  /** URL to redirect the user to (Stripe Checkout) or null when activated directly (mock). */
  redirectUrl: string | null;
  subscriptionId: string;
}

export interface BillingProvider {
  readonly name: string;
  /** Starts (or switches to) a subscription on the given plan. */
  subscribe(params: {
    organizationId: string;
    planId: string;
    actorUserId: string;
  }): Promise<SubscribeResult>;
  cancel(params: { organizationId: string; actorUserId: string }): Promise<void>;
}

function periodEnd(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

class MockBillingProvider implements BillingProvider {
  readonly name = "mock";

  async subscribe(params: { organizationId: string; planId: string; actorUserId: string }) {
    const plan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: params.planId } });

    const subscription = await db.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { organizationId: params.organizationId, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
      const sub = await tx.subscription.create({
        data: {
          organizationId: params.organizationId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd(),
        },
      });
      await tx.organization.update({
        where: { id: params.organizationId },
        data: { billingStatus: "ACTIVE" },
      });
      return sub;
    });

    await grantCredits({
      organizationId: params.organizationId,
      amount: plan.includedCredits,
      type: "GRANT",
      reason: `Inkluderte kreditter – ${plan.name} (mock-fakturering)`,
      referenceType: "subscription",
      referenceId: subscription.id,
      idempotencyKey: `sub-grant-${subscription.id}`,
    });

    await logAudit({
      actorUserId: params.actorUserId,
      organizationId: params.organizationId,
      action: "subscription.started",
      entityType: "Subscription",
      entityId: subscription.id,
      after: { planSlug: plan.slug, provider: "mock" },
    });

    return { redirectUrl: null, subscriptionId: subscription.id };
  }

  async cancel(params: { organizationId: string; actorUserId: string }) {
    await db.subscription.updateMany({
      where: { organizationId: params.organizationId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    await db.organization.update({
      where: { id: params.organizationId },
      data: { billingStatus: "CANCELLED" },
    });
    await logAudit({
      actorUserId: params.actorUserId,
      organizationId: params.organizationId,
      action: "subscription.cancelled",
      entityType: "Organization",
      entityId: params.organizationId,
    });
  }
}

class StripeBillingProvider implements BillingProvider {
  readonly name = "stripe";

  private async stripe() {
    const { default: Stripe } = await import("stripe");
    return new Stripe(env.stripe.secretKey);
  }

  async subscribe(params: { organizationId: string; planId: string; actorUserId: string }) {
    const stripe = await this.stripe();
    const plan = await db.subscriptionPlan.findUniqueOrThrow({ where: { id: params.planId } });
    if (!plan.stripePriceId) {
      throw new Error(
        `Planen ${plan.name} mangler stripePriceId. Sett STRIPE_*_PRICE_ID og oppdater planen.`,
      );
    }

    const org = await db.organization.findUniqueOrThrow({ where: { id: params.organizationId } });
    const existing = await db.subscription.findFirst({
      where: { organizationId: org.id, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    const customerId =
      existing?.stripeCustomerId ??
      (await stripe.customers.create({ name: org.name, metadata: { organizationId: org.id } })).id;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${env.appUrl}/bedrift/app/betaling?status=success`,
      cancel_url: `${env.appUrl}/bedrift/app/betaling?status=cancelled`,
      metadata: { organizationId: org.id, planId: plan.id },
    });

    // The subscription row is created by the Stripe webhook handler
    // (app/api/webhooks/stripe/route.ts) when checkout completes.
    return { redirectUrl: session.url, subscriptionId: "pending-stripe-checkout" };
  }

  async cancel(params: { organizationId: string; actorUserId: string }) {
    const stripe = await this.stripe();
    const sub = await db.subscription.findFirst({
      where: { organizationId: params.organizationId, status: "ACTIVE" },
    });
    if (sub?.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }
    await db.subscription.updateMany({
      where: { organizationId: params.organizationId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    await logAudit({
      actorUserId: params.actorUserId,
      organizationId: params.organizationId,
      action: "subscription.cancelled",
      entityType: "Organization",
      entityId: params.organizationId,
    });
  }
}

export function getBillingProvider(): BillingProvider {
  if (env.features.stripe && env.stripe.secretKey && !env.features.mockBilling) {
    return new StripeBillingProvider();
  }
  return new MockBillingProvider();
}
