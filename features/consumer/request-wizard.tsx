"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { previewDemandRequest, createDemandRequest } from "@/features/consumer/actions";
import type { FieldDef, PublicSnapshot } from "@/features/categories/types";
import { DynamicFormFields } from "@/components/forms/dynamic-form-fields";
import { SnapshotView } from "@/components/privacy/snapshot-view";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Eye, Lock, ShieldCheck } from "lucide-react";

interface RequestWizardProps {
  categorySlug: string;
  categoryName: string;
  fields: FieldDef[];
}

function formDataToPayload(form: HTMLFormElement, fields: FieldDef[]): Record<string, unknown> {
  const formData = new FormData(form);
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "boolean") {
      payload[field.key] = formData.get(field.key) === "on";
    } else {
      const value = formData.get(field.key);
      if (value !== null && value !== "") payload[field.key] = String(value);
    }
  }
  return payload;
}

export function RequestWizard({ categorySlug, categoryName, fields }: RequestWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "preview">("form");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState("");
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [privateKeys, setPrivateKeys] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const nextTitle = String(formData.get("title") ?? "");
    const nextPayload = formDataToPayload(event.currentTarget, fields);

    const result = await previewDemandRequest({ categorySlug, payload: nextPayload });
    setLoading(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setError(result.error ?? "Kontroller feltene og prøv igjen.");
      return;
    }

    setTitle(nextTitle);
    setPayload(nextPayload);
    setSnapshot(result.snapshot ?? null);
    setPrivateKeys(result.privateKeys ?? []);
    setStep("preview");
    window.scrollTo({ top: 0 });
  }

  async function onPublish() {
    setLoading(true);
    setError(null);
    const result = await createDemandRequest({ categorySlug, title, payload });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke publisere. Kontroller feltene.");
      setFieldErrors(result.fieldErrors ?? {});
      if (result.fieldErrors) setStep("form");
      return;
    }
    router.push(`/app/behov/${result.requestId}?published=1`);
    router.refresh();
  }

  if (step === "preview" && snapshot) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Tilbake til skjemaet
        </button>

        <div>
          <h1 className="text-2xl font-bold">Forhåndsvisning</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dette – og kun dette – blir synlig for verifiserte bedrifter.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-primary" aria-hidden />
                {title || categoryName}
              </CardTitle>
              <PrivacyBadge level="public" />
            </div>
            <CardDescription>Vises med pseudonymet ditt, aldri navnet ditt.</CardDescription>
          </CardHeader>
          <CardContent>
            <SnapshotView snapshot={snapshot} />
          </CardContent>
        </Card>

        {privateKeys.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="h-4 w-4" aria-hidden /> Forblir privat
                </CardTitle>
                <PrivacyBadge level="private" />
              </div>
              <CardDescription>
                Disse opplysningene lagres kryptert og er aldri synlige for bedrifter:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-wrap gap-2">
                {privateKeys.map((label) => (
                  <li
                    key={label}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert variant="info">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          <AlertTitle>Du bestemmer hvem som får kontakte deg</AlertTitle>
          <AlertDescription>
            Bedrifter svarer med tilbud inne i Spender. Kontaktinformasjonen din deles kun hvis du
            aktivt velger å dele den med én bedrift – og samtykket kan trekkes tilbake.
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={onPublish} disabled={loading} className="flex-1" size="lg">
            {loading ? "Publiserer …" : "Publiser behovet"}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setStep("form")}>
            Endre svar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/app/behov/ny"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Velg en annen kategori
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{categoryName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Merkene viser hva som blir synlig for bedrifter, og hva som forblir privat.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onPreview} className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="title">Tittel på behovet</Label>
              <Input
                id="title"
                name="title"
                required
                minLength={3}
                maxLength={120}
                defaultValue={title}
                placeholder={`F.eks. «${categoryName} til husstanden»`}
              />
              {fieldErrors.title && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.title}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <DynamicFormFields
              fields={fields}
              defaultValues={payload}
              errors={fieldErrors}
              showPrivacyLabels
            />
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Laster forhåndsvisning …" : "Se hva bedriftene får se"}
        </Button>
      </form>
    </div>
  );
}
