// ============================================================================
// Source: apps/web/app/sitemap.ts
// Version: 2.0.0 — 2026-08-24
// Why: Surface every published listing, category and city to search engines.
//      Discovery for a directory comes overwhelmingly from organic search.
//
//      v2 — geography comes from lib/seo/geo-index.ts instead of the 8 curated
//      configs, and the MIN_INDEXABLE floor now applies to province and city
//      pages too, not just city×category. Before this the sitemap announced 8
//      cities and 45 city×category pages while 43 cities and 168 combinations
//      cleared the bar — and it announced /provinces/prince-edward-island,
//      /provinces/nova-scotia and /provinces/new-brunswick, which have zero
//      listings each. An advertised empty page is the "هموطن دبی" mistake in
//      docs/10-seo-playbook.md §5.2, committed against ourselves.
// Env / Identity: Reads only public rows through the request-scoped client, so
//      unpublished listings can never leak into the sitemap.
// ============================================================================
import type { MetadataRoute } from "next";

import { PROVINCES, PUBLIC_STATUSES } from "@goplaza/core";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { cityCategoryCount, getGeoIndex, isIndexable, provinceCount } from "@/lib/seo/geo-index";

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
  "/channels",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.baseUrl;

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  const supabase = await createSupabaseServerClient();

  // One pass over the directory answers every "is this place worth a page"
  // question below, so the sitemap and the pages agree on the same counts.
  const geo = await getGeoIndex();

  // Provinces: only the ones that actually hold listings. A province that
  // gains its third listing appears here on the next revalidate — no list to
  // edit (docs/12-seo-architecture.md §13.2).
  for (const province of PROVINCES) {
    if (!isIndexable(provinceCount(geo, province.slug))) continue;
    entries.push({
      url: `${base}/provinces/${province.slug}`,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  // Cities: every real city in the data over the floor, not the 8 curated
  // configs. Richmond Hill (763), North York (457) and Thornhill (257) had
  // live pages that nothing ever announced.
  for (const { config, count } of geo.cities) {
    if (!isIndexable(count)) continue;
    entries.push({
      url: `${base}/cities/${config.slug}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

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

  // City × category — the long-tail engine, and the highest-intent pages on
  // the site ("دندانپزشک ایرانی ریچموندهیل"). Only combinations that clear the
  // floor, so the sitemap never advertises a noindex page.
  for (const cat of Object.values(CATEGORY_DETAILS)) {
    for (const { config } of geo.cities) {
      if (!isIndexable(cityCategoryCount(geo, config.slug, cat.slug))) continue;
      entries.push({
        url: `${base}/cities/${config.slug}/${cat.slug}`,
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

  // Channels. Only what the public can actually open: published, and not past
  // its confirmation date — the same read-time rule the page itself applies.
  // An entry for a lapsed row would be a soft 404.
  const { data: channelCats } = await supabase.from("channel_categories").select("slug");
  for (const c of channelCats ?? []) {
    entries.push({ url: `${base}/channels/category/${c.slug}`, changeFrequency: "weekly", priority: 0.5 });
  }
  const { data: channels } = await supabase
    .from("channels")
    .select("slug, updated_at")
    .eq("status", "published")
    .or(`confirm_by.is.null,confirm_by.gt.${new Date().toISOString()}`);

  for (const c of channels ?? []) {
    entries.push({
      url: `${base}/channels/${c.slug}`,
      lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.6,
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
