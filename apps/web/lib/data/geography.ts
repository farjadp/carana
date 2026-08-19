// ============================================================================
// Source: apps/web/lib/data/geography.ts
// Version: 1.0.0 — 2026-08-23
// Why: Province and city rollups for the browse pages.
// Env / Identity: Reads through the request-scoped client, so RLS decides what
//      is counted — unpublished listings never reach these totals.
// ============================================================================
import { PUBLIC_STATUSES, resolveProvince, type Province } from "@goplaza/core";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/** Cities whose value is a placeholder rather than a real location. */
export const UNKNOWN_CITY = "نامشخص";

export type ProvinceSummary = {
  province: Province;
  total: number;
  cities: { city: string; count: number }[];
};

export type CitySummary = { city: string; count: number; province: Province | null };

async function fetchLocations() {
  const supabase = await createSupabaseServerClient();
  // Paginated: unbounded this returned 1,000 rows, so /provinces publicly
  // displayed 998 businesses against a directory of 5,120.
  return fetchAllRows<{ province: string | null; city: string | null }>(() =>
    supabase.from("businesses").select("province, city").in("status", PUBLIC_STATUSES).order("id")
  );
}

export async function listProvinces(): Promise<ProvinceSummary[]> {
  const rows = await fetchLocations();
  const byProvince = new Map<string, ProvinceSummary>();

  for (const row of rows) {
    const province = resolveProvince(row.province);
    if (!province) continue;

    let entry = byProvince.get(province.slug);
    if (!entry) {
      entry = { province, total: 0, cities: [] };
      byProvince.set(province.slug, entry);
    }

    entry.total += 1;

    if (row.city && row.city !== UNKNOWN_CITY) {
      const city = entry.cities.find((c) => c.city === row.city);
      if (city) city.count += 1;
      else entry.cities.push({ city: row.city, count: 1 });
    }
  }

  for (const entry of byProvince.values()) {
    entry.cities.sort((a, b) => b.count - a.count);
  }

  return [...byProvince.values()].sort((a, b) => b.total - a.total);
}

export async function getProvinceSummary(slug: string): Promise<ProvinceSummary | null> {
  const all = await listProvinces();
  return all.find((p) => p.province.slug === slug) ?? null;
}

export async function listCitiesWithCounts(): Promise<CitySummary[]> {
  const rows = await fetchLocations();
  const counts = new Map<string, { count: number; province: Province | null }>();

  for (const row of rows) {
    if (!row.city || row.city === UNKNOWN_CITY) continue;

    const existing = counts.get(row.city);
    if (existing) existing.count += 1;
    else counts.set(row.city, { count: 1, province: resolveProvince(row.province) });
  }

  return [...counts.entries()]
    .map(([city, v]) => ({ city, count: v.count, province: v.province }))
    .sort((a, b) => b.count - a.count);
}
