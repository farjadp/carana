// ============================================================================
// Source: apps/web/app/sitemap.ts
// Version: 1.0.0 — 2026-08-21
// Why: Surface every published listing, category and city to search engines.
//      Discovery for a directory comes overwhelmingly from organic search.
// Env / Identity: Reads only public rows through the request-scoped client, so
//      unpublished listings can never leak into the sitemap.
// ============================================================================
import type { MetadataRoute } from "next";

import { PROVINCES, PUBLIC_STATUSES } from "@goplaza/core";
import { cityConfigs } from "@/lib/data/cities";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { MIN_INDEXABLE, countCategoryCities } from "@/lib/seo/local";

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
  "/pricing",
  "/features",
  "/jobs",
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

  // City × category pages — only the ones that clear the indexability bar,
  // so the sitemap never advertises a noindex page.
  for (const cat of Object.values(CATEGORY_DETAILS)) {
    const perCity = await countCategoryCities(supabase, cat.slug, cat.name);
    for (const { city, count } of perCity) {
      if (count < MIN_INDEXABLE) continue;
      entries.push({
        url: `${base}/cities/${city.slug}/${cat.slug}`,
        changeFrequency: "daily",
        priority: 0.75,
      });
    }
  }

  // Blog
  entries.push({ url: `${base}/blog`, changeFrequency: "daily", priority: 0.7 });
  const { data: blogCats } = await supabase.from("blog_categories").select("slug");
  for (const c of blogCats ?? []) entries.push({ url: `${base}/blog/category/${c.slug}`, changeFrequency: "daily", priority: 0.5 });
  const { data: posts } = await supabase.from("blog_posts").select("slug, updated_at").eq("status", "published");
  for (const p of posts ?? []) entries.push({ url: `${base}/blog/${p.slug}`, lastModified: p.updated_at ? new Date(p.updated_at) : undefined, changeFrequency: "weekly", priority: 0.7 });

  // Live hiring ads only. A sitemap entry for an expired posting is a
  // guaranteed soft-404, and Google penalises exactly that on JobPosting.
  const { data: jobs } = await supabase
    .from("job_posts")
    .select("slug, updated_at")
    .eq("status", "published")
    .is("closed_at", null)
    .gt("expires_at", new Date().toISOString());

  for (const job of jobs ?? []) {
    entries.push({
      url: `${base}/jobs/${job.slug}`,
      lastModified: job.updated_at ? new Date(job.updated_at) : undefined,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  // Paginated: an unbounded select stops at 1,000 rows without erroring, which
  // had been submitting 1,000 of 5,120 listings to Google.
  const businesses = await fetchAllRows<{ slug: string | null; updated_at: string | null }>(() =>
    supabase
      .from("businesses")
      .select("slug, updated_at")
      .in("status", PUBLIC_STATUSES)
      .not("slug", "is", null)
      .order("id")
  );

  for (const business of businesses) {
    entries.push({
      url: `${base}/businesses/${business.slug}`,
      lastModified: business.updated_at ? new Date(business.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
