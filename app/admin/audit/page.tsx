import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { formatDateTime, cn } from "@/lib/utils";
import Link from "next/link";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { side?: string; logg?: string };
}) {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const page = Math.max(1, parseInt(searchParams.side ?? "1", 10) || 1);
  const logType = searchParams.logg === "tilgang" ? "tilgang" : "audit";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit-logg</h1>
        <p className="text-sm text-muted-foreground">
          Alle tilstandsendringer og all tilgang til persondata logges.
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/audit"
          className={cn(
            "rounded-full border px-3 py-1 text-sm",
            logType === "audit"
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          Handlinger (AuditLog)
        </Link>
        <Link
          href="/admin/audit?logg=tilgang"
          className={cn(
            "rounded-full border px-3 py-1 text-sm",
            logType === "tilgang"
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          Datatilgang (DataAccessLog)
        </Link>
      </div>

      {logType === "audit" ? <AuditTable page={page} /> : <AccessTable page={page} />}
    </div>
  );
}

async function AuditTable({ page }: { page: number }) {
  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      include: {
        actorUser: { select: { email: true, role: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.auditLog.count(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Handlinger ({total})</CardTitle>
        <CardDescription>Hvem gjorde hva, når – med før/etter der det er relevant.</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tidspunkt</TableHead>
            <TableHead>Aktør</TableHead>
            <TableHead>Handling</TableHead>
            <TableHead>Entitet</TableHead>
            <TableHead>Bedrift</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </TableCell>
              <TableCell className="text-sm">
                {entry.actorUser?.email ?? "System"}
                {entry.actorUser && (
                  <Badge variant="muted" className="ml-1 text-[10px]">
                    {entry.actorUser.role}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entry.action}</code>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {entry.entityType} · {entry.entityId.slice(0, 10)}…
              </TableCell>
              <TableCell className="text-sm">{entry.organization?.name ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardContent>
        <Pagination
          page={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          hrefFor={(p) => `/admin/audit?side=${p}`}
        />
      </CardContent>
    </Card>
  );
}

async function AccessTable({ page }: { page: number }) {
  const [entries, total] = await Promise.all([
    db.dataAccessLog.findMany({
      include: {
        actorUser: { select: { email: true, role: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.dataAccessLog.count(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datatilgang ({total})</CardTitle>
        <CardDescription>
          Lesinger, avsløringer og eksport av persondata. IP-adresser lagres kun hashet.
        </CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tidspunkt</TableHead>
            <TableHead>Aktør</TableHead>
            <TableHead>Handling</TableHead>
            <TableHead>Dataomfang</TableHead>
            <TableHead>Begrunnelse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </TableCell>
              <TableCell className="text-sm">
                {entry.actorUser?.email ?? "System"}
                {entry.organization && (
                  <span className="block text-xs text-muted-foreground">
                    {entry.organization.name}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{entry.action}</code>
              </TableCell>
              <TableCell className="text-xs">{entry.dataScope}</TableCell>
              <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                {entry.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CardContent>
        <Pagination
          page={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          hrefFor={(p) => `/admin/audit?logg=tilgang&side=${p}`}
        />
      </CardContent>
    </Card>
  );
}
