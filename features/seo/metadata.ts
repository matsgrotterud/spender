import type { Metadata } from "next";
import { env } from "@/lib/env";

interface PageMeta {
  title: string;
  description: string;
  path: string;
  /** Disallow indexing (private/marketplace pages). */
  noIndex?: boolean;
  ogType?: "website" | "article";
}

export const SITE_NAME = "Spender";

/** Builds consistent metadata with canonical URL, OpenGraph and X/Twitter cards. */
export function buildMetadata(meta: PageMeta): Metadata {
  const url = `${env.appUrl}${meta.path}`;
  const fullTitle = meta.path === "/" ? meta.title : `${meta.title} | ${SITE_NAME}`;
  return {
    title: fullTitle,
    description: meta.description,
    alternates: { canonical: url },
    robots: meta.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: fullTitle,
      description: meta.description,
      url,
      siteName: SITE_NAME,
      locale: "nb_NO",
      type: meta.ogType ?? "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: meta.description,
    },
  };
}
