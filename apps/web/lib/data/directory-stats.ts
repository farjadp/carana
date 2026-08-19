// ============================================================================
// Source: apps/web/lib/data/directory-stats.ts
// Version: 1.0.0 — 2026-08-18
// Why: One place that counts the directory, so every surface that shows a
//      number shows the same real number. Extracted from app/page.tsx when the
//      auth panel was found claiming "۲۰,۰۰۰+ کسب‌وکار ثبت‌شده" against a
//      database holding ~5,650 — a house-rule violation of exactly the kind
//      CLAUDE.md says to hunt for.
// Env / Identity: Server-only; reads public rows through the request client.
// ============================================================================
import { PUBLIC_STATUSES } from "@goplaza/core";

import { UNKNOWN_CITY } from "@/lib/data/geography";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
};

/**
 * Every field is a count, never a claim. A failed query yields 0, which reads
 * as "we don't know" rather than inventing a floor.
 */
export async function getDirectoryStats(): Promise<DirectoryStats> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const statuses = [...PUBLIC_STATUSES];

  const [{ count: totalCount }, { count: verifiedCount }, { data: cityRows }, { count: categoryCount }] =
    await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", statuses),
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", statuses).gt("verified_until", nowIso),
      supabase.from("businesses").select("city").in("status", statuses).not("city", "is", null),
      supabase.from("categories").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

  // "نامشخص" is the placeholder 409 imported listings carry, not a city. It
  // had been inflating the home hero's city count and would have shown up as
  // a top city in the auth panel.
  const freq = new Map<string, number>();
  for (const row of cityRows ?? []) {
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
  };
}
