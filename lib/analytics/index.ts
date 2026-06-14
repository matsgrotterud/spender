/**
 * Internal analytics. Events land in the AnalyticsEvent table by default;
 * a PostHog adapter forwards them when POSTHOG_KEY is set.
 *
 * Privacy rules:
 *  - properties must never contain direct identifiers (no email, name, phone)
 *  - no cross-site tracking; anonymous web events respect cookie consent
 */
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type AnalyticsEventName =
  | "consumer_registered"
  | "request_created"
  | "request_published"
  | "offer_sent"
  | "offer_viewed"
  | "offer_accepted"
  | "contact_shared"
  | "business_registered"
  | "business_verified"
  | "campaign_sent"
  | "subscription_started";

export interface AnalyticsProvider {
  readonly name: string;
  capture(event: {
    name: AnalyticsEventName;
    userId?: string;
    orgId?: string;
    properties?: Record<string, string | number | boolean | null>;
  }): Promise<void>;
}

class DatabaseAnalyticsProvider implements AnalyticsProvider {
  readonly name = "internal";
  async capture(event: Parameters<AnalyticsProvider["capture"]>[0]) {
    try {
      await db.analyticsEvent.create({
        data: {
          name: event.name,
          userId: event.userId,
          orgId: event.orgId,
          properties: event.properties ?? undefined,
        },
      });
    } catch (err) {
      console.error("[analytics] failed to record event", event.name, err);
    }
  }
}

class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly name = "posthog";
  private internal = new DatabaseAnalyticsProvider();

  async capture(event: Parameters<AnalyticsProvider["capture"]>[0]) {
    await this.internal.capture(event);
    try {
      await fetch(`${env.posthog.host}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: env.posthog.key,
          event: event.name,
          distinct_id: event.userId ?? event.orgId ?? "server",
          properties: event.properties ?? {},
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // analytics must never break product flows
    }
  }
}

let provider: AnalyticsProvider | undefined;

export function getAnalytics(): AnalyticsProvider {
  if (!provider) {
    provider = env.posthog.key
      ? new PostHogAnalyticsProvider()
      : new DatabaseAnalyticsProvider();
  }
  return provider;
}

export async function track(
  name: AnalyticsEventName,
  params?: {
    userId?: string;
    orgId?: string;
    properties?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await getAnalytics().capture({ name, ...params });
}
