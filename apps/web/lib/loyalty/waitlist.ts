// ============================================================================
// Source: apps/web/lib/loyalty/waitlist.ts
// Version: 1.0.0 — 2026-08-26
// Why: Reading the Platinum waitlist in the order the design promises —
//      longest continuous paid tenure first, joined_at as the tiebreak.
//
//      THE ORDER IS COMPUTED, NEVER STORED. A stored position would stop
//      being true the moment somebody's subscription lapsed, and the person
//      it was wrong about would be the one who noticed.
// Env / Identity: Server only; admin surfaces. Uses the service role, so
//      callers must have passed requireAdmin.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import { loyaltyStatusFor } from "@/lib/loyalty/status";

export interface WaitlistEntry {
  businessId: string;
  name: string;
  joinedAt: string;
  notifiedAt: string | null;
  tenureMonths: number;
  lifetimeMonths: number;
}

export async function platinumWaitlist(
  supabase: SupabaseClient,
  limit = 50
): Promise<WaitlistEntry[]> {
  const { data: rows, error } = await supabase
    .from("platinum_waitlist")
    .select("business_id, joined_at, notified_at, businesses(name)")
    .order("joined_at")
    .limit(limit);
  if (error || !rows) return [];

  const entries = await Promise.all(
    rows.map(async (r) => {
      const status = await loyaltyStatusFor(supabase, r.business_id as string);
      return {
        businessId: r.business_id as string,
        name: (r.businesses as { name?: string } | null)?.name ?? "—",
        joinedAt: r.joined_at as string,
        notifiedAt: (r.notified_at as string | null) ?? null,
        tenureMonths: status.tenure.months,
        lifetimeMonths: status.tenure.lifetimeMonths,
      };
    })
  );

  return entries.sort(
    (a, b) =>
      b.tenureMonths - a.tenureMonths ||
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  );
}
