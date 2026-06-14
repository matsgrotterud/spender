import Link from "next/link";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const PAGE_SIZE = 20;

export default async function BusinessOffersPage({
  searchParams,
}: {
  searchParams: { side?: string };
}) {
  const { organization } = await requireOrgMembership();
  const page = Math.max(1, parseInt(searchParams.side ?? "1", 10) || 1);

  const [offers, total] = await Promise.all([
    db.offer.findMany({
      where: { organizationId: organization.id, status: { not: "DRAFT" } },
      include: {
        demandRequest: {
          select: {
            id: true,
            title: true,
            consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
          },
        },
        category: { select: { name: true } },
      },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.offer.count({ where: { organizationId: organization.id, status: { not: "DRAFT" } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tilbud</h1>
        <p className="text-sm text-muted-foreground">Alle tilbud dere har sendt ({total}).</p>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          title="Ingen tilbud sendt ennå"
          description="Finn aktuelle forespørsler i markedet og send det første tilbudet."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tilbud</TableHead>
                <TableHead>Forespørsel</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Sendt</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.title}</TableCell>
                  <TableCell>
                    <Link
                      href={`/bedrift/app/marked/${offer.demandRequest.id}`}
                      className="text-primary hover:underline"
                    >
                      {offer.demandRequest.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {offer.demandRequest.consumer.consumerProfile?.displayAlias}
                    </p>
                  </TableCell>
                  <TableCell>{offer.category.name}</TableCell>
                  <TableCell>{formatDate(offer.sentAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={offer.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        hrefFor={(p) => `/bedrift/app/tilbud?side=${p}`}
      />
    </div>
  );
}
