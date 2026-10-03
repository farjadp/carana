// ============================================================================
// Source: apps/web/app/robots.ts
// Version: 1.2.0 — 2026-10-02
// Why: Keep private areas out of the index and point crawlers at the sitemap.
//      Also advertises llms.txt, which has no standard discovery mechanism —
//      a Sitemap: line is the only thing most crawlers already read.
//
//      v1.2 disallows /search and /claim?…. Both are dynamic, uncacheable
//      pages that cost database work per hit, and neither is meant for an
//      index: /search is noindex, and /claim?businessId=… canonicalises to
//      /claim. Their link graphs are effectively infinite — every /search
//      page links 20+ filter variants of itself, every listing links its own
//      /claim — and a crawler walking them on 2 Oct was ~19k searches a week,
//      91% of them empty, mostly combinations no person types («خورشت مرغ» under
//      real-estate). Bare /claim stays crawlable; it is a real page.
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
      disallow: ["/admin", "/dashboard", "/profile", "/auth", "/api", "/account", "/search", "/claim?"],
    },
    sitemap: `${env.baseUrl}/sitemap.xml`,
    // Deliberately no `host:`. Google dropped support for the Host directive
    // years ago and Bing never honoured it as a cross-domain signal; on
    // charana.ca it read as a consolidation instruction that did nothing.
    // The 301 in proxy.ts is what actually moves the domain.
  };
}
