// ============================================================================
// Source: lib/billing/entitlements.ts
// Version: 2.0.0 — 2026-08-24
// Why: Re-export plus the one piece that cannot move. The pure rules
//      (entitlementsFor, isFeatured, sortFeaturedFirst, weightedRandomOrder)
//      now live in @goplaza/core so the mobile app ranks and labels listings
//      exactly as the website does — the 24 Aug parity audit found mobile
//      ordering by created_at with no «ویژه» chip while the site ran a
//      weighted shuffle. Same move plans.ts, verification-status and
//      live-status already made.
//
//      `getEntitlements` stays here: it takes a SupabaseClient, and nothing
//      in @goplaza/core may import one.
//
//      Imported from the package root, not a subpath: Turbopack does not
//      resolve subpath exports of a workspace package.
// Env / Identity: The re-exports are safe anywhere; getEntitlements is
//      server-side in practice because that is where the client is built.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import { entitlementsFor, type BillingRow, type Entitlements } from "@goplaza/core";

export {
  entitlementsFor,
  isFeatured,
  sortFeaturedFirst,
  weightedRandomOrder,
  planLabel,
  type BillingRow,
  type Entitlements,
} from "@goplaza/core";

/** Fetch and compute in one call, for a server component or a route. */
export async function getEntitlements(supabase: SupabaseClient, businessId: string): Promise<Entitlements> {
  const { data } = await supabase.from("businesses").select("plan, plan_until").eq("id", businessId).maybeSingle();
  return entitlementsFor(data as BillingRow | null);
}
