import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSetupChecklist } from "@/lib/env";
import { RETENTION } from "@/lib/privacy/retention";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default async function AdminSystemPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const checklist = getSetupChecklist();

  const [failedWebhooks, pendingDeliveries, recentEvents] = await Promise.all([
    db.webhookDelivery.count({ where: { status: "FAILED" } }),
    db.webhookDelivery.count({ where: { status: "PENDING" } }),
    db.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      _count: true,
      orderBy: { _count: { name: "desc" } },
      take: 12,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">System</h1>
        <p className="text-sm text-muted-foreground">
          Oppsettssjekkliste, integrasjonsstatus og driftshelse.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oppsettssjekkliste</CardTitle>
          <CardDescription>
            «Mock» betyr at funksjonen virker lokalt uten eksterne nøkler. Se
            docs/PROVIDE_KEYS_AND_CONFIG.md for hva som kreves i produksjon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {checklist.map((check) => (
              <li key={check.key} className="flex items-start gap-3 py-3">
                {check.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                ) : check.status === "mock" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {check.label}{" "}
                    <Badge
                      variant={
                        check.status === "ok"
                          ? "success"
                          : check.status === "mock"
                            ? "warning"
                            : "destructive"
                      }
                      className="ml-1"
                    >
                      {check.status === "ok" ? "OK" : check.status === "mock" ? "Mock" : "Mangler"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Feilede leveranser:</span>{" "}
              <span className={failedWebhooks > 0 ? "font-semibold text-destructive" : ""}>
                {failedWebhooks}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Ventende leveranser:</span>{" "}
              {pendingDeliveries}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lagringspolicy</CardTitle>
            <CardDescription>Konfigurerbar via miljøvariabler.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Utkast slettes etter:</span>{" "}
              {RETENTION.draftRequestDays} dager
            </p>
            <p>
              <span className="text-muted-foreground">Aktive forespørsler utløper etter:</span>{" "}
              {RETENTION.activeRequestDays} dager
            </p>
            <p>
              <span className="text-muted-foreground">Lukkede forespørsler beholdes:</span>{" "}
              {RETENTION.closedRequestRetentionDays} dager
            </p>
            <p>
              <span className="text-muted-foreground">Samtykke-/auditlogg:</span>{" "}
              {RETENTION.auditLogYears} år
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hendelser siste 7 dager</CardTitle>
          <CardDescription>Interne analytikkhendelser uten persondata.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen hendelser registrert.</p>
          ) : (
            <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {recentEvents.map((event) => (
                <li key={event.name} className="flex justify-between rounded-md border px-3 py-2">
                  <code className="text-xs">{event.name}</code>
                  <span className="font-semibold">{event._count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
