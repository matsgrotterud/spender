import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { OfferReportActions } from "@/features/admin/report-actions";
import { formatDateTime } from "@/lib/utils";
import { Building2, FileQuestion, Send, ShieldAlert, Users } from "lucide-react";

export default async function AdminOverviewPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const [
    pendingOrgs,
    totalOrgs,
    totalConsumers,
    activeRequests,
    offersSent,
    openDsrs,
    openReports,
  ] = await Promise.all([
    db.organization.count({ where: { status: "PENDING_REVIEW" } }),
    db.organization.count(),
    db.user.count({ where: { role: "CONSUMER", deletedAt: null } }),
    db.demandRequest.count({ where: { status: "ACTIVE", deletedAt: null } }),
    db.offer.count({ where: { status: { not: "DRAFT" } } }),
    db.dataSubjectRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.offerReport.findMany({
      where: { status: "OPEN" },
      include: {
        offer: {
          select: {
            title: true,
            organization: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const stats = [
    {
      label: "Bedrifter til godkjenning",
      value: pendingOrgs,
      icon: Building2,
      href: "/admin/bedrifter?status=PENDING_REVIEW",
      highlight: pendingOrgs > 0,
    },
    { label: "Bedrifter totalt", value: totalOrgs, icon: Building2, href: "/admin/bedrifter" },
    { label: "Forbrukere", value: totalConsumers, icon: Users },
    { label: "Aktive forespørsler", value: activeRequests, icon: Send },
    { label: "Tilbud sendt", value: offersSent, icon: Send },
    {
      label: "Åpne DSR-er",
      value: openDsrs,
      icon: FileQuestion,
      href: "/admin/personvern",
      highlight: openDsrs > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Oversikt</h1>
        <p className="text-sm text-muted-foreground">Plattformstatus og ventende oppgaver.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const content = (
            <CardContent className="flex items-center gap-3 pt-6">
              <stat.icon
                className={`h-8 w-8 ${stat.highlight ? "text-warning" : "text-primary"}`}
                aria-hidden
              />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:bg-muted/50">{content}</Card>
            </Link>
          ) : (
            <Card key={stat.label}>{content}</Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden /> Åpne rapporter fra
            forbrukere
          </CardTitle>
          <CardDescription>
            Tilbud som forbrukere har rapportert som spam eller misbruk.
          </CardDescription>
        </CardHeader>
        {openReports.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">Ingen åpne rapporter.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tilbud</TableHead>
                <TableHead>Bedrift</TableHead>
                <TableHead>Årsak</TableHead>
                <TableHead>Rapportert</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {openReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.offer.title}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/bedrifter/${report.offer.organization.id}`}
                      className="text-primary hover:underline"
                    >
                      {report.offer.organization.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{report.reason}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(report.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell>
                    <OfferReportActions reportId={report.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
