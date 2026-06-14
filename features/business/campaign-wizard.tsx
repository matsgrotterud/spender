"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  estimateCampaignAction,
  createCampaignAction,
} from "@/features/business/actions";
import type { FieldDef } from "@/features/categories/types";
import type { PriceBreakdownLine } from "@/lib/pricing/engine";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Calculator, Users } from "lucide-react";

interface CampaignWizardProps {
  categories: { slug: string; name: string; offerFields: FieldDef[] }[];
  templates: {
    id: string;
    name: string;
    categorySlug: string;
    payload: { title: string; summary: string; payload: Record<string, unknown> };
  }[];
}

interface Estimate {
  recipientCount: number;
  creditCostPerRecipient: number;
  totalCreditCost: number;
  breakdown: PriceBreakdownLine[];
}

export function CampaignWizard({ categories, templates }: CampaignWizardProps) {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [region, setRegion] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState("");
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [templateValues, setTemplateValues] = useState<{
    title: string;
    summary: string;
    payload: Record<string, unknown>;
  } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const category = categories.find((c) => c.slug === categorySlug);
  const categoryTemplates = templates.filter((t) => t.categorySlug === categorySlug);

  async function refreshEstimate() {
    setEstimating(true);
    setError(null);
    const result = await estimateCampaignAction({
      categorySlug,
      criteria: {
        region: region || undefined,
        maxAgeDays: maxAgeDays ? parseInt(maxAgeDays, 10) : undefined,
      },
    });
    setEstimating(false);
    if (result.ok && result.estimate) {
      setEstimate(result.estimate);
    } else {
      setError(result.error ?? "Kunne ikke beregne");
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of category.offerFields) {
      if (field.type === "boolean") {
        payload[field.key] = formData.get(field.key) === "on";
      } else {
        const value = formData.get(field.key);
        if (value !== null && value !== "") payload[field.key] = String(value);
      }
    }

    const result = await createCampaignAction({
      name: String(formData.get("name") ?? ""),
      categorySlug,
      criteria: {
        region: region || undefined,
        maxAgeDays: maxAgeDays ? parseInt(maxAgeDays, 10) : undefined,
      },
      template: {
        title: String(formData.get("title") ?? ""),
        summary: String(formData.get("summary") ?? ""),
        payload,
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke opprette kampanjen");
      return;
    }
    router.push(`/bedrift/app/kampanjer/${result.campaignId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/bedrift/app/kampanjer"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle kampanjer
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Ny kampanje</h1>
        <p className="text-sm text-muted-foreground">
          Tilbudet sendes kun til aktive forespørsler dere ikke allerede har gitt tilbud på.
          Mottakere dedupliseres automatisk.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Målgruppe</CardTitle>
            <CardDescription>Hvilke forespørsler skal motta tilbudet?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Kampanjenavn</Label>
              <Input id="name" name="name" required maxLength={120} placeholder="F.eks. «Vårkampanje spotpris»" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  id="category"
                  value={categorySlug}
                  onChange={(e) => {
                    setCategorySlug(e.target.value);
                    setEstimate(null);
                    setTemplateValues(null);
                    setFormKey((k) => k + 1);
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Region (valgfritt)</Label>
                <Input
                  id="region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setEstimate(null);
                  }}
                  placeholder="F.eks. Oslo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxAge">Maks alder (dager)</Label>
                <Input
                  id="maxAge"
                  type="number"
                  min={1}
                  max={60}
                  value={maxAgeDays}
                  onChange={(e) => {
                    setMaxAgeDays(e.target.value);
                    setEstimate(null);
                  }}
                  placeholder="F.eks. 14"
                />
              </div>
            </div>

            <Button type="button" variant="outline" disabled={estimating} onClick={refreshEstimate}>
              <Calculator className="h-4 w-4" aria-hidden />
              {estimating ? "Beregner …" : "Beregn mottakere og pris"}
            </Button>

            {estimate && (
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-primary" aria-hidden />
                  {estimate.recipientCount} matchende forespørsler ·{" "}
                  {estimate.creditCostPerRecipient} kreditter per mottaker ·{" "}
                  totalt ~{estimate.totalCreditCost} kreditter
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {estimate.breakdown.map((line, index) => (
                    <li key={index} className="flex justify-between">
                      <span>{line.description}</span>
                      <span>{line.effect}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Tilbudsmal</CardTitle>
            <CardDescription>
              Tilbudet alle mottakerne får. Bruk en lagret mal eller fyll ut feltene.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryTemplates.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="templateSelect">Bruk lagret mal</Label>
                <Select
                  id="templateSelect"
                  defaultValue=""
                  onChange={(e) => {
                    const t = categoryTemplates.find((x) => x.id === e.target.value);
                    if (t) {
                      setTemplateValues(t.payload);
                      setFormKey((k) => k + 1);
                    }
                  }}
                >
                  <option value="">Ingen mal</option>
                  {categoryTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div key={formKey} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  maxLength={150}
                  defaultValue={templateValues?.title ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="summary">Oppsummering</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  required
                  maxLength={600}
                  defaultValue={templateValues?.summary ?? ""}
                />
              </div>
              {category && (
                <DynamicFormFields
                  fields={category.offerFields}
                  defaultValues={templateValues?.payload ?? {}}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Alert variant="info">
          <AlertTitle>Antispam-regler</AlertTitle>
          <AlertDescription>
            Maks 3 kampanjekjøringer per time. Forespørsler dere allerede har sendt tilbud på
            hoppes over, og kreditter trekkes kun for faktisk sendte tilbud.
          </AlertDescription>
        </Alert>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Oppretter …" : "Opprett kampanje (utkast)"}
        </Button>
      </form>
    </div>
  );
}
