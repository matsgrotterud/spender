import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private marketplace and dashboards must never be indexed.
        disallow: ["/app/", "/bedrift/app/", "/admin/", "/api/", "/logg-inn", "/registrer"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
