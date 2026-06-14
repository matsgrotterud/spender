"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  subscribeToPlan,
  cancelSubscription,
  buyCredits,
} from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatNok, formatDate, cn } from "@/lib/utils";
import { Check, Coins } from "lucide-react";

interface PlanItem {
  id: string;
  slug: string;
  name: string;
  monthlyPriceNok: number;
  includedCredits: number;
  maxSeats: number;
  maxActiveCampaigns: number;
  features: Record<string, unknown>;
}

const FEATURE_LABELS: Record<string, string> = {
  savedSearches: "Lagrede søk",
  offerTemplates: "Tilbudsmaler",
  bulkCampaigns: "Bulk-kampanjer",
  advancedCampaigns: "Avanserte kampanjer",
  apiAccess: "API-tilgang",
  webhooks: "Webhooks",
  analytics: "Innsikt og analyse",
  sso: "SSO (kommer)",
  dedicatedSupport: "Dedikert support",
};

const CREDIT_PACKAGES = [100, 250, 500];

export function BillingPanel({
  plans,
  currentPlan,
  creditBalance,
  canManage,
}: {
  plans: PlanItem[];
  currentPlan: {
    planId: string;
    planName: string;
    monthlyPriceNok: number;
    periodEnd: string | null;
  } | null;
  creditBalance: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubscribe(planId: string) {
    setBusy(planId);
    setError(null);
    const result = await subscribeToPlan(planId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke endre abonnement");
      return;
    }
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return;
    }
    router.refresh();
  }

  async function onCancel() {
    if (!window.confirm("Si opp abonnementet? Dere beholder ubrukte kreditter.")) return;
    setBusy("cancel");
    const result = await cancelSubscription();
    setBusy(null);
    if (!result.ok) setError(result.error ?? "Kunne ikke si opp");
    router.refresh();
  }

  async function onBuyCredits(amount: number) {
    setBusy(`credits-${amount}`);
    setError(null);
    const result = await buyCredits(amount);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke kjøpe kreditter");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-warning" aria-hidden />
            <div>
              <p className="text-2xl font-bold">{creditBalance} kreditter</p>
              <p className="text-xs text-muted-foreground">
                {currentPlan
                  ? `${currentPlan.planName}-plan${
                      currentPlan.periodEnd
                        ? ` · fornyes ${formatDate(new Date(currentPlan.periodEnd))}`
                        : ""
                    }`
                  : "Ingen aktiv plan"}
              </p>
            </div>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {CREDIT_PACKAGES.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => onBuyCredits(amount)}
                >
                  {busy === `credits-${amount}` ? "Kjøper …" : `Kjøp ${amount}`}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.planId === plan.id;
          const isEnterprise = plan.slug === "enterprise";
          const enabledFeatures = Object.entries(plan.features)
            .filter(([, value]) => value === true)
            .map(([key]) => FEATURE_LABELS[key] ?? key);

          return (
            <Card key={plan.id} className={cn(isCurrent && "border-primary ring-1 ring-primary")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge>Aktiv</Badge>}
                </div>
                <CardDescription>
                  {isEnterprise ? (
                    <span className="text-lg font-bold text-foreground">Etter avtale</span>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-foreground">
                        {formatNok(plan.monthlyPriceNok)}
                      </span>{" "}
                      /mnd
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                    {plan.includedCredits} kreditter/mnd
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                    {plan.maxSeats} brukere
                  </li>
                  {plan.maxActiveCampaigns > 0 && (
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                      {plan.maxActiveCampaigns} aktive kampanjer
                    </li>
                  )}
                  {enabledFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              {canManage && (
                <CardFooter>
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={busy !== null}
                      onClick={onCancel}
                    >
                      {busy === "cancel" ? "Avslutter …" : "Si opp"}
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Kontakt salg
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={busy !== null}
                      onClick={() => onSubscribe(plan.id)}
                    >
                      {busy === plan.id ? "Aktiverer …" : currentPlan ? "Bytt plan" : "Velg plan"}
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
