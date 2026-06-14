import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/features/seo/json-ld";
import { db } from "@/lib/db";
import { CheckCircle2 } from "lucide-react";

export interface CategoryLandingContent {
  slug: string;
  name: string;
  heroTitle: string;
  heroText: string;
  bullets: string[];
  snapshotExample: [string, string][];
  faq: { question: string; answer: string }[];
  articleTag: string;
}

export async function CategoryLanding({ content }: { content: CategoryLandingContent }) {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED", categorySlug: content.articleTag },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: content.name, path: `/${content.slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(content.faq)} />

      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {content.name}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{content.heroText}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/registrer" className={cn(buttonVariants({ size: "lg" }))}>
                Legg inn behov – gratis
              </Link>
              <Link href="/faq" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Hvordan fungerer det?
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container grid gap-10 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Derfor fungerer det bedre</h2>
          <ul className="mt-6 space-y-3">
            {content.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Dette ser bedriftene</CardTitle>
            <CardDescription>
              Anonymisert behovsprofil – aldri navn, e-post eller telefonnummer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {content.snapshotExample.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="border-y bg-card">
        <div className="container py-16">
          <h2 className="text-2xl font-bold">Vanlige spørsmål om {content.name.toLowerCase()}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {content.faq.map((item) => (
              <div key={item.question} className="rounded-lg border bg-background p-5">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {articles.length > 0 && (
        <section className="container py-16">
          <h2 className="text-2xl font-bold">Les mer</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {articles.map((article) => (
              <Link key={article.id} href={`/artikler/${article.slug}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{article.title}</CardTitle>
                    <CardDescription>{article.excerpt}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
