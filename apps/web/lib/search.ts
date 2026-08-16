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
