import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";

export default async function ConsumerOffersPage() {
  const user = await requireUser(["CONSUMER"]);
  const requests = await db.demandRequest.findMany({
    where: {
      consumerId: user.id,
      deletedAt: null,
      offers: { some: { status: { not: "DRAFT" } } },
    },
    include: {
      category: true,
      offers: {
        where: { status: { not: "DRAFT" } },
        include: { organization: { select: { name: true } }, comparisonScore: true },
        orderBy: [{ comparisonScore: { score: "desc" } }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tilbud</h1>
        <p className="text-sm text-muted-foreground">
          Tilbudene sortert etter forklarbar poengsum per behov.
        </p>
      </div>

      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        Dette er en forklarbar sammenligning, ikke finansiell rådgivning.
      </p>

      {requests.length === 0 ? (
        <EmptyState
          title="Ingen tilbud ennå"
          description="Når bedrifter svarer på behovene dine, samles tilbudene her."
        />
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <CardTitle className="text-base">{request.title}</CardTitle>
              <CardDescription>
                {request.category.name} · {request.offers.length} tilbud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {request.offers.map((offer) => (
                <Link
                  key={offer.id}
                  href={`/app/tilbud/${offer.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {offer.isShortlisted && (
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
                      )}
                      {offer.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {offer.organization.name}
                      {offer.sentAt && ` · ${timeAgo(offer.sentAt)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {offer.comparisonScore && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {offer.comparisonScore.score}/100
                      </span>
                    )}
                    <StatusBadge status={offer.status} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
