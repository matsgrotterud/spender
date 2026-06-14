import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { FileText, Inbox, Bell, Plus } from "lucide-react";

export default async function ConsumerOverviewPage() {
  const user = await requireUser(["CONSUMER"]);

  const [activeRequests, offers, notifications] = await Promise.all([
    db.demandRequest.findMany({
      where: { consumerId: user.id, deletedAt: null, status: { in: ["ACTIVE", "PAUSED"] } },
      include: { category: true, _count: { select: { offers: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.offer.findMany({
      where: {
        demandRequest: { consumerId: user.id, deletedAt: null },
        status: { in: ["SENT", "VIEWED"] },
      },
      include: { organization: { select: { name: true } }, comparisonScore: true },
      orderBy: { sentAt: "desc" },
      take: 5,
    }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oversikt</h1>
          <p className="text-sm text-muted-foreground">
            Behovene dine, nye tilbud og varsler – alt på ett sted.
          </p>
        </div>
        <Link href="/app/behov/ny" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden /> Nytt behov
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" aria-hidden /> Aktive behov
            </CardTitle>
            <CardDescription>Forespørsler bedrifter kan sende tilbud på.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeRequests.length === 0 ? (
              <EmptyState
                title="Ingen aktive behov"
                description="Legg inn et behov for å motta tilbud fra verifiserte bedrifter."
                action={
                  <Link href="/app/behov/ny" className={cn(buttonVariants({ size: "sm" }))}>
                    Legg inn behov
                  </Link>
                }
              />
            ) : (
              activeRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/app/behov/${request.id}`}
                  className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.category.name} · {request._count.offers} tilbud
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="h-4 w-4 text-primary" aria-hidden /> Nye tilbud
            </CardTitle>
            <CardDescription>Tilbud du ikke har besvart ennå.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {offers.length === 0 ? (
              <EmptyState
                title="Ingen ubesvarte tilbud"
                description="Når en bedrift sender deg et tilbud, dukker det opp her."
              />
            ) : (
              offers.map((offer) => (
                <Link
                  key={offer.id}
                  href={`/app/tilbud/${offer.id}`}
                  className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{offer.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {offer.organization.name} · {offer.sentAt ? timeAgo(offer.sentAt) : ""}
                    </p>
                  </div>
                  {offer.comparisonScore && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {offer.comparisonScore.score}/100
                    </span>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" aria-hidden /> Siste varsler
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen varsler ennå.</p>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
