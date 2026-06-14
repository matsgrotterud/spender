import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getCreditBalance } from "@/lib/pricing/credits";
import { env } from "@/lib/env";
import { BillingPanel } from "@/features/business/billing-panel";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";

const LEDGER_TYPE_LABELS: Record<string, string> = {
  GRANT: "Tildelt",
  PURCHASE: "Kjøpt",
  SPEND: "Forbruk",
  REFUND: "Refundert",
  ADJUSTMENT: "Justering",
};

export default async function BillingPage() {
  const { organization, memberRole } = await requireOrgMembership();
  const canManage = memberRole === "OWNER" || memberRole === "ADMIN";

  const [plans, subscription, balance, ledger] = await Promise.all([
    db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceNok: "asc" },
    }),
    db.subscription.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE" },
      include: { plan: true },
    }),
    getCreditBalance(organization.id),
    db.creditLedger.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Betaling</h1>
        <p className="text-sm text-muted-foreground">
          Abonnement, kreditter og forbrukshistorikk for {organization.name}.
        </p>
      </div>

      {!env.features.stripe && (
        <Alert variant="info">
          <AlertTitle>Testmodus for betaling</AlertTitle>
          <AlertDescription>
            Stripe er ikke konfigurert. Abonnement og kredittkjøp simuleres uten reelle trekk. Se
            docs/PROVIDE_KEYS_AND_CONFIG.md for produksjonsoppsett.
          </AlertDescription>
        </Alert>
      )}

      <BillingPanel
        canManage={canManage}
        creditBalance={balance}
        currentPlan={
          subscription
            ? {
                planId: subscription.planId,
                planName: subscription.plan.name,
                monthlyPriceNok: subscription.plan.monthlyPriceNok,
                periodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
              }
            : null
        }
        plans={plans.map((plan) => ({
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          monthlyPriceNok: plan.monthlyPriceNok,
          includedCredits: plan.includedCredits,
          maxSeats: plan.maxSeats,
          maxActiveCampaigns: plan.maxActiveCampaigns,
          features: (plan.featuresJson ?? {}) as Record<string, unknown>,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kreditthistorikk</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen bevegelser ennå.</p>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tidspunkt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Beskrivelse</TableHead>
                  <TableHead className="text-right">Kreditter</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.amount < 0 ? "outline" : "secondary"}>
                        {LEDGER_TYPE_LABELS[entry.type] ?? entry.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entry.reason}</TableCell>
                    <TableCell
                      className={`text-right font-mono text-sm ${
                        entry.amount < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
