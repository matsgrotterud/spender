import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CampaignRunPanel } from "@/features/business/campaign-run-panel";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { organization } = await requireOrgMembership();

  const campaign = await db.bulkCampaign.findFirst({
    where: { id: params.id, organizationId: organization.id },
    include: {
      category: { select: { name: true } },
      recipients: {
        include: {
          demandRequest: {
            select: {
              id: true,
              title: true,
              consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!campaign) notFound();

  const template = campaign.offerTemplateJson as {
    title?: string;
    summary?: string;
  } | null;

  return (
    <div className="space-y-6">
      <Link
        href="/bedrift/app/kampanjer"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle kampanjer
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">
            {campaign.category.name} · opprettet {formatDateTime(campaign.createdAt)}
          </p>
        </div>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Mottakere:</span>{" "}
              ~{campaign.estimatedRecipientCount}
            </p>
            <p>
              <span className="text-muted-foreground">Kreditter:</span>{" "}
              ~{campaign.estimatedCreditCost}
            </p>
            {campaign.status === "COMPLETED" && (
              <p>
                <span className="text-muted-foreground">Faktisk forbruk:</span>{" "}
                {campaign.actualCreditCost} kreditter
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tilbudsmal</CardTitle>
            <CardDescription>Innholdet som sendes til hver mottaker.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{template?.title}</p>
            <p className="mt-1 text-muted-foreground">{template?.summary}</p>
          </CardContent>
        </Card>
      </div>

      <CampaignRunPanel campaignId={campaign.id} status={campaign.status} />

      {campaign.recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mottakere ({campaign.recipients.length})</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forespørsel</TableHead>
                <TableHead>Forbruker</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.recipients.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell>
                    <Link
                      href={`/bedrift/app/marked/${recipient.demandRequest.id}`}
                      className="text-primary hover:underline"
                    >
                      {recipient.demandRequest.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {recipient.demandRequest.consumer.consumerProfile?.displayAlias}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={recipient.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {recipient.errorMessage ?? "—"}
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
