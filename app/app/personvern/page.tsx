import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { WithdrawConsentButton, DangerZone } from "@/features/privacy/privacy-controls";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDateTime, formatDate } from "@/lib/utils";
import { Download, Eye, FileText, Handshake, History } from "lucide-react";

export default async function PrivacyCenterPage() {
  const user = await requireUser(["CONSUMER"]);

  const [requests, consents, accessLogs, pendingDeletion] = await Promise.all([
    db.demandRequest.findMany({
      where: { consumerId: user.id, deletedAt: null },
      include: {
        category: { select: { name: true } },
        offers: {
          where: { status: { not: "DRAFT" } },
          select: { organization: { select: { id: true, name: true } } },
          distinct: ["organizationId"],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.consentGrant.findMany({
      where: { userId: user.id, purpose: "contact_access" },
      include: {
        organization: { select: { name: true } },
        demandRequest: { select: { title: true } },
      },
      orderBy: { grantedAt: "desc" },
    }),
    db.dataAccessLog.findMany({
      where: { targetUserId: user.id },
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.dataSubjectRequest.findFirst({
      where: { userId: user.id, type: "DELETE", status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  const activeConsents = consents.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personvern og samtykker</h1>
        <p className="text-sm text-muted-foreground">
          Full oversikt: hva som er synlig, hvem som har sett hva, og hvem du har delt
          kontaktinfo med.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" aria-hidden /> Behovene dine
          </CardTitle>
          <CardDescription>
            Hvert behov har en offentlig (anonymisert) og en privat (kryptert) del.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 && (
            <p className="text-sm text-muted-foreground">Ingen behov registrert.</p>
          )}
          {requests.map((request) => (
            <div key={request.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/app/behov/${request.id}`} className="font-medium hover:underline">
                  {request.title}
                </Link>
                <div className="flex items-center gap-2">
                  <PrivacyBadge level="public" />
                  <StatusBadge status={request.status} />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {request.category.name} · Opprettet {formatDate(request.createdAt)}
              </p>
              {request.offers.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Bedrifter som har sendt tilbud:{" "}
                  {request.offers.map((o) => o.organization.name).join(", ")}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4 text-primary" aria-hidden /> Delt kontaktinformasjon
          </CardTitle>
          <CardDescription>
            Bedrifter med aktivt samtykke kan se feltene du valgte. Trekk tilbake når som helst.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {consents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Du har ikke delt kontaktinformasjon med noen bedrifter.
            </p>
          )}
          {consents.map((consent) => {
            const fields = (consent.scopeJson as { fields?: string[] }).fields ?? [];
            const fieldLabels: Record<string, string> = {
              fullName: "navn",
              email: "e-post",
              phone: "telefon",
            };
            return (
              <div
                key={consent.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{consent.organization?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {consent.demandRequest?.title} · Delt:{" "}
                    {fields.map((f) => fieldLabels[f] ?? f).join(", ")} ·{" "}
                    {formatDateTime(consent.grantedAt)}
                  </p>
                </div>
                {consent.status === "ACTIVE" ? (
                  <WithdrawConsentButton grantId={consent.id} />
                ) : (
                  <StatusBadge status="WITHDRAWN_CONSENT" />
                )}
              </div>
            );
          })}
          {activeConsents.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Når du trekker et samtykke, mister bedriften umiddelbart tilgangen, og den plikter å
              slette opplysningene den har mottatt.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" aria-hidden /> Tilgangslogg
          </CardTitle>
          <CardDescription>De siste hendelsene der dataene dine ble berørt.</CardDescription>
        </CardHeader>
        <CardContent>
          {accessLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen registrerte hendelser.</p>
          ) : (
            <ul className="divide-y text-sm">
              {accessLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium">
                      {log.action === "REVEAL_CONTACT" && "Kontaktinfo vist"}
                      {log.action === "GRANT_CONTACT_ACCESS" && "Samtykke gitt"}
                      {log.action === "EXPORT_DATA" && "Data eksportert"}
                      {log.action === "VIEW_OWN_PRIVATE_PAYLOAD" && "Du så egne private data"}
                      {!["REVEAL_CONTACT", "GRANT_CONTACT_ACCESS", "EXPORT_DATA", "VIEW_OWN_PRIVATE_PAYLOAD"].includes(
                        log.action,
                      ) && log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.organization?.name && `${log.organization.name} · `}
                      Omfang: {log.dataScope}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" aria-hidden /> Dine rettigheter
          </CardTitle>
          <CardDescription>
            Du kan trekke tilbake samtykke og be om eksport eller sletting av data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/me/export"
              className={cn(buttonVariants({ variant: "outline" }))}
              download
            >
              <Download className="h-4 w-4" aria-hidden /> Eksporter mine data (JSON)
            </a>
          </div>
          <DangerZone hasPendingDeletion={Boolean(pendingDeletion)} />
        </CardContent>
      </Card>
    </div>
  );
}
