// ============================================================================
// Source: lib/search.ts
// Version: 1.2.0 — 2026-09-10
// Why: One way to search businesses on the web — the search_businesses RPC
//      (Persian-aware, trigram, ranked, RLS-respecting) plus the query log.
//
//      v1.1 adds topSearches(): the aggregate the home hero's «پرجستجو:» chips
//      were asserting without asking. search_queries stays admin-read only, so
//      the aggregate comes from the top_searches() SECURITY DEFINER function
//      (migration 20260909100000). Fails soft to null while that migration is
//      unapplied, and the hero relabels its chips «مثلاً:» when it gets null —
//      a hard-coded list under a "most searched" label is a claim no state
//      backs.
//
//      v1.2 exposes the window. It matters because of what the first real
//      reading showed (10 Sep): every top term was one we had suggested, so
//      the chips had been seeding their own log. The instrumentation fix marks
//      chip clicks from now on, but the rows already written cannot be
//      relabelled — they can only age out. The window is therefore the dial
//      that decides how long the contaminated history keeps counting, which
//      makes it a caller's decision, not a default buried in SQL.
// Env / Identity: Works with the server client (RLS applies).
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

export type SearchHit = {
  id: string; ref_no: number; slug: string | null; name: string; name_en: string | null;
  category: string | null; sub_category: string | null; tagline: string | null;
  short_description: string | null; city: string | null; province: string | null;
  phone: string | null; website: string | null; logo_url: string | null; cover_url: string | null;
  verified_until: string | null; view_count: number | null; plan: string | null; plan_until: string | null;
  busy_status: string | null; busy_status_until: string | null;
  rank: number; total_count: number;
};

export type SearchParams = {
  q: string;
  city?: string | null;
  category?: string | null;
  verifiedOnly?: boolean;
  limit?: number;
  offset?: number;
};

/** Sanitise a raw query: trim, collapse whitespace, cap length. Normalisation happens in SQL. */
export function cleanQuery(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}

export async function searchBusinesses(
  supabase: SupabaseClient,
  p: SearchParams
): Promise<{ hits: SearchHit[]; total: number }> {
  const q = cleanQuery(p.q);
  const { data, error } = await supabase.rpc("search_businesses", {
    q,
    p_city: p.city || null,
    p_category: p.category || null,
    p_verified_only: !!p.verifiedOnly,
    p_limit: p.limit ?? 24,
    p_offset: p.offset ?? 0,
  });
  if (error) {
    console.error("search_businesses:", error);
    return { hits: [], total: 0 };
  }
  const hits = (data ?? []) as SearchHit[];
  return { hits, total: hits[0]?.total_count ?? 0 };
}

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
 * Search live announcements (unexpired, ≤90 days old, public businesses
 * only — the RPC runs as invoker, so RLS decides visibility). Fail-soft: if
 * the RPC does not exist yet (migration 20260830300000 pending), returns []
 * and search behaves exactly as before.
 */
export async function searchAnnouncements(
  supabase: SupabaseClient,
  q: string,
  limit = 6
): Promise<AnnouncementHit[]> {
  const cleaned = cleanQuery(q);
  if (!cleaned) return [];
  const { data, error } = await supabase.rpc("search_announcements", { q: cleaned, p_limit: limit });
  if (error) {
    // Expected while the migration is pending; anything else is worth a log line.
    if (!/function .*search_announcements/i.test(error.message ?? "")) {
      console.error("search_announcements:", error);
    }
    return [];
  }
  return (data ?? []) as AnnouncementHit[];
}

/** Fire-and-forget log. Anonymous insert is allowed by policy; nothing else. */
export async function logSearch(
  supabase: SupabaseClient,
  p: { q: string; city?: string | null; category?: string | null; resultCount: number; source?: string; userId?: string | null }
) {
  const q = cleanQuery(p.q);
  if (!q) return;
  await supabase.from("search_queries").insert({
    q,
    q_norm: q.toLowerCase(),
    city: p.city || null,
    category: p.category || null,
    result_count: p.resultCount,
    source: p.source ?? "web",
    user_id: p.userId ?? null,
  });
}

export type TopSearch = { term: string; hits: number };

/**
 * The genuinely most-searched terms, or null when we cannot know.
 *
 * null and [] mean different things and callers must treat them differently:
 * null is "the aggregate is unavailable" (migration pending, RPC error) and
 * the caller must stop claiming these are popular; [] is "asked, and nothing
 * clears the floor yet", which is the same instruction.
 */
export async function topSearches(
  supabase: SupabaseClient,
  limit = 6,
  /** Days of history to count. Shorter = fresher, and drops old rows sooner. */
  days = 90
): Promise<TopSearch[] | null> {
  const { data, error } = await supabase.rpc("top_searches", { p_limit: limit, p_days: days });
  if (error) {
    // Expected until 20260909100000_top_searches.sql is applied; anything
    // else deserves a log line.
    if (!/function .*top_searches/i.test(error.message ?? "")) {
      console.error("top_searches:", error);
    }
    return null;
  }
  const rows = (data ?? []) as { term: string; hits: number }[];
  return rows.map((r) => ({ term: String(r.term), hits: Number(r.hits) })).filter((r) => r.term);
}
