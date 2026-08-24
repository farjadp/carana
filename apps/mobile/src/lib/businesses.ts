// ============================================================================
// Source: apps/mobile/src/lib/businesses.ts
// Version: 3.0.0 — 2026-08-24
// Why: Directory queries for the mobile app.
//
//      v3 (24 Aug parity audit): listBusinesses used to be "newest 100,
//      counted as if that were all of them", with an ilike search path no
//      caller used. It now mirrors /businesses on the web — a genuinely
//      random default order with the labelled featured boost, four explicit
//      sorts, and a real total from the database instead of the length of
//      whatever page came back. The ilike path is gone; free text goes
//      through searchBusinesses (the RPC), which is the only search engine
//      this project has.
// Env / Identity: Anon client. RLS decides what comes back — this file adds no
//      authorization of its own and must not be trusted to.
// ============================================================================
import {
  PLANS,
  PUBLIC_STATUSES,
  fetchAllRows,
  resolveProvince,
  weightedRandomOrder,
  type PlanId,
  type Province,
} from "@goplaza/core";

import { supabase } from "./supabase";

/**
 * The plans that carry `featured_placement`, derived from the plan table
 * rather than typed out — a fifth tier must not need an edit here to be
 * boosted, and a tier that loses the feature must not keep the boost.
 */
const FEATURED_PLANS = (Object.keys(PLANS) as PlanId[]).filter((id) =>
  PLANS[id].features.includes("featured_placement")
);

/**
 * Columns safe to show publicly.
 *
 * Postgres does not apply RLS per column, so `select("*")` would also return
 * business_number, license_info and the verification fields. Always list
 * columns explicitly on a public query.
 */
const CARD_COLUMNS =
  "id, ref_no, slug, name, name_en, category, sub_category, tagline, short_description, city, province, phone, website, logo_url, cover_url, busy_status, busy_status_until, plan, plan_until, view_count, saved_count, created_at";

const DETAIL_COLUMNS = `${CARD_COLUMNS}, description, address, is_address_public,
  whatsapp, contact_email, instagram, telegram, linkedin, google_maps_url,
  preferred_contact, languages, is_iranian_owned, established_year,
  working_hours, accepts_appointments, booking_url, services, branches,
  service_type, service_area, brand_color,
  verification_method, verified_at, verified_until, verified_phone, verified_email`;

export type BusinessCard = {
  id: string;
  ref_no: number | null;
  slug: string | null;
  name: string;
  name_en: string | null;
  category: string | null;
  sub_category: string | null;
  tagline: string | null;
  short_description: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  cover_url: string | null;
  busy_status: string | null;
  busy_status_until: string | null;
  /**
   * Billing state travels with every card on purpose: the «ویژه» chip and the
   * weighted random order are computed from it by @goplaza/core, and the chip
   * is what makes the boost honest. Never read `plan` on its own — a lapsed
   * plan_until still says "featured" in that column.
   */
  plan: string | null;
  plan_until: string | null;
  /**
   * Optional because `search_businesses` does not return them — the RPC
   * projects its own column list, and it stops at what ranking needs. The
   * chip does not need them (it reads plan/plan_until, which the RPC does
   * return); only the DB-side sorts do, and those never run over RPC rows.
   */
  view_count?: number | null;
  saved_count?: number | null;
  created_at?: string | null;
};

export type BusinessDetail = BusinessCard & {
  description: string | null;
  address: string | null;
  is_address_public: boolean | null;
  whatsapp: string | null;
  contact_email: string | null;
  instagram: string | null;
  telegram: string | null;
  linkedin: string | null;
  google_maps_url: string | null;
  preferred_contact: string | null;
  languages: string[] | null;
  is_iranian_owned: boolean | null;
  established_year: number | null;
  working_hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  accepts_appointments: boolean | null;
  booking_url: string | null;
  services: { name: string; description?: string; price?: string; price_unit?: string }[] | null;
  branches: { name?: string; address: string; city?: string; phone?: string }[] | null;
  service_type: string | null;
  service_area: string | null;
  brand_color: string | null;
  verification_method: "self_onboarded" | "claimed" | null;
  verified_at: string | null;
  verified_until: string | null;
  verified_phone: string | null;
  verified_email: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  image_url: string | null;
  description: string | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, image_url, description")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

/**
 * Counts per category, for the badges on the home screen.
 *
 * Drained with `fetchAllRows`, not a bare select: PostgREST stops at 1,000
 * rows and reports success, so this counted 1,000 of 5,251 and every badge —
 * plus the total in the hero — was quietly a fifth of the truth. Same bug the
 * website fixed on 18 Aug; mobile kept it until the 24 Aug parity audit.
 */
export async function countByCategory(): Promise<Record<string, number>> {
  const rows = await fetchAllRows<{ category: string | null }>(() =>
    supabase.from("businesses").select("category").in("status", PUBLIC_STATUSES)
  );

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.category) counts[row.category] = (counts[row.category] ?? 0) + 1;
  }
  return counts;
}

export async function listCities(): Promise<{ city: string; count: number }[]> {
  // Drained past the 1,000-row cap — see countByCategory.
  const rows = await fetchAllRows<{ city: string | null }>(() =>
    supabase.from("businesses").select("city").in("status", PUBLIC_STATUSES).not("city", "is", null)
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    const city = row.city;
    if (!city || city === "نامشخص") continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The sorts the listing screens offer, mirroring /businesses on the web.
 * "Highest rated" is deliberately absent on both surfaces: with a handful of
 * published reviews it would mostly show ties.
 */
export type ListingSort = "views" | "saved" | "new" | "verified";

export const LISTING_SORTS: { key: ListingSort; label: string }[] = [
  { key: "views", label: "پربازدیدترین" },
  { key: "saved", label: "پرمخاطب‌ترین" },
  { key: "new", label: "جدیدترین" },
  { key: "verified", label: "تازه تأییدشده" },
];

const SORT_COLUMN: Record<ListingSort, string> = {
  views: "view_count",
  saved: "saved_count",
  new: "created_at",
  verified: "verified_at",
};

/** How many rows the random default draws from. Keep under PostgREST's 1,000. */
const RANDOM_POOL = 400;

export type ListingPage = {
  rows: BusinessCard[];
  /** Every row the filter matches in the database — not `rows.length`. */
  total: number;
};

/**
 * Browse listings under a filter.
 *
 * With no `sort`, the order is **random and reshuffled on every call**, with
 * `featured_placement` plans given `FEATURED_RANDOM_BOOST` more weight by
 * `weightedRandomOrder` — the same rule and the same shared function the
 * website uses. `BusinessCardView` renders the «ویژه» chip unconditionally,
 * which is the only thing that makes that boost honest rather than a hidden
 * paid ranking (house rule #2 in plans.ts). Do not call this from a surface
 * that renders a card without the chip.
 *
 * Two details the web version does not need:
 *
 *  - **Random window, not random over everything.** Toronto alone matches
 *    ~1,700 rows and PostgREST caps a response at 1,000, so the pool is a
 *    `RANDOM_POOL`-row window at a random offset rather than the entire set.
 *    The sample is still drawn from the whole filter, just not all at once.
 *  - **Featured rows are fetched separately and merged in.** A window could
 *    otherwise miss a paying listing entirely, which would silently turn the
 *    boost off for the business that paid for it.
 *
 * `total` always comes from an exact database count, so a screen can say
 * «۱۰۰ از ۱٬۶۹۹» instead of counting the page it happens to be holding.
 */
export async function listBusinesses(options?: {
  city?: string;
  category?: string;
  sort?: ListingSort;
  limit?: number;
}): Promise<ListingPage> {
  const limit = options?.limit ?? 40;

  const base = () => {
    let q = supabase.from("businesses").select(CARD_COLUMNS, { count: "exact" }).in("status", PUBLIC_STATUSES);
    if (options?.city) q = q.eq("city", options.city);
    if (options?.category) q = q.eq("category", options.category);
    return q;
  };

  // An explicit sort is the simple case: the database orders, we page.
  if (options?.sort) {
    const column = SORT_COLUMN[options.sort];
    const { data, count, error } = await base()
      .order(column, { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    return { rows: (data ?? []) as unknown as BusinessCard[], total: count ?? (data?.length ?? 0) };
  }

  // No sort: count first, so the window below can start anywhere in the set.
  const { count, error: countError } = await base().limit(1);
  if (countError) throw countError;
  const total = count ?? 0;
  const offset = total > RANDOM_POOL ? Math.floor(Math.random() * (total - RANDOM_POOL)) : 0;

  const [{ data: pool, error }, { data: featured }] = await Promise.all([
    base().order("created_at", { ascending: false }).range(offset, offset + RANDOM_POOL - 1),
    // Small by construction — only live paid plans. `.gt` on plan_until does
    // the expiry filter the column alone cannot; entitlementsFor re-checks it.
    base()
      .in("plan", FEATURED_PLANS)
      .gt("plan_until", new Date().toISOString())
      .limit(100),
  ]);
  if (error) throw error;

  const byId = new Map<string, BusinessCard>();
  for (const row of [...((pool ?? []) as unknown as BusinessCard[]), ...((featured ?? []) as unknown as BusinessCard[])]) {
    byId.set(row.id, row);
  }

  return { rows: weightedRandomOrder([...byId.values()]).slice(0, limit), total };
}

/**
 * Cards that carry enough state for the home screen's "open now" rail and its
 * verified spotlight: working_hours and the verification fields on top of the
 * card columns. Still an explicit column list — RLS does not filter columns.
 *
 * Both facts are optional on a listing, so callers must treat an empty result
 * as "nothing to show" and render nothing, never a placeholder claim.
 */
export type BusinessSignals = BusinessCard & {
  working_hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  verification_method: "self_onboarded" | "claimed" | null;
  verified_at: string | null;
  verified_until: string | null;
  verified_phone: string | null;
  verified_email: string | null;
};

export async function listWithSignals(limit = 60): Promise<BusinessSignals[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      `${CARD_COLUMNS}, working_hours, verification_method, verified_at, verified_until, verified_phone, verified_email`
    )
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as BusinessSignals[];
}

/** Listings whose badge is live right now — ordered by the nearest expiry. */
export async function listVerified(limit = 8): Promise<BusinessSignals[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      `${CARD_COLUMNS}, working_hours, verification_method, verified_at, verified_until, verified_phone, verified_email`
    )
    .in("status", PUBLIC_STATUSES)
    .gt("verified_until", new Date().toISOString())
    .order("verified_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as BusinessSignals[];
}

export async function getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as BusinessDetail | null;
}

// ---------------------------------------------------------------------------
// Geography: province → city
// ---------------------------------------------------------------------------
const UNKNOWN_CITY = "نامشخص";

export type ProvinceSummary = {
  province: Province;
  total: number;
  cities: { city: string; count: number }[];
};

/**
 * One query, rolled up in memory. The table is small enough that a round trip
 * per province would cost more than fetching the two columns outright.
 */
export async function listProvinces(): Promise<ProvinceSummary[]> {
  // Drained past the 1,000-row cap — see countByCategory. /provinces on the
  // web displayed 998 for exactly this reason before 18 Aug.
  const rows = await fetchAllRows<{ province: string | null; city: string | null }>(() =>
    supabase.from("businesses").select("province, city").in("status", PUBLIC_STATUSES)
  );

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
      const found = entry.cities.find((c) => c.city === row.city);
      if (found) found.count += 1;
      else entry.cities.push({ city: row.city, count: 1 });
    }
  }

  for (const entry of byProvince.values()) {
    entry.cities.sort((a, b) => b.count - a.count);
  }

  return [...byProvince.values()].sort((a, b) => b.total - a.total);
}

export async function listBusinessesByProvince(provinceNameEn: string, limit = 60) {
  const { data, error } = await supabase
    .from("businesses")
    .select(CARD_COLUMNS)
    .eq("province", provinceNameEn)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as BusinessCard[];
}

// ---------------------------------------------------------------------------
// Search — the ranked, Persian-aware RPC (same engine as the website).
// ---------------------------------------------------------------------------
export async function searchBusinesses(opts: {
  q: string;
  city?: string | null;
  category?: string | null;
  verifiedOnly?: boolean;
  limit?: number;
}): Promise<{ hits: (BusinessCard & { verified_until: string | null; rank: number })[]; total: number }> {
  const q = opts.q.replace(/\s+/g, " ").trim().slice(0, 100);
  const { data, error } = await supabase.rpc("search_businesses", {
    q,
    p_city: opts.city ?? undefined,
    p_category: opts.category ?? undefined,
    p_verified_only: !!opts.verifiedOnly,
    p_limit: opts.limit ?? 40,
    p_offset: 0,
  });
  if (error) throw error;
  const hits = (data ?? []) as (BusinessCard & { verified_until: string | null; rank: number; total_count: number })[];
  // Log for the demand signal; failures are irrelevant to the user.
  if (q) {
    void supabase.from("search_queries").insert({
      q, q_norm: q.toLowerCase(), city: opts.city ?? null, category: opts.category ?? null,
      result_count: hits[0]?.total_count ?? 0, source: "mobile",
    });
  }
  return { hits, total: hits[0]?.total_count ?? 0 };
}

// ---------------------------------------------------------------------------
// Announcement search — the second thing 577ff4e added, and the half of it
// that needs no server secret: search_announcements is a plain RPC running as
// invoker, so the same RLS that governs the public announcement rails decides
// what comes back here.
// ---------------------------------------------------------------------------
export type AnnouncementHit = {
  announcement_id: string;
  announcement_title: string;
  announcement_body: string | null;
  announcement_created_at: string;
  announcement_expires_at: string | null;
  business_id: string;
  slug: string | null;
  name: string;
  category: string | null;
  city: string | null;
  province: string | null;
  logo_url: string | null;
  verified_until: string | null;
  plan: string | null;
  plan_until: string | null;
};

/**
 * Fail-soft exactly like the web helper: an app build older than the
 * migration, or newer than a rolled-back one, returns nothing and search
 * behaves as it did before announcements were searchable at all.
 */
export async function searchAnnouncements(q: string, limit = 6): Promise<AnnouncementHit[]> {
  const cleaned = q.replace(/\s+/g, " ").trim().slice(0, 100);
  if (!cleaned) return [];
  const { data, error } = await supabase.rpc("search_announcements", { q: cleaned, p_limit: limit });
  if (error) return [];
  return (data ?? []) as AnnouncementHit[];
}
