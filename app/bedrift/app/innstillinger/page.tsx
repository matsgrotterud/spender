import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";

export default async function BusinessSettingsPage() {
  const { organization, user, memberRole } = await requireOrgMembership();

  const verification = await db.businessVerification.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
        <p className="text-sm text-muted-foreground">Bedriftsprofil og kontostatus.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bedrift</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Navn" value={organization.name} />
          <Field label="Organisasjonsnummer" value={organization.orgNumber} />
          <Field label="Nettside" value={organization.website ?? "—"} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-1">
              <StatusBadge status={organization.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verifisering</CardTitle>
          <CardDescription>
            Verifisering mot Brønnøysundregistrene og manuell godkjenning fra Spender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {verification ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kilde" value={verification.provider} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={verification.status} />
                </div>
              </div>
              <Field
                label="Verifisert"
                value={verification.verifiedAt ? formatDate(verification.verifiedAt) : "Venter"}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ingen verifisering registrert.</p>
          )}

          {organization.status === "PENDING_REVIEW" && (
            <Alert variant="info">
              <AlertTitle>Venter på godkjenning</AlertTitle>
              <AlertDescription>
                Bedriften gjennomgås av Spender. Dere kan utforske markedet, men kan ikke sende
                tilbud før godkjenning. Dette tar normalt 1–2 virkedager.
              </AlertDescription>
            </Alert>
          )}
          {organization.status === "SUSPENDED" && (
            <Alert variant="destructive">
              <AlertTitle>Kontoen er suspendert</AlertTitle>
              <AlertDescription>
                Kontakt support for mer informasjon om hvorfor kontoen er suspendert.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Din bruker</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="E-post" value={user.email} />
          <Field
            label="Rolle i bedriften"
            value={
              { OWNER: "Eier", ADMIN: "Administrator", MEMBER: "Medlem", VIEWER: "Leser" }[
                memberRole
              ] ?? memberRole
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
