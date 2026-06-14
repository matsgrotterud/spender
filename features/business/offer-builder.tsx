"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sendOfferAction, previewOfferCost } from "@/features/business/actions";
import type { FieldDef } from "@/features/categories/types";
import type { PriceBreakdownLine } from "@/lib/pricing/engine";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Coins, Send } from "lucide-react";

interface OfferTemplateOption {
  id: string;
  name: string;
  payload: { title: string; summary: string; payload: Record<string, unknown> };
}

interface OfferBuilderProps {
  demandRequestId: string;
  categoryName: string;
  fields: FieldDef[];
  organizationVerified: boolean;
  templates: OfferTemplateOption[];
}

export function OfferBuilder({
  demandRequestId,
  categoryName,
  fields,
  organizationVerified,
  templates,
}: OfferBuilderProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<{ credits: number; breakdown: PriceBreakdownLine[] } | null>(null);
  const [templateValues, setTemplateValues] = useState<{
    title: string;
    summary: string;
    payload: Record<string, unknown>;
  } | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    previewOfferCost(demandRequestId).then((result) => {
      if (result.ok && result.priceCredits !== undefined) {
        setPrice({ credits: result.priceCredits, breakdown: result.priceBreakdown ?? [] });
      }
    });
  }, [demandRequestId]);

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setTemplateValues(template.payload);
    setFormKey((k) => k + 1);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === "boolean") {
        payload[field.key] = formData.get(field.key) === "on";
      } else {
        const value = formData.get(field.key);
        if (value !== null && value !== "") payload[field.key] = String(value);
      }
    }

    const saveAsTemplate = formData.get("saveAsTemplate") === "on";
    const result = await sendOfferAction({
      demandRequestId,
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      payload,
      validUntil: String(formData.get("validUntil") ?? "") || undefined,
      saveAsTemplate,
      templateName: saveAsTemplate ? String(formData.get("templateName") ?? "") : undefined,
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kontroller feltene");
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    router.refresh();
  }

  if (!organizationVerified) {
    return (
      <Alert variant="warning">
        <AlertTitle>Venter på godkjenning</AlertTitle>
        <AlertDescription>
          Bedriften må godkjennes av Spender før dere kan sende tilbud. Dere får beskjed så snart
          gjennomgangen er ferdig.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send tilbud – {categoryName}</CardTitle>
        <CardDescription>
          Tilbudet sendes pseudonymt til forbrukeren inne i Spender. Strukturerte felter gjør
          tilbudet sammenlignbart.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length > 0 && (
          <div className="mb-5 space-y-1.5">
            <Label htmlFor="template">Bruk mal</Label>
            <Select id="template" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">Ingen mal</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <form key={formKey} onSubmit={onSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Tittel</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={150}
              defaultValue={templateValues?.title ?? ""}
              placeholder="F.eks. «Spotpris med lavt påslag»"
            />
            {fieldErrors.title && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">Kort oppsummering</Label>
            <Textarea
              id="summary"
              name="summary"
              required
              maxLength={600}
              defaultValue={templateValues?.summary ?? ""}
              placeholder="Hva gjør tilbudet deres godt for akkurat dette behovet?"
            />
            {fieldErrors.summary && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.summary}</p>
            )}
          </div>

          <DynamicFormFields
            fields={fields}
            defaultValues={templateValues?.payload ?? {}}
            errors={fieldErrors}
          />

          <div className="space-y-1.5">
            <Label htmlFor="validUntil">Gyldig til (valgfritt)</Label>
            <Input id="validUntil" name="validUntil" type="date" />
          </div>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Lagre som mal for senere
            </summary>
            <div className="mt-3 flex items-center gap-3">
              <input type="checkbox" name="saveAsTemplate" id="saveAsTemplate" className="h-4 w-4" />
              <Label htmlFor="saveAsTemplate" className="font-normal">Lagre som mal</Label>
              <Input name="templateName" placeholder="Navn på malen" className="max-w-56" />
            </div>
          </details>

          {price && (
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Coins className="h-4 w-4 text-warning" aria-hidden />
                Pris: {price.credits} kreditter
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {price.breakdown.map((line, index) => (
                  <li key={index} className="flex justify-between">
                    <span>{line.description}</span>
                    <span>{line.effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            <Send className="h-4 w-4" aria-hidden />
            {loading
              ? "Sender …"
              : `Send tilbud${price ? ` (${price.credits} kreditter)` : ""}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
