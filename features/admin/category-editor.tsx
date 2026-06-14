"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveCategory } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft } from "lucide-react";

interface CategoryEditorProps {
  category?: {
    id: string;
    slug: string;
    name: string;
    description: string;
    consumerFormSchemaJson: string;
    businessOfferSchemaJson: string;
    publicSnapshotRulesJson: string;
    isActive: boolean;
  };
}

export function CategoryEditor({ category }: CategoryEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const formData = new FormData(event.currentTarget);
    const result = await saveCategory({
      categoryId: category?.id,
      data: {
        slug: String(formData.get("slug") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        consumerFormSchemaJson: String(formData.get("consumerFormSchemaJson") ?? ""),
        businessOfferSchemaJson: String(formData.get("businessOfferSchemaJson") ?? ""),
        publicSnapshotRulesJson: String(formData.get("publicSnapshotRulesJson") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre");
      return;
    }
    setSaved(true);
    if (!category) {
      router.push(`/admin/kategorier/${result.id}`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/kategorier"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle kategorier
      </Link>

      <div>
        <h1 className="text-2xl font-bold">
          {category ? `Rediger: ${category.name}` : "Ny kategori"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Endringer i snapshot-regler påvirker kun nye forespørsler. Felter med privacy «private»
          vises aldri for bedrifter.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert variant="success">
          <AlertDescription>Lagret.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grunninfo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Navn</Label>
              <Input id="name" name="name" required defaultValue={category?.name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                required
                pattern="[a-z0-9-]+"
                defaultValue={category?.slug ?? ""}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                name="description"
                required
                defaultValue={category?.description ?? ""}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={category?.isActive ?? true}
                className="h-4 w-4"
              />
              Aktiv (synlig for forbrukere og bedrifter)
            </label>
          </CardContent>
        </Card>

        <JsonField
          label="Forbrukerskjema (consumerFormSchemaJson)"
          description="Felter forbrukeren fyller ut. Hvert felt har key, label, type, privacy m.m."
          name="consumerFormSchemaJson"
          defaultValue={category?.consumerFormSchemaJson ?? "{\n  \"fields\": []\n}"}
        />
        <JsonField
          label="Tilbudsskjema (businessOfferSchemaJson)"
          description="Felter bedriften fyller ut i tilbudsbyggeren, pluss scoring-konfigurasjon."
          name="businessOfferSchemaJson"
          defaultValue={category?.businessOfferSchemaJson ?? "{\n  \"fields\": []\n}"}
        />
        <JsonField
          label="Snapshot-regler (publicSnapshotRulesJson)"
          description="Hvordan privat data omdannes til den offentlige oppsummeringen bedrifter ser."
          name="publicSnapshotRulesJson"
          defaultValue={category?.publicSnapshotRulesJson ?? "{\n  \"rules\": []\n}"}
        />

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Lagrer …" : "Lagre kategori"}
        </Button>
      </form>
    </div>
  );
}

function JsonField({
  label,
  description,
  name,
  defaultValue,
}: {
  label: string;
  description: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          name={name}
          required
          rows={14}
          spellCheck={false}
          className="font-mono text-xs"
          defaultValue={defaultValue}
        />
      </CardContent>
    </Card>
  );
}
