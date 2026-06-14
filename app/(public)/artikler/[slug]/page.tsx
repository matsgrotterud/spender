import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";
import { Markdown } from "@/components/site/markdown";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await db.article.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "PUBLISHED") {
    return buildMetadata({
      title: "Artikkel ikke funnet",
      description: "Artikkelen finnes ikke.",
      path: `/artikler/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    path: `/artikler/${article.slug}`,
    ogType: "article",
  });
}

export default async function ArticlePage({ params }: Props) {
  const article = await db.article.findUnique({ where: { slug: params.slug } });
  if (!article || article.status !== "PUBLISHED") notFound();

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          description: article.excerpt,
          slug: article.slug,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "Artikler", path: "/artikler" },
          { name: article.title, path: `/artikler/${article.slug}` },
        ])}
      />
      <article className="container max-w-3xl py-16">
        <p className="text-sm text-muted-foreground">{formatDate(article.publishedAt)}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{article.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
        <hr className="my-8" />
        <Markdown content={article.body} />
        <div className="mt-12 rounded-lg border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold">Klar til å prøve selv?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Legg inn behovet ditt og få tilbud uten å bli nedringt.
          </p>
          <Link href="/registrer" className={cn(buttonVariants(), "mt-4")}>
            Legg inn behov
          </Link>
        </div>
      </article>
    </>
  );
}
