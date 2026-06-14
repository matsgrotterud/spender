import Link from "next/link";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCreditBalance } from "@/lib/pricing/credits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, timeAgo } from "@/lib/utils";
import { Coins, Send, CheckCircle2, Store } from "lucide-react";

export default async function BusinessOverviewPage() {
  const { user, organization } = await requireOrgMembership();

  const [credits, subscription, sentCount, acceptedCount, newRequests, notifications] =
    await Promise.all([
      getCreditBalance(organization.id),
      db.subscription.findFirst({
        where: { organizationId: organization.id, status: "ACTIVE" },
        include: { plan: true },
      }),
      db.offer.count({ where: { organizationId: organization.id, status: { not: "DRAFT" } } }),
      db.offer.count({ where: { organizationId: organization.id, status: "ACCEPTED" } }),
      db.demandRequest.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          offers: { none: { organizationId: organization.id } },
        },
        include: { category: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const stats = [
    {
      icon: Coins,
      label: "Kredittsaldo",
      value: String(credits),
      sub: subscription ? `Plan: ${subscription.plan.name}` : "Ingen aktiv plan",
    },
    { icon: Send, label: "Tilbud sendt", value: String(sentCount), sub: "totalt" },
    {
      icon: CheckCircle2,
      label: "Aksepterte tilbud",
      value: String(acceptedCount),
      sub: sentCount > 0 ? `${Math.round((acceptedCount / sentCount) * 100)} % aksept` : "–",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Oversikt</h1>
          <p className="text-sm text-muted-foreground">{organization.name}</p>
        </div>
        <StatusBadge status={organization.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">
                  {stat.label} · {stat.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-4 w-4 text-primary" aria-hidden /> Nye forespørsler i markedet
            </CardTitle>
            <CardDescription>Aktive behov dere ikke har sendt tilbud på.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {newRequests.length === 0 ? (
              <EmptyState title="Ingen nye forespørsler" description="Sjekk igjen senere." />
            ) : (
              newRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/bedrift/app/marked/${request.id}`}
                  className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{request.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.category.name}
                      {request.region && ` · ${request.region}`} · {timeAgo(request.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}
            <Link
              href="/bedrift/app/marked"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
            >
              Se hele markedet
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Siste varsler</CardTitle>
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
    </div>
  );
}
