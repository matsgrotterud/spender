import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function MyRequestsPage() {
  const user = await requireUser(["CONSUMER"]);
  const requests = await db.demandRequest.findMany({
    where: { consumerId: user.id, deletedAt: null },
    include: { category: true, _count: { select: { offers: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mine behov</h1>
          <p className="text-sm text-muted-foreground">
            Alle forespørslene dine – aktive, pausede og lukkede.
          </p>
        </div>
        <Link href="/app/behov/ny" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden /> Nytt behov
        </Link>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="Du har ingen behov ennå"
          description="Beskriv hva du vil ha tilbud på, så kommer tilbudene til deg."
          action={
            <Link href="/app/behov/ny" className={cn(buttonVariants())}>
              Legg inn ditt første behov
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => (
            <Link key={request.id} href={`/app/behov/${request.id}`} className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.category.name} · Opprettet {formatDate(request.createdAt)}
                      {request.expiresAt && ` · Utløper ${formatDate(request.expiresAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {request._count.offers} tilbud
                    </span>
                    <StatusBadge status={request.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
