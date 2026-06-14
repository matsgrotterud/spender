import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { logDataAccess } from "@/lib/audit";
import { getConsentedContact } from "@/lib/privacy/consent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { SnapshotView } from "@/components/privacy/snapshot-view";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OfferBuilder } from "@/features/business/offer-builder";
import type { OfferSchema, PublicSnapshot } from "@/features/categories/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { ArrowLeft, Lock, Handshake, MessageSquare } from "lucide-react";

export default async function MarketRequestDetailPage({ params }: { params: { id: string } }) {
  const { user, organization } = await requireOrgMembership();

  const request = await db.demandRequest.findFirst({
    where: { id: params.id, deletedAt: null, status: { in: ["ACTIVE", "PAUSED", "EXPIRED", "CLOSED"] } },
    include: {
      category: true,
      consumer: { select: { id: true, consumerProfile: { select: { displayAlias: true } } } },
      offers: {
        where: { organizationId: organization.id },
        include: { comparisonScore: true },
      },
      conversations: {
        where: { organizationId: organization.id },
        select: { id: true },
      },
      _count: { select: { offers: { where: { status: { not: "DRAFT" } } } } },
    },
  });
  if (!request) notFound();

  // Log that this business viewed the (public) snapshot.
  await logDataAccess({
    actorUserId: user.id,
    targetUserId: request.consumer.id,
    organizationId: organization.id,
    demandRequestId: request.id,
    action: "VIEW_SNAPSHOT",
    dataScope: "public_snapshot",
  });

  const snapshot = request.publicSnapshotJson as unknown as PublicSnapshot;
  const offerSchema = request.category.businessOfferSchemaJson as unknown as OfferSchema;
  const ownOffer = request.offers[0];
  const alias = request.consumer.consumerProfile?.displayAlias ?? "Forbruker";

  const contact = await getConsentedContact({
    organizationId: organization.id,
    demandRequestId: request.id,
    actorUserId: user.id,
    via: "ui",
  });

  const templates = await db.offerTemplate.findMany({
    where: { organizationId: organization.id, categorySlug: request.category.slug },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <Link
        href="/bedrift/app/marked"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tilbake til markedet
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{request.category.name}</Badge>
            <StatusBadge status={request.status} />
          </div>
          <h1 className="mt-2 text-2xl font-bold">{request.title}</h1>
          <p className="text-sm text-muted-foreground">
            {alias} · Publisert {timeAgo(request.createdAt)}
            {request.expiresAt && ` · Utløper ${formatDate(request.expiresAt)}`} ·{" "}
            {request._count.offers} tilbud mottatt
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Behovsprofil</CardTitle>
                <PrivacyBadge level="public" />
              </div>
              <CardDescription>
                Anonymisert oppsummering. Identitet og eksakte detaljer er ikke tilgjengelige.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SnapshotView snapshot={snapshot} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  {contact ? (
                    <>
                      <Handshake className="h-4 w-4 text-success" aria-hidden /> Kontaktinformasjon
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" aria-hidden /> Kontaktinformasjon
                    </>
                  )}
                </CardTitle>
                {contact ? <PrivacyBadge level="consented" /> : <PrivacyBadge level="private" />}
              </div>
            </CardHeader>
            <CardContent>
              {contact ? (
                <div className="space-y-2 text-sm">
                  {contact.fields.fullName && (
                    <p>
                      <span className="text-muted-foreground">Navn:</span>{" "}
                      <strong>{contact.fields.fullName}</strong>
                    </p>
                  )}
                  {contact.fields.email && (
                    <p>
                      <span className="text-muted-foreground">E-post:</span>{" "}
                      <strong>{contact.fields.email}</strong>
                    </p>
                  )}
                  {contact.fields.phone && (
                    <p>
                      <span className="text-muted-foreground">Telefon:</span>{" "}
                      <strong>{contact.fields.phone}</strong>
                    </p>
                  )}
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Delt med samtykke {formatDate(contact.grantedAt)}. Bruk kun til å følge opp
                    dette tilbudet. Visningen er logget.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ikke tilgjengelig før forbrukeren gir samtykke. Forbrukeren kan velge å dele
                  kontaktinfo etter å ha akseptert et tilbud.
                </p>
              )}
            </CardContent>
          </Card>

          {request.conversations[0] && (
            <Link
              href={`/bedrift/app/meldinger/${request.conversations[0].id}`}
              className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
              Åpne samtalen med {alias}
            </Link>
          )}
        </div>

        <div className="lg:col-span-3">
          {ownOffer ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Deres tilbud</CardTitle>
                  <StatusBadge status={ownOffer.status} />
                </div>
                <CardDescription>{ownOffer.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{ownOffer.summary}</p>
                {ownOffer.comparisonScore && (
                  <p className="text-muted-foreground">
                    Sammenligningspoeng hos forbrukeren:{" "}
                    <strong>{ownOffer.comparisonScore.score}/100</strong>
                  </p>
                )}
                <Alert variant="info">
                  <AlertTitle>Én bedrift – ett tilbud</AlertTitle>
                  <AlertDescription>
                    Dere har allerede sendt tilbud på denne forespørselen. Bruk meldinger for å
                    svare på spørsmål fra forbrukeren.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : request.status === "ACTIVE" ? (
            <OfferBuilder
              demandRequestId={request.id}
              categoryName={request.category.name}
              fields={offerSchema.fields}
              organizationVerified={organization.status === "VERIFIED"}
              templates={templates.map((t) => ({
                id: t.id,
                name: t.name,
                payload: t.payloadJson as {
                  title: string;
                  summary: string;
                  payload: Record<string, unknown>;
                },
              }))}
            />
          ) : (
            <Alert>
              <AlertTitle>Forespørselen er ikke aktiv</AlertTitle>
              <AlertDescription>
                Det er ikke mulig å sende tilbud på denne forespørselen nå.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
