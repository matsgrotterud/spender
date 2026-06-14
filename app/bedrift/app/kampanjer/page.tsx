import Link from "next/link";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function CampaignsPage() {
  const { organization } = await requireOrgMembership();
  const campaigns = await db.bulkCampaign.findMany({
    where: { organizationId: organization.id },
    include: {
      category: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kampanjer</h1>
          <p className="text-sm text-muted-foreground">
            Send samme tilbud til alle aktive forespørsler som matcher kriteriene. Duplikater
            filtreres automatisk.
          </p>
        </div>
        <Link href="/bedrift/app/kampanjer/ny" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden /> Ny kampanje
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          title="Ingen kampanjer"
          description="Opprett en kampanje for å nå mange matchende forespørsler samtidig."
          action={
            <Link href="/bedrift/app/kampanjer/ny" className={cn(buttonVariants({ size: "sm" }))}>
              Opprett kampanje
            </Link>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Navn</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Mottakere</TableHead>
                <TableHead>Kreditter</TableHead>
                <TableHead>Opprettet</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link
                      href={`/bedrift/app/kampanjer/${campaign.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>{campaign.category.name}</TableCell>
                  <TableCell>
                    {campaign.status === "DRAFT"
                      ? `~${campaign.estimatedRecipientCount}`
                      : campaign._count.recipients}
                  </TableCell>
                  <TableCell>
                    {campaign.status === "COMPLETED"
                      ? campaign.actualCreditCost
                      : `~${campaign.estimatedCreditCost}`}
                  </TableCell>
                  <TableCell>{formatDate(campaign.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={campaign.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
