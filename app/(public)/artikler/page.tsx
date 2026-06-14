import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Artikler og guider",
  description:
    "Guider om strømavtaler, mobilabonnement og forsikring: hva du bør sammenligne, hvordan du unngår telefonsalg og hva bedriftene faktisk trenger for å gi tilbud.",
  path: "/artikler",
});

export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  strom: "Strøm",
  mobilabonnement: "Mobil",
  forsikring: "Forsikring",
};

export default async function ArtiklerPage() {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "Artikler", path: "/artikler" },
        ])}
      />
      <div className="container py-16">
        <h1 className="text-3xl font-bold">Artikler og guider</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Uavhengige guider som hjelper deg å forstå hva du bør sammenligne – og hvordan du får
          gode tilbud uten å gi fra deg kontaktinformasjonen din.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/artikler/${article.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {article.categorySlug && (
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[article.categorySlug] ?? article.categorySlug}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>
                  <CardTitle className="text-lg leading-snug">{article.title}</CardTitle>
                  <CardDescription>{article.excerpt}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
