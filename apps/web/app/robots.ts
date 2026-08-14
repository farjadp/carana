// ============================================================================
// Source: apps/web/app/robots.ts
// Version: 1.0.0 — 2026-08-21
// Why: Keep private areas out of the index and point crawlers at the sitemap.
// Env / Identity: Public. Uses the canonical origin from env.
// ============================================================================
import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing behind auth should ever be crawled.
      disallow: ["/admin", "/dashboard", "/profile", "/auth", "/api"],
    },
    sitemap: `${env.baseUrl}/sitemap.xml`,
    host: env.baseUrl,
  };
}
