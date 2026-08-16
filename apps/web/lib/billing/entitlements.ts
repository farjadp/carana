// ============================================================================
// Source: lib/billing/entitlements.ts
// Version: 1.0.0 — 2026-08-16
// Why: The single question "may this listing do X?" answered on the server.
//
//      Why not read `businesses.plan` directly: a paid period ends at a
//      moment, and the webhook that downgrades it can be late (Stripe retries,
//      a deploy, a network blip). Reading the column alone would keep a lapsed
//      listing featured. `entitlementsFor` treats an expired `plan_until` as
//      free regardless of what the column says, so lateness costs the customer
//      nothing and costs us nothing either — the state is recomputed, not
//      trusted.
//
//      A UI check is a convenience. This module is the rule.
// Env / Identity: Server only.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import { PLANS, planOf, type Feature, type PlanId } from "./plans";

export type Entitlements = {
  plan: PlanId;
  /** The plan the row claims, before expiry is applied. Useful in the admin. */
  storedPlan: PlanId;
  expired: boolean;
  until: string | null;
  has: (feature: Feature) => boolean;
};

type BillingRow = { plan?: string | null; plan_until?: string | null };

/** Pure: given a row, what is actually unlocked right now. */
export function entitlementsFor(row: BillingRow | null | undefined, now = new Date()): Entitlements {
  const storedPlan = (row?.plan as PlanId) ?? "free";
  const until = row?.plan_until ?? null;
  const expired = storedPlan !== "free" && !!until && new Date(until) < now;
  const plan: PlanId = expired ? "free" : storedPlan;
  const features = new Set(PLANS[plan]?.features ?? PLANS.free.features);
  return {
    plan,
    storedPlan,
    expired,
    until,
    has: (feature) => features.has(feature),
  };
}

/** Fetch and compute in one call, for a server component or a route. */
export async function getEntitlements(supabase: SupabaseClient, businessId: string): Promise<Entitlements> {
  const { data } = await supabase.from("businesses").select("plan, plan_until").eq("id", businessId).maybeSingle();
  return entitlementsFor(data as BillingRow | null);
}

/**
 * Featured listings sort first *and* are labelled. Callers must render the
 * chip when `featured` is true — an unlabelled paid position is an
 * advertisement pretending to be a search result.
 */
export function sortFeaturedFirst<T extends BillingRow & { id: string }>(rows: T[], now = new Date()) {
  return rows
    .map((r) => ({ row: r, featured: entitlementsFor(r, now).has("featured_placement") }))
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}

export const planLabel = (id: string | null | undefined) => planOf(id).name;
