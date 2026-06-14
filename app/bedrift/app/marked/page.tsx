import Link from "next/link";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MarketFilters } from "@/features/business/market-filters";
import { SavedSearches } from "@/features/business/saved-searches";
import { timeAgo } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import type { PublicSnapshot } from "@/features/categories/types";

const PAGE_SIZE = 12;

interface SearchParams {
  kategori?: string;
  region?: string;
  alder?: string;
  side?: string;
}

export default async function MarketplacePage({ searchParams }: { searchParams: SearchParams }) {
  const { organization } = await requireOrgMembership();
  const page = Math.max(1, parseInt(searchParams.side ?? "1", 10) || 1);

  const where: Prisma.DemandRequestWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
  };
  if (searchParams.kategori) {
    where.category = { slug: searchParams.kategori };
  }
  if (searchParams.region) {
    where.region = { contains: searchParams.region, mode: "insensitive" };
  }
  if (searchParams.alder) {
    const days = parseInt(searchParams.alder, 10);
    if (!Number.isNaN(days)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      where.createdAt = { gte: cutoff };
    }
  }

  const [requests, total, categories, savedSearches] = await Promise.all([
    db.demandRequest.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
        offers: {
          where: { organizationId: organization.id },
          select: { id: true, status: true },
        },
        _count: { select: { offers: { where: { status: { not: "DRAFT" } } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.demandRequest.count({ where }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, name: true } }),
    db.savedSearch.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (searchParams.kategori) params.set("kategori", searchParams.kategori);
    if (searchParams.region) params.set("region", searchParams.region);
    if (searchParams.alder) params.set("alder", searchParams.alder);
    params.set("side", String(p));
    return `/bedrift/app/marked?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marked</h1>
        <p className="text-sm text-muted-foreground">
          {total} aktive behov. Dere ser kun anonymiserte profiler – aldri identitet.
        </p>
      </div>

      <MarketFilters
        categories={categories}
        current={{
          kategori: searchParams.kategori ?? "",
          region: searchParams.region ?? "",
          alder: searchParams.alder ?? "",
        }}
      />

      <SavedSearches
        searches={savedSearches.map((s) => ({
          id: s.id,
          name: s.name,
          criteria: s.criteriaJson as { categorySlug?: string | null; region?: string | null },
        }))}
        currentFilter={{
          categorySlug: searchParams.kategori,
          region: searchParams.region,
        }}
      />

      {requests.length === 0 ? (
        <EmptyState
          title="Ingen forespørsler matcher filtrene"
          description="Juster filtrene eller kom tilbake senere."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => {
            const snapshot = request.publicSnapshotJson as unknown as PublicSnapshot;
            const previewFields = snapshot.fields.slice(0, 4);
            const ownOffer = request.offers[0];
            return (
              <Link key={request.id} href={`/bedrift/app/marked/${request.id}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{request.category.name}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(request.createdAt)}
                      </span>
                    </div>
                    <CardTitle className="text-base leading-snug">{request.title}</CardTitle>
                    <CardDescription>
                      {request.consumer.consumerProfile?.displayAlias ?? "Forbruker"}
                      {request.region && ` · ${request.region}`} · {request._count.offers}{" "}
                      tilbud mottatt
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {previewFields.map((field) => (
                        <div key={`${field.key}-${field.label}`}>
                          <dt className="text-xs text-muted-foreground">{field.label}</dt>
                          <dd className="font-medium">
                            {typeof field.value === "boolean"
                              ? field.value
                                ? "Ja"
                                : "Nei"
                              : String(field.value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {ownOffer && (
                      <Badge variant="success" className="mt-3">
                        Dere har sendt tilbud
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
