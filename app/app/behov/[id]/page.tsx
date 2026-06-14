import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { SnapshotView } from "@/components/privacy/snapshot-view";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequestStatusActions } from "@/features/consumer/request-status-actions";
import type { PublicSnapshot, ConsumerFormSchema } from "@/features/categories/types";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Eye, Lock } from "lucide-react";

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { published?: string };
}) {
  const user = await requireUser(["CONSUMER"]);
  const request = await db.demandRequest.findFirst({
    where: { id: params.id, consumerId: user.id, deletedAt: null },
    include: {
      category: true,
      offers: {
        where: { status: { not: "DRAFT" } },
        include: { organization: { select: { name: true } }, comparisonScore: true },
        orderBy: { sentAt: "desc" },
      },
    },
  });
  if (!request) notFound();

  const snapshot = request.publicSnapshotJson as unknown as PublicSnapshot;
  const privatePayload = decryptJson<Record<string, unknown>>(request.encryptedPrivatePayload);
  const formSchema = request.category.consumerFormSchemaJson as unknown as ConsumerFormSchema;
  const snapshotKeys = new Set(snapshot.fields.map((f) => f.key));
  const privateFields = formSchema.fields.filter((f) => {
    const value = privatePayload[f.key];
    return value !== undefined && value !== "" && !snapshotKeys.has(f.key);
  });

  return (
    <div className="space-y-6">
      {searchParams.published && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <AlertTitle>Behovet er publisert</AlertTitle>
          <AlertDescription>
            Verifiserte bedrifter kan nå se den anonymiserte profilen og sende deg tilbud. Du får
            varsel når tilbudene kommer.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <p className="text-sm text-muted-foreground">
            {request.category.name} · Opprettet {formatDate(request.createdAt)}
            {request.expiresAt && ` · Utløper ${formatDate(request.expiresAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} />
          <RequestStatusActions requestId={request.id} status={request.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" aria-hidden /> Synlig for bedrifter
              </CardTitle>
              <PrivacyBadge level="public" />
            </div>
            <CardDescription>Den anonymiserte profilen bedriftene ser.</CardDescription>
          </CardHeader>
          <CardContent>
            <SnapshotView snapshot={snapshot} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" aria-hidden /> Privat
              </CardTitle>
              <PrivacyBadge level="private" />
            </div>
            <CardDescription>Lagret kryptert. Kun du kan se dette.</CardDescription>
          </CardHeader>
          <CardContent>
            {privateFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen private felter i dette behovet.
              </p>
            ) : (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {privateFields.map((field) => (
                  <div key={field.key}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium">
                      {typeof privatePayload[field.key] === "boolean"
                        ? privatePayload[field.key]
                          ? "Ja"
                          : "Nei"
                        : String(privatePayload[field.key])}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tilbud ({request.offers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {request.offers.length === 0 ? (
            <EmptyState
              title="Ingen tilbud ennå"
              description="Bedriftene trenger litt tid. Du får varsel når det første tilbudet kommer."
            />
          ) : (
            request.offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/app/tilbud/${offer.id}`}
                className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{offer.title}</p>
                  <p className="text-xs text-muted-foreground">{offer.organization.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {offer.comparisonScore && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {offer.comparisonScore.score}/100
                    </span>
                  )}
                  <StatusBadge status={offer.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
