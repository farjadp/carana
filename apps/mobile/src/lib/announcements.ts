// ============================================================================
// Source: apps/mobile/src/lib/announcements.ts
// Version: 1.0.0 — 2026-08-16
// Why: Mobile read side for business_announcements — the web shipped this
//      first (homepage feed, profile banner, followed list) and mobile had
//      none of it.
//
//      Expiry is filtered in the query, not after the fact: an announcement
//      whose expires_at has passed is not "shown greyed out", it is simply
//      not returned, matching the web exactly. Read-only by design — mobile
//      has no owner-management screens, so nothing here writes.
// Env / Identity: Anon client. RLS already restricts these rows to
//      announcements on APPROVED/PUBLISHED businesses.
// ============================================================================
import { supabase } from "./supabase";

export type Announcement = {
  id: string;
  business_id: string;
  title: string;
  body: string | null;
  created_at: string;
  business: {
    id: string;
    slug: string | null;
    name: string;
    logo_url: string | null;
  } | null;
};

const COLUMNS =
  "id, business_id, title, body, created_at, business:businesses(id, slug, name, logo_url)";

/** Not-yet-expired filter, shared by every query here. */
const liveOnly = (q: ReturnType<typeof baseQuery>) =>
  q.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

function baseQuery() {
  return supabase.from("business_announcements").select(COLUMNS);
}

/** Newest across the whole directory — the home rail. */
export async function listLatestAnnouncements(limit = 10): Promise<Announcement[]> {
  const { data, error } = await liveOnly(baseQuery())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}

/** Active announcements for one business — the profile banner. */
export async function listBusinessAnnouncements(businessId: string): Promise<Announcement[]> {
  const { data, error } = await liveOnly(baseQuery())
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}

/**
 * Announcements from businesses this user explicitly asked to hear about
 * (`notify_announcements`), for the account tab.
 *
 * Two queries rather than a join: the follow flag lives on
 * user_business_interactions, which RLS scopes to the caller, while the
 * announcements themselves are public. Keeping them separate means the
 * public table is never filtered by a private one in a single statement.
 */
export async function listFollowedAnnouncements(): Promise<Announcement[]> {
  const { data: follows, error: followErr } = await supabase
    .from("user_business_interactions")
    .select("business_id")
    .eq("notify_announcements", true);
  if (followErr) throw followErr;

  const ids = (follows ?? []).map((f) => f.business_id as string);
  if (ids.length === 0) return [];

  const { data, error } = await liveOnly(baseQuery())
    .in("business_id", ids)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as Announcement[];
}
