"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveArticle, deleteArticle } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Trash2 } from "lucide-react";

interface ArticleEditorProps {
  categories: { slug: string; name: string }[];
  article?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    categorySlug: string | null;
    status: string;
    seoTitle: string | null;
    seoDescription: string | null;
  };
}

export function ArticleEditor({ article, categories }: ArticleEditorProps) {
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
    const result = await saveArticle({
      articleId: article?.id,
      data: {
        slug: String(formData.get("slug") ?? ""),
        title: String(formData.get("title") ?? ""),
        excerpt: String(formData.get("excerpt") ?? ""),
        body: String(formData.get("body") ?? ""),
        categorySlug: String(formData.get("categorySlug") ?? "") || undefined,
        status: String(formData.get("status") ?? "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED",
        seoTitle: String(formData.get("seoTitle") ?? "") || undefined,
        seoDescription: String(formData.get("seoDescription") ?? "") || undefined,
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre");
      return;
    }
    setSaved(true);
    if (!article) {
      router.push(`/admin/innhold/artikler/${result.id}`);
      return;
    }
    router.refresh();
  }

  async function onDelete() {
    if (!article) return;
    if (!window.confirm("Slette artikkelen permanent?")) return;
    setLoading(true);
    await deleteArticle(article.id);
    router.push("/admin/innhold");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/innhold"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alt innhold
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{article ? "Rediger artikkel" : "Ny artikkel"}</h1>
        {article && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={loading}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Slett
          </Button>
        )}
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
            <CardTitle className="text-base">Innhold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">Tittel</Label>
                <Input id="title" name="title" required defaultValue={article?.title ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug (/artikler/…)</Label>
                <Input
                  id="slug"
                  name="slug"
                  required
                  pattern="[a-z0-9-]+"
                  defaultValue={article?.slug ?? ""}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excerpt">Ingress</Label>
              <Textarea id="excerpt" name="excerpt" required rows={2} defaultValue={article?.excerpt ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Brødtekst (Markdown)</Label>
              <Textarea
                id="body"
                name="body"
                required
                rows={20}
                className="font-mono text-sm"
                defaultValue={article?.body ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="categorySlug">Kategori (valgfritt)</Label>
                <Select id="categorySlug" name="categorySlug" defaultValue={article?.categorySlug ?? ""}>
                  <option value="">Ingen</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={article?.status ?? "DRAFT"}>
                  <option value="DRAFT">Utkast</option>
                  <option value="PUBLISHED">Publisert</option>
                  <option value="ARCHIVED">Arkivert</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="seoTitle">SEO-tittel (valgfritt)</Label>
              <Input id="seoTitle" name="seoTitle" defaultValue={article?.seoTitle ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seoDescription">SEO-beskrivelse (valgfritt)</Label>
              <Input
                id="seoDescription"
                name="seoDescription"
                defaultValue={article?.seoDescription ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={loading}>
          {loading ? "Lagrer …" : "Lagre artikkel"}
        </Button>
      </form>
    </div>
  );
}
