// ============================================================================
// Source: apps/web/app/sitemap.ts
// Version: 1.0.0 — 2026-08-21
// Why: Surface every published listing, category and city to search engines.
//      Discovery for a directory comes overwhelmingly from organic search.
// Env / Identity: Reads only public rows through the request-scoped client, so
//      unpublished listings can never leak into the sitemap.
// ============================================================================
import type { MetadataRoute } from "next";

import { PROVINCES, PUBLIC_STATUSES } from "@charana/core";
import { cityConfigs } from "@/lib/data/cities";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Revalidate hourly; listings do not change often enough to justify more.
export const revalidate = 3600;

const STATIC_PATHS = [
  "",
  "/about",
  "/team",
  "/roadmap",
  "/releases",
  "/download",
  "/how-it-works",
  "/story",
  "/trust",
  "/contact",
  "/categories",
  "/cities",
  "/provinces",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/support",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.baseUrl;

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  for (const province of PROVINCES) {
    entries.push({
      url: `${base}/provinces/${province.slug}`,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const city of cityConfigs) {
    entries.push({
      url: `${base}/cities/${city.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const supabase = await createSupabaseServerClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  for (const category of categories ?? []) {
    entries.push({
      url: `${base}/categories/${category.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .in("status", PUBLIC_STATUSES)
    .not("slug", "is", null);

  for (const business of businesses ?? []) {
    entries.push({
      url: `${base}/businesses/${business.slug}`,
      lastModified: business.updated_at ? new Date(business.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
