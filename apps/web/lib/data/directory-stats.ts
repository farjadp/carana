// ============================================================================
// Source: apps/web/lib/data/directory-stats.ts
// Version: 1.1.0 — 2026-09-09
// Why: One place that counts the directory, so every surface that shows a
//      number shows the same real number. Extracted from app/page.tsx when the
//      auth panel was found claiming "۲۰,۰۰۰+ کسب‌وکار ثبت‌شده" against a
//      database holding ~5,650 — a house-rule violation of exactly the kind
//      CLAUDE.md says to hunt for.
//
//      v1.1 adds `updatedThisWeek`. The hero used to spend its most prominent
//      slot — gold, top of the page — on `verified`, which on 9 Sep 2026 read
//      «۱۷ مالکیت احرازشده» beside «۹۶۹۳ کسب‌وکار». True, and the first thing
//      a visitor learned was that 0.17 % of the directory is proven. The
//      number itself is still the honest one, so it moves to where it is a
//      tool instead of a confession: the search page's «فقط احرازشده» filter.
//      What replaces it is a count that grows — rows touched in the last
//      seven days — which is the question a returning visitor actually has.
// Env / Identity: Server-only; reads public rows through the request client.
// ============================================================================
import { PUBLIC_STATUSES } from "@goplaza/core";

import { UNKNOWN_CITY } from "@/lib/data/geography";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

export type DirectoryStats = {
  /** Publicly listed businesses. */
  total: number;
  /** Of those, the ones whose ownership proof has not expired. */
  verified: number;
  /** Distinct cities those businesses sit in. */
  cities: number;
  /** Active categories. */
  categories: number;
  /** The busiest city names, most listings first — for "where we cover" copy. */
  topCities: string[];
  /** Publicly listed rows whose record changed in the last seven days. */
  updatedThisWeek: number;
};

/**
 * Every field is a count, never a claim. A failed query yields 0, which reads
 * as "we don't know" rather than inventing a floor.
 */
export async function getDirectoryStats(): Promise<DirectoryStats> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const statuses = [...PUBLIC_STATUSES];

  // The two head-counts are exact server-side counts. The city list has to be
  // paginated — unbounded it returned 1,000 rows, so the distinct-city number
  // and the "top cities" list were computed from a fifth of the directory.
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalCount }, { count: verifiedCount }, cityRows, { count: categoryCount }, { count: freshCount }] =
    await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", statuses),
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", statuses).gt("verified_until", nowIso),
      fetchAllRows<{ city: string | null }>(() =>
        supabase.from("businesses").select("city").in("status", statuses).not("city", "is", null).order("id")
      ),
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", statuses).gte("updated_at", weekAgoIso),
    ]);

  // "نامشخص" is the placeholder 409 imported listings carry, not a city. It
  // had been inflating the home hero's city count and would have shown up as
  // a top city in the auth panel.
  const freq = new Map<string, number>();
  for (const row of cityRows) {
    const city = (row.city as string | null)?.trim();
    if (city && city !== UNKNOWN_CITY) freq.set(city, (freq.get(city) ?? 0) + 1);
  }
  const distinctCities = new Set([...freq.keys()].map((c) => c.toLowerCase())).size;

  return {
    total: totalCount ?? 0,
    verified: verifiedCount ?? 0,
    cities: distinctCities,
    categories: categoryCount ?? 0,
    topCities: [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
    updatedThisWeek: freshCount ?? 0,
  };
}
