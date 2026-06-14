import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${env.appUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${env.appUrl}/strom`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${env.appUrl}/mobilabonnement`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${env.appUrl}/forsikring`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${env.appUrl}/bedrift`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${env.appUrl}/artikler`, changeFrequency: "daily", priority: 0.7 },
    { url: `${env.appUrl}/faq`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${env.appUrl}/api-docs`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${env.appUrl}/personvern`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${env.appUrl}/vilkar`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const articles = await db.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...staticRoutes,
    ...articles.map((article) => ({
      url: `${env.appUrl}/artikler/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
