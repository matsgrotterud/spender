import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ApiKeyManager } from "@/features/business/api-key-manager";
import { WebhookManager } from "@/features/business/webhook-manager";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WEBHOOK_EVENT_TYPES } from "@/lib/webhooks";

export default async function IntegrationsPage() {
  const { organization, memberRole } = await requireOrgMembership();
  const canManage = memberRole === "OWNER" || memberRole === "ADMIN";

  const [apiKeys, webhooks, subscription] = await Promise.all([
    db.apiKey.findMany({
      where: { organizationId: organization.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    db.webhookEndpoint.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { deliveries: true } } },
    }),
    db.subscription.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE" },
      include: { plan: true },
    }),
  ]);

  const planFeatures = (subscription?.plan.featuresJson ?? {}) as { apiAccess?: boolean };
  const hasApiAccess = planFeatures.apiAccess === true;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrasjoner</h1>
        <p className="text-sm text-muted-foreground">
          API-nøkler og webhooks for å koble Spender til egne systemer. Se{" "}
          <a href="/api-docs" className="text-primary hover:underline">
            API-dokumentasjonen
          </a>
          .
        </p>
      </div>

      {!hasApiAccess && (
        <Alert variant="info">
          <AlertTitle>API-tilgang krever Pro eller Enterprise</AlertTitle>
          <AlertDescription>
            Oppgrader abonnementet under Betaling for å opprette API-nøkler. Webhooks er
            tilgjengelig på alle planer.
          </AlertDescription>
        </Alert>
      )}

      <ApiKeyManager
        canManage={canManage}
        hasApiAccess={hasApiAccess}
        apiKeys={apiKeys.map((key) => ({
          id: key.id,
          name: key.name,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
          scopes: (key.scopesJson as string[]) ?? [],
        }))}
      />

      <WebhookManager
        canManage={canManage}
        eventTypes={[...WEBHOOK_EVENT_TYPES]}
        endpoints={webhooks.map((endpoint) => ({
          id: endpoint.id,
          url: endpoint.url,
          events: (endpoint.eventsJson as string[]) ?? [],
          isActive: endpoint.isActive,
          deliveries: endpoint._count.deliveries,
          createdAt: endpoint.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
