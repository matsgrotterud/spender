import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { OrgReviewPanel } from "@/features/admin/org-review-panel";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const org = await db.organization.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: { email: true, lastLoginAt: true } } } },
      verifications: { orderBy: { createdAt: "desc" } },
      subscriptions: {
        where: { status: "ACTIVE" },
        include: { plan: { select: { name: true } } },
        take: 1,
      },
      _count: { select: { offers: true, campaigns: true } },
    },
  });
  if (!org) notFound();

  const verification = org.verifications[0];
  const brregData = verification?.resultJson as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/bedrifter"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle bedrifter
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-muted-foreground">
            Org.nr {org.orgNumber} · registrert {formatDate(org.createdAt)}
          </p>
        </div>
        <StatusBadge status={org.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verifisering (Brønnøysundregistrene)</CardTitle>
            <CardDescription>
              Automatisk oppslag ved registrering. Manuell godkjenning kreves uansett.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {verification ? (
              <>
                <p>
                  <span className="text-muted-foreground">Kilde:</span> {verification.provider}{" "}
                  <Badge
                    variant={verification.status === "PASSED" ? "success" : "secondary"}
                    className="ml-1"
                  >
                    {verification.status}
                  </Badge>
                </p>
                {brregData && (
                  <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(brregData, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Ingen verifiseringsdata.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivitet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nettside:</span> {org.website ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Abonnement:</span>{" "}
              {org.subscriptions[0]?.plan.name ?? "Ingen aktiv plan"}
            </p>
            <p>
              <span className="text-muted-foreground">Tilbud sendt:</span> {org._count.offers}
            </p>
            <p>
              <span className="text-muted-foreground">Kampanjer:</span> {org._count.campaigns}
            </p>
            {org.suspendedReason && (
              <p className="text-destructive">
                <span className="text-muted-foreground">Suspensjonsårsak:</span>{" "}
                {org.suspendedReason}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medlemmer ({org.members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {org.members.map((member) => (
              <li key={member.id} className="flex items-center justify-between py-2">
                <span>{member.user.email}</span>
                <span className="text-xs text-muted-foreground">
                  {member.role} · sist innlogget{" "}
                  {member.user.lastLoginAt ? formatDateTime(member.user.lastLoginAt) : "aldri"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <OrgReviewPanel organizationId={org.id} status={org.status} />
    </div>
  );
}
