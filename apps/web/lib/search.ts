// ============================================================================
// Source: lib/search.ts
// Version: 1.0.0 — 2026-08-15
// Why: One way to search businesses on the web — the search_businesses RPC
//      (Persian-aware, trigram, ranked, RLS-respecting) plus the query log.
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
