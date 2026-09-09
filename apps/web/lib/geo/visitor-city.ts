// ============================================================================
// Source: apps/web/lib/geo/visitor-city.ts
// Version: 1.0.0 — 2026-09-09
// Why: The home page had no location affordance at all. A visitor standing in
//      Toronto had to open a dropdown of English city names and find their own
//      city in it, on a right-to-left Persian page.
//
//      The obvious fix — a «نزدیک من» button — is not buildable today and
//      pretending otherwise would be worse than nothing: `businesses` has no
//      latitude/longitude column, so there is no distance to sort by. What we
//      CAN do costs nothing and asks no permission: the edge already tells us
//      the city the request came from. If that city is one we actually have
//      listings for, the search box starts there, says so, and the visitor can
//      change or clear it in one click.
//
//      Two rules this must never break:
//        · Never assert a city we cannot match to real listings. An IP city of
//          "Aurora" with no listings resolves to null, not to a guess.
//        · Never silently filter. The hero shows the preselected city as a
//          visible, removable chip — a filter the visitor did not choose and
//          cannot see is the same lie as a fake badge.
// Env / Identity: Server only. Reads request headers; no IO, no third party.
// ============================================================================
import { headers } from "next/headers";

import { findCityByName, type GeoIndex } from "@/lib/seo/geo-index";

/**
 * Edge-provided city headers, best first. Vercel sets `x-vercel-ip-city`
 * (URL-encoded); Cloudflare and Fly set the other two. All are absent in
 * local development, which is the same as "unknown".
 */
const CITY_HEADERS = ["x-vercel-ip-city", "cf-ipcity", "fly-client-city"] as const;

export type VisitorCity = {
  /** The raw `businesses.city` value to filter by. */
  value: string;
  /** What to show a Persian reader. */
  label: string;
  /** How many listings sit there — never offered without one. */
  count: number;
};

/**
 * The visitor's city, but only when we have listings for it.
 *
 * Returns null for: no header (local dev, a stripped proxy), a city we do not
 * recognise, or a city with fewer than `min` listings — offering «ونکوور (۲)»
 * as a starting filter is a worse first result than all of Canada.
 */
export async function detectVisitorCity(index: GeoIndex, min = 5): Promise<VisitorCity | null> {
  const h = await headers();
  let raw: string | null = null;
  for (const name of CITY_HEADERS) {
    const v = h.get(name);
    if (v) {
      // Vercel percent-encodes non-ASCII city names; a malformed value must
      // not throw its way up into the page render.
      try {
        raw = decodeURIComponent(v).trim();
      } catch {
        raw = v.trim();
      }
      if (raw) break;
    }
  }
  if (!raw) return null;

  const hit = findCityByName(index, raw);
  if (!hit || hit.count < min) return null;

  return {
    value: hit.config.nameEn,
    label: hit.config.nameFa || hit.config.nameEn,
    count: hit.count,
  };
}
