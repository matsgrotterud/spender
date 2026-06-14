import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { markOfferViewed } from "@/features/offers/consumer-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { OfferActionPanel } from "@/features/offers/offer-action-panel";
import type { OfferSchema } from "@/features/categories/types";
import type { ScoreExplanationItem } from "@/features/offers/scoring";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Building2 } from "lucide-react";

export default async function ConsumerOfferDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(["CONSUMER"]);
  const offer = await db.offer.findFirst({
    where: { id: params.id, demandRequest: { consumerId: user.id, deletedAt: null } },
    include: {
      organization: { select: { name: true, website: true, status: true } },
      demandRequest: { select: { id: true, title: true } },
      category: true,
      comparisonScore: true,
      consentGrants: { where: { status: "ACTIVE", purpose: "contact_access" } },
    },
  });
  if (!offer || offer.status === "DRAFT") notFound();

  if (offer.status === "SENT") {
    await markOfferViewed(offer.id);
  }

  const offerSchema = offer.category.businessOfferSchemaJson as unknown as OfferSchema;
  const payload = offer.offerPayloadJson as Record<string, unknown>;
  const explanation =
    (offer.comparisonScore?.explanationJson as unknown as ScoreExplanationItem[]) ?? [];
  const hasContactGrant = offer.consentGrants.length > 0;

  const fieldsWithValues = offerSchema.fields.filter(
    (f) => payload[f.key] !== undefined && payload[f.key] !== "" && payload[f.key] !== null,
  );

  function display(key: string): string {
    const field = offerSchema.fields.find((f) => f.key === key);
    const value = payload[key];
    if (typeof value === "boolean") return value ? "Ja" : "Nei";
    const optionLabel = field?.options?.find((o) => o.value === value)?.label;
    return optionLabel ?? String(value);
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/app/behov/${offer.demandRequest.id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Tilbake til «{offer.demandRequest.title}»
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{offer.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" aria-hidden />
            {offer.organization.name}
            {offer.validUntil && ` · Gyldig til ${formatDate(offer.validUntil)}`}
          </p>
        </div>
        <StatusBadge status={offer.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tilbudet</CardTitle>
              <CardDescription>{offer.summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {fieldsWithValues.map((field) => (
                  <div key={field.key}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium">{display(field.key)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {offer.comparisonScore && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Poengsum</CardTitle>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                    {offer.comparisonScore.score}/100
                  </span>
                </div>
                <CardDescription>
                  Dette er en forklarbar sammenligning, ikke finansiell rådgivning.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {explanation.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold ${
                          item.points >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {item.points >= 0 ? `+${item.points}` : item.points}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <OfferActionPanel
            offerId={offer.id}
            status={offer.status === "SENT" ? "VIEWED" : offer.status}
            isShortlisted={offer.isShortlisted}
            organizationName={offer.organization.name}
            hasContactGrant={hasContactGrant}
          />
        </div>
      </div>
    </div>
  );
}
