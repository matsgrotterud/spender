import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { DsrActions } from "@/features/admin/dsr-actions";
import { RETENTION } from "@/lib/privacy/retention";
import { formatDateTime } from "@/lib/utils";

const DSR_TYPE_LABELS: Record<string, string> = {
  ACCESS: "Innsyn",
  EXPORT: "Eksport",
  DELETE: "Sletting",
  RECTIFY: "Retting",
  RESTRICT_PROCESSING: "Begrensning",
  OBJECT: "Innsigelse",
};

export default async function AdminPrivacyPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const dsrs = await db.dataSubjectRequest.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Personvern / DSR</h1>
        <p className="text-sm text-muted-foreground">
          Forespørsler fra registrerte (data subject requests) og behandlingsoversikt.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forespørsler</CardTitle>
          <CardDescription>
            Fullføring av en sletteforespørsel anonymiserer kontoen umiddelbart og kan ikke angres.
          </CardDescription>
        </CardHeader>
        {dsrs.length === 0 ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">Ingen forespørsler.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bruker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mottatt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notater</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsrs.map((dsr) => (
                <TableRow key={dsr.id}>
                  <TableCell className="text-sm">{dsr.user.email}</TableCell>
                  <TableCell>
                    <Badge variant={dsr.type === "DELETE" ? "destructive" : "secondary"}>
                      {DSR_TYPE_LABELS[dsr.type] ?? dsr.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(dsr.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={dsr.status} />
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {dsr.adminNotes ?? "—"}
                  </TableCell>
                  <TableCell>
                    {(dsr.status === "OPEN" || dsr.status === "IN_PROGRESS") && (
                      <DsrActions dsrId={dsr.id} type={dsr.type} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behandlingsoversikt (Art. 30)</CardTitle>
          <CardDescription>
            Oversikt over behandlingsaktiviteter. Full dokumentasjon i
            docs/GDPR_AND_PRIVACY_MODEL.md.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Behandling</TableHead>
                <TableHead>Rettslig grunnlag</TableHead>
                <TableHead>Datakategorier</TableHead>
                <TableHead>Lagringstid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Brukerkonto og innlogging</TableCell>
                <TableCell>Avtale (art. 6-1-b)</TableCell>
                <TableCell>E-post, passordhash</TableCell>
                <TableCell>Til sletting</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Forespørsler (behov)</TableCell>
                <TableCell>Avtale (art. 6-1-b)</TableCell>
                <TableCell>Kategorisvar (kryptert), pseudonymt snapshot</TableCell>
                <TableCell>
                  Aktive: {RETENTION.activeRequestDays} dager, lukkede:{" "}
                  {RETENTION.closedRequestRetentionDays} dager
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Kontaktdeling med bedrift</TableCell>
                <TableCell>Samtykke (art. 6-1-a)</TableCell>
                <TableCell>Navn, telefon, e-post (mottakerspesifikt)</TableCell>
                <TableCell>Til samtykke trekkes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Samtykke- og auditlogg</TableCell>
                <TableCell>Rettslig forpliktelse (art. 6-1-c)</TableCell>
                <TableCell>Hendelser, hashede IP-er</TableCell>
                <TableCell>{RETENTION.auditLogYears} år</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Bedriftsverifisering</TableCell>
                <TableCell>Berettiget interesse (art. 6-1-f)</TableCell>
                <TableCell>Org.nr, offentlige registerdata</TableCell>
                <TableCell>Så lenge bedriften er aktiv</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
