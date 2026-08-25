// ============================================================================
// Source: apps/web/app/robots.ts
// Version: 1.1.0 — 2026-08-24
// Why: Keep private areas out of the index and point crawlers at the sitemap.
//      Also advertises llms.txt, which has no standard discovery mechanism —
//      a Sitemap: line is the only thing most crawlers already read.
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
      disallow: ["/admin", "/dashboard", "/profile", "/auth", "/api", "/account"],
    },
    sitemap: `${env.baseUrl}/sitemap.xml`,
    // Deliberately no `host:`. Google dropped support for the Host directive
    // years ago and Bing never honoured it as a cross-domain signal; on
    // charana.ca it read as a consolidation instruction that did nothing.
    // The 301 in proxy.ts is what actually moves the domain.
  };
}
