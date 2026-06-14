"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePlan } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatNok } from "@/lib/utils";

interface PlanItem {
  id: string;
  slug: string;
  name: string;
  monthlyPriceNok: number;
  includedCredits: number;
  maxSeats: number;
  maxActiveCampaigns: number;
  featuresJson: string;
  isActive: boolean;
  activeSubscriptions: number;
}

export function PlanManager({ plans }: { plans: PlanItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>, planId: string) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updatePlan({
      planId,
      data: {
        name: String(formData.get("name") ?? ""),
        monthlyPriceNok: Number(formData.get("monthlyPriceNok") ?? 0),
        includedCredits: Number(formData.get("includedCredits") ?? 0),
        maxSeats: Number(formData.get("maxSeats") ?? 1),
        maxActiveCampaigns: Number(formData.get("maxActiveCampaigns") ?? 0),
        featuresJson: String(formData.get("featuresJson") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre planen");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">
                  {plan.name} <span className="font-mono text-xs text-muted-foreground">({plan.slug})</span>
                </CardTitle>
                <CardDescription>
                  {plan.activeSubscriptions} aktive abonnement
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={plan.isActive ? "success" : "muted"}>
                  {plan.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(editingId === plan.id ? null : plan.id)}
                >
                  {editingId === plan.id ? "Lukk" : "Rediger"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingId === plan.id ? (
              <form onSubmit={(e) => onSubmit(e, plan.id)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1.5">
                    <Label>Navn</Label>
                    <Input name="name" required defaultValue={plan.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pris (NOK/mnd)</Label>
                    <Input name="monthlyPriceNok" type="number" min={0} required defaultValue={plan.monthlyPriceNok} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kreditter/mnd</Label>
                    <Input name="includedCredits" type="number" min={0} required defaultValue={plan.includedCredits} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maks brukere</Label>
                    <Input name="maxSeats" type="number" min={1} required defaultValue={plan.maxSeats} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maks kampanjer</Label>
                    <Input name="maxActiveCampaigns" type="number" min={0} required defaultValue={plan.maxActiveCampaigns} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Funksjoner (JSON)</Label>
                  <Textarea
                    name="featuresJson"
                    required
                    rows={8}
                    spellCheck={false}
                    className="font-mono text-xs"
                    defaultValue={plan.featuresJson}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="h-4 w-4" />
                  Aktiv (kan velges av bedrifter)
                </label>
                <Button type="submit" disabled={loading}>
                  {loading ? "Lagrer …" : "Lagre"}
                </Button>
              </form>
            ) : (
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <p>
                  <span className="text-muted-foreground">Pris:</span>{" "}
                  {formatNok(plan.monthlyPriceNok)}/mnd
                </p>
                <p>
                  <span className="text-muted-foreground">Kreditter:</span> {plan.includedCredits}
                </p>
                <p>
                  <span className="text-muted-foreground">Brukere:</span> {plan.maxSeats}
                </p>
                <p>
                  <span className="text-muted-foreground">Kampanjer:</span>{" "}
                  {plan.maxActiveCampaigns}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
