// ============================================================================
// Source: lib/seo/geo-index.ts
// Version: 1.0.0 — 2026-08-24
// Why: One shared, cached picture of "which places do we actually have
//      listings for, and how many". Before this, geography came from a
//      hand-written list of 8 cities in lib/data/cities.ts, so Richmond Hill
//      (763 listings), North York (457) and Thornhill (257) had live pages
//      that no sitemap ever announced — 123 city×category pages invisible to
//      search. It also meant the indexability threshold was applied to
//      city×category only; province and city pages shipped with no floor at
//      all, which is how /provinces/prince-edward-island reached the sitemap
//      with zero listings.
//
//      Everything here is derived from the database at request time. A place
//      that gains its third listing becomes indexable on the next revalidate
//      with no code change — a hard-coded list is exactly the failure mode
//      this replaces (docs/12-seo-architecture.md §13.2).
//
// Env / Identity: Server only. Reads public columns through the caller's
//      client, so RLS still decides what counts.
// ============================================================================
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PROVINCES, PUBLIC_STATUSES, resolveProvince } from "@goplaza/core";
import { citySlug, cityConfigs, dynamicCityConfig, type CityConfig } from "@/lib/data/cities";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { getCategoryAliases } from "@/lib/data/category-aliases";
import { env } from "@/lib/env";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/**
 * City values that are placeholders rather than places. 407 published rows
 * carry «نامشخص»; they must never mint a geography page — "مشاغل ایرانی
 * نامشخص" is not a query — but they must still be reachable from their
 * category page, or they become orphans.
 */
const PLACEHOLDER_CITIES = new Set(["نامشخص", "نا مشخص", "unknown", "n/a", "-", "—"]);

/** Listings below this never get an indexable page of their own. */
export const MIN_INDEXABLE = 3;

export type GeoCity = {
  config: CityConfig;
  /** Listings the city page will actually show, using the same matching. */
  count: number;
};

/**
 * Plain objects, not Maps. This crosses the Next data cache, which serialises
 * through JSON — a Map arrives as `{}` and every count silently reads zero,
 * which would drop the whole sitemap below the threshold.
 */
export type GeoIndex = {
  /** Every real city with at least one listing, densest first. */
  cities: GeoCity[];
  /** `${citySlug}::${categorySlug}` → listings the combo page will show. */
  cityCategory: Record<string, number>;
  /** Province slug → listings. Every province is present; zero means zero. */
  provinces: Record<string, number>;
  totalPublished: number;
  /** Published rows whose city is a placeholder — reachable only by category. */
  placeholderCityCount: number;
};

/** Fold a city string to the form used for equality. */
function key(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * The terms a config claims. Compared for EQUALITY, never substring — see the
 * Richmond / Richmond Hill note in lib/data/cities.ts v2.
 */
export function cityMatchTerms(city: CityConfig): string[] {
  const terms = [city.nameEn, city.nameFa, ...city.neighborhoods];
  return [...new Set(terms.filter(Boolean).map(key))];
}

type Row = { city: string | null; province: string | null; category: string | null };

/**
 * Build the index. One paginated pass over published rows plus one read of
 * `city_aliases` for Persian names — an unbounded select would stop at 1,000
 * rows and silently hide 80 % of the directory (docs/06-gotchas.md).
 */
export async function buildGeoIndex(supabase: SupabaseClient): Promise<GeoIndex> {
  const rows = await fetchAllRows<Row>(() =>
    supabase
      .from("businesses")
      .select("city, province, category")
      .in("status", PUBLIC_STATUSES)
      .order("id")
  );

  const { data: aliasRows } = await supabase.from("city_aliases").select("city_en, aliases");
  const aliases = new Map<string, string>();
  for (const a of aliasRows ?? []) {
    if (!a?.city_en || !a?.aliases) continue;
    // Aliases are space-separated; an N-word English name takes N tokens.
    const words = String(a.city_en).trim().split(/\s+/).length;
    aliases.set(key(String(a.city_en)), String(a.aliases).split(/\s+/).slice(0, words).join(" "));
  }

  // ---- distinct real cities in the data -----------------------------------
  const seen = new Map<string, { nameEn: string; province: string | null; count: number }>();
  let placeholderCityCount = 0;
  for (const r of rows) {
    const raw = r.city?.trim();
    if (!raw) continue;
    if (PLACEHOLDER_CITIES.has(key(raw))) {
      placeholderCityCount++;
      continue;
    }
    const k = key(raw);
    const hit = seen.get(k);
    if (hit) {
      hit.count++;
      if (!hit.province && r.province) hit.province = r.province;
    } else {
      seen.set(k, { nameEn: raw, province: r.province ?? null, count: 1 });
    }
  }

  // Curated configs first so Toronto keeps its GTA-wide neighbourhood list;
  // every other real city gets a config generated from its own data.
  const configs: CityConfig[] = [...cityConfigs];
  const claimed = new Set(configs.map((c) => c.slug));
  for (const [k, v] of seen) {
    const slug = citySlug(v.nameEn);
    if (claimed.has(slug)) continue;
    if (configs.some((c) => cityMatchTerms(c).includes(k) && c.slug === slug)) continue;
    claimed.add(slug);
    const province = resolveProvince(v.province);
    configs.push(
      dynamicCityConfig(v.nameEn, {
        nameFa: aliases.get(k) ?? null,
        province: province?.code ?? v.province,
        provinceFa: province?.name ?? null,
      })
    );
  }

  // ---- counts, using the same matching the pages use ----------------------
  const cityCategory: Record<string, number> = {};
  const cities: GeoCity[] = [];

  // category value → canonical category slug, so free-text spellings roll up
  // the same way getCategoryAliases resolves them on the page.
  const categoryOf = new Map<string, string>();
  for (const detail of Object.values(CATEGORY_DETAILS)) {
    for (const alias of getCategoryAliases(detail.slug, detail.name)) {
      categoryOf.set(key(alias), detail.slug);
    }
  }

  for (const config of configs) {
    const terms = new Set(cityMatchTerms(config));
    let count = 0;
    for (const r of rows) {
      const c = r.city?.trim();
      if (!c || !terms.has(key(c))) continue;
      count++;
      const cat = r.category ? categoryOf.get(key(r.category)) : undefined;
      if (cat) {
        const ck = `${config.slug}::${cat}`;
        cityCategory[ck] = (cityCategory[ck] ?? 0) + 1;
      }
    }
    if (count > 0) cities.push({ config, count });
  }
  cities.sort((a, b) => b.count - a.count);

  // ---- provinces ----------------------------------------------------------
  const provinces: Record<string, number> = {};
  // Seeded with every province so a lookup returns a definite 0 rather than
  // undefined — the difference between "no listings" and "unknown".
  for (const p of PROVINCES) provinces[p.slug] = 0;
  for (const r of rows) {
    const p = resolveProvince(r.province);
    if (!p) continue;
    provinces[p.slug] = (provinces[p.slug] ?? 0) + 1;
  }

  return { cities, cityCategory, provinces, totalPublished: rows.length, placeholderCityCount };
}

/** Listings for one city × category, or 0. */
export function cityCategoryCount(index: GeoIndex, citySlugValue: string, categorySlug: string): number {
  return index.cityCategory[`${citySlugValue}::${categorySlug}`] ?? 0;
}

/** Listings for one city, or 0. */
export function cityCount(index: GeoIndex, citySlugValue: string): number {
  return index.cities.find((c) => c.config.slug === citySlugValue)?.count ?? 0;
}

/**
 * The city config that owns a raw `businesses.city` value.
 *
 * Prefers an exact name match over a config that merely claims the city as a
 * neighbourhood — otherwise every Richmond Hill listing would resolve to the
 * Toronto config and be labelled «تورنتو», since Toronto is GTA-wide.
 */
export function findCityByName(index: GeoIndex, rawCity: string | null | undefined) {
  const k = key(rawCity ?? "");
  if (!k || PLACEHOLDER_CITIES.has(k)) return null;
  return (
    index.cities.find(({ config }) => key(config.nameEn) === k || key(config.nameFa) === k) ??
    index.cities.find(({ config }) => cityMatchTerms(config).includes(k)) ??
    null
  );
}

/** Persian name for a raw city value, falling back to the value itself. */
export function cityNameFa(index: GeoIndex, rawCity: string | null | undefined): string | null {
  const hit = findCityByName(index, rawCity);
  if (hit) return hit.config.nameFa || hit.config.nameEn;
  const raw = rawCity?.trim();
  return raw && !PLACEHOLDER_CITIES.has(key(raw)) ? raw : null;
}

/** Listings for one province, or 0. */
export function provinceCount(index: GeoIndex, provinceSlug: string): number {
  return index.provinces[provinceSlug] ?? 0;
}

/** Indexable = has a page worth putting in front of a searcher. */
export function isIndexable(count: number): boolean {
  return count >= MIN_INDEXABLE;
}

/**
 * The index every caller should use.
 *
 * Two layers, because both kinds of duplication are real:
 *   - `unstable_cache` keeps it off the database across requests. A full pass
 *     is ~6 paginated round trips over 5,800 rows; the sitemap alone would do
 *     that on every crawl.
 *   - React `cache` dedupes within one render, because `generateMetadata` and
 *     the page component each need it and would otherwise each pay for it.
 *
 * It builds its own anon client rather than taking the caller's: a cached
 * scope may not read cookies, and this only ever reads public rows, so the
 * cookie-bound (and RLS-elevated) client would be the wrong tool anyway.
 */
const loadGeoIndex = unstable_cache(
  async (): Promise<GeoIndex> => {
    const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return buildGeoIndex(supabase);
  },
  ["geo-index-v1"],
  { revalidate: 3600, tags: ["geo-index"] }
);

export const getGeoIndex = cache(loadGeoIndex);
