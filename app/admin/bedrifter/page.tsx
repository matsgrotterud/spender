import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { OrganizationStatus } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";

const STATUS_TABS: { value: OrganizationStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Alle" },
  { value: "PENDING_REVIEW", label: "Til godkjenning" },
  { value: "VERIFIED", label: "Godkjent" },
  { value: "SUSPENDED", label: "Suspendert" },
  { value: "REJECTED", label: "Avvist" },
];

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const statusFilter = STATUS_TABS.some((t) => t.value === searchParams.status)
    ? (searchParams.status as OrganizationStatus | "ALL")
    : "ALL";

  const organizations = await db.organization.findMany({
    where: statusFilter === "ALL" ? {} : { status: statusFilter },
    include: {
      _count: { select: { members: true, offers: true } },
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bedrifter</h1>
        <p className="text-sm text-muted-foreground">
          Gjennomgå, godkjenn og administrer registrerte bedrifter.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "ALL" ? "/admin/bedrifter" : `/admin/bedrifter?status=${tab.value}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              statusFilter === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bedrift</TableHead>
              <TableHead>Org.nr</TableHead>
              <TableHead>Brreg</TableHead>
              <TableHead>Medlemmer</TableHead>
              <TableHead>Tilbud</TableHead>
              <TableHead>Registrert</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Ingen bedrifter i dette filteret.
                </TableCell>
              </TableRow>
            )}
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link
                    href={`/admin/bedrifter/${org.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{org.orgNumber}</TableCell>
                <TableCell>
                  {org.verifications[0] ? (
                    <Badge
                      variant={org.verifications[0].status === "PASSED" ? "success" : "secondary"}
                    >
                      {org.verifications[0].status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{org._count.members}</TableCell>
                <TableCell>{org._count.offers}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(org.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={org.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
