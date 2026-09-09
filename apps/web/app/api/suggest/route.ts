// ============================================================================
// Source: app/api/suggest/route.ts
// Version: 1.0.0 — 2026-09-09
// Why: Typeahead for the home and search boxes. The directory holds ~9,700
//      listings and the search box was a plain input that did nothing until
//      submit — so the visitor had to guess a spelling, load a results page,
//      and guess again. Suggestions turn that loop into one keystroke.
//
//      It reuses `search_businesses` — the same Persian-aware, trigram,
//      RLS-respecting RPC the results page runs — so a suggestion can never
//      show a row the results page would hide, and Persian/English keyboard
//      folding is inherited rather than re-implemented here. (docs/06-gotchas:
//      never hand-roll ilike over this data.)
//
//      Three groups come back, in the order a visitor scans them:
//        businesses → the exact thing, straight to its page;
//        categories → "دندانپزشک" is a category, not a listing;
//        cities     → "ونکوور" means "show me Vancouver", not a business.
//      Categories and cities are matched in memory against the cached geo /
//      category indexes, so the extra groups cost no database round trip.
//
//      Nothing here is logged: logSearch() belongs to a submitted search, and
//      writing a row per keystroke would turn the demand signal into noise and
//      the query log into a keylogger.
// Env / Identity: Server route. Anonymous. Rate-limited per IP.
// ============================================================================
import { NextResponse } from "next/server";

import { CATEGORY_DETAILS } from "@/lib/data/category-details";
import { getCategoryAliases } from "@/lib/data/category-aliases";
import { getGeoIndex, isPlaceholderCity } from "@/lib/seo/geo-index";
import { cleanQuery, searchBusinesses } from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";
import { faNumber } from "@goplaza/core";

/** Below this a query matches most of the directory and suggests nothing useful. */
const MIN_CHARS = 2;
const MAX_BUSINESSES = 5;
const MAX_CATEGORIES = 3;
const MAX_CITIES = 3;

export type Suggestion = {
  kind: "business" | "category" | "city";
  label: string;
  /** Secondary line — city for a business, listing count for the others. */
  hint: string | null;
  href: string;
};

/**
 * Fold for comparison the same way the geo and category indexes do: Persian
 * variants are already normalised inside the RPC, but these two groups are
 * matched here in JS, so they need the Arabic ی/ک and ZWNJ folded by hand or
 * «دندانپزشك» never matches «دندانپزشکی».
 */
function fold(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/‌/g, " ")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = cleanQuery(url.searchParams.get("q"));
  if (q.length < MIN_CHARS) return NextResponse.json({ suggestions: [] });

  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const limit = rateLimit(`suggest:${ip}`, 120, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { suggestions: [] },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ hits }, geo] = await Promise.all([
    searchBusinesses(supabase, { q, limit: MAX_BUSINESSES }),
    getGeoIndex(),
  ]);

  const needle = fold(q);
  const suggestions: Suggestion[] = [];

  // ── categories ───────────────────────────────────────────────────────────
  // Matched over the alias list, not the display name alone, so «وکیل» finds
  // «وکیل و مهاجرت» and «lawyer» finds it too.
  for (const detail of Object.values(CATEGORY_DETAILS)) {
    if (suggestions.length >= MAX_CATEGORIES) break;
    const terms = getCategoryAliases(detail.slug, detail.name).map(fold);
    if (!terms.some((t) => t.includes(needle) || needle.includes(t))) continue;
    suggestions.push({
      kind: "category",
      label: detail.name,
      hint: "دسته‌بندی",
      href: `/categories/${detail.slug}`,
    });
  }

  // ── cities ───────────────────────────────────────────────────────────────
  // Only cities we actually have listings for, densest first, with the count
  // shown — a suggestion that leads to an empty page is worse than none.
  const cityPicks = geo.cities
    .filter(({ config }) => {
      const names = [config.nameEn, config.nameFa].filter(Boolean).map((n) => fold(String(n)));
      return names.some((n) => n.startsWith(needle) || n.includes(needle));
    })
    .slice(0, MAX_CITIES);
  for (const { config, count } of cityPicks) {
    suggestions.push({
      kind: "city",
      label: config.nameFa || config.nameEn,
      // Persian digits: the app forces RTL and every other count on the site
      // is written this way.
      hint: `${faNumber(count)} کسب‌وکار`,
      href: `/cities/${config.slug}`,
    });
  }

  // ── businesses ───────────────────────────────────────────────────────────
  for (const hit of hits) {
    suggestions.push({
      kind: "business",
      label: hit.name,
      // «نامشخص» is the placeholder 400-odd imported rows carry. It is not a
      // place, and printing it under a business name says less than nothing.
      hint: hit.city && !isPlaceholderCity(hit.city) ? hit.city : null,
      href: `/businesses/${hit.slug || hit.id}`,
    });
  }

  return NextResponse.json(
    { suggestions },
    // Short shared cache: the same prefix is typed by many people, and a stale
    // suggestion for 30s is harmless where a stale result page would not be.
    { headers: { "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120" } }
  );
}
