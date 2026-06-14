import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, CheckCircle2, Eye, Send } from "lucide-react";

export default async function InsightsPage() {
  const { organization } = await requireOrgMembership();
  const orgId = organization.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [sent, viewed, accepted, declined, sentLast30, creditSpend, byCategory] =
    await Promise.all([
      db.offer.count({ where: { organizationId: orgId, status: { not: "DRAFT" } } }),
      db.offer.count({
        where: { organizationId: orgId, status: { in: ["VIEWED", "ACCEPTED", "DECLINED"] } },
      }),
      db.offer.count({ where: { organizationId: orgId, status: "ACCEPTED" } }),
      db.offer.count({ where: { organizationId: orgId, status: "DECLINED" } }),
      db.offer.count({
        where: { organizationId: orgId, status: { not: "DRAFT" }, sentAt: { gte: thirtyDaysAgo } },
      }),
      db.creditLedger.aggregate({
        where: { organizationId: orgId, type: "SPEND", createdAt: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
      }),
      db.offer.groupBy({
        by: ["categoryId"],
        where: { organizationId: orgId, status: { not: "DRAFT" } },
        _count: true,
      }),
    ]);

  const categories = await db.category.findMany({
    where: { id: { in: byCategory.map((c) => c.categoryId) } },
    select: { id: true, name: true },
  });
  const categoryName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const viewRate = sent > 0 ? Math.round((viewed / sent) * 100) : 0;
  const acceptRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

  const stats = [
    { label: "Tilbud sendt totalt", value: sent, icon: Send },
    { label: "Åpningsrate", value: `${viewRate}%`, icon: Eye },
    { label: "Aksepteringsrate", value: `${acceptRate}%`, icon: CheckCircle2 },
    { label: "Sendt siste 30 dager", value: sentLast30, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Innsikt</h1>
        <p className="text-sm text-muted-foreground">
          Resultater for tilbudene deres. Tallene er aggregerte og inneholder ikke persondata.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <stat.icon className="h-8 w-8 text-primary" aria-hidden />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utfall</CardTitle>
            <CardDescription>Status på alle sendte tilbud.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Akseptert" value={accepted} total={sent} color="bg-success" />
            <Row label="Avslått" value={declined} total={sent} color="bg-destructive" />
            <Row
              label="Venter på svar"
              value={sent - accepted - declined}
              total={sent}
              color="bg-primary"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per kategori</CardTitle>
            <CardDescription>Antall tilbud sendt per kategori.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {byCategory.length === 0 && (
              <p className="text-muted-foreground">Ingen tilbud sendt ennå.</p>
            )}
            {byCategory.map((row) => (
              <Row
                key={row.categoryId}
                label={categoryName[row.categoryId] ?? "Ukjent"}
                value={row._count}
                total={sent}
                color="bg-primary"
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kredittforbruk siste 30 dager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {Math.abs(creditSpend._sum.amount ?? 0)}{" "}
            <span className="text-sm font-normal text-muted-foreground">kreditter</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
