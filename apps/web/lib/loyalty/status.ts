// ============================================================================
// Source: apps/web/lib/loyalty/status.ts
// Version: 1.0.0 — 2026-08-26
// Why: The server half of «وفاداری مالک» — fetch what core's pure functions
//      need and hand back one object the billing page, the checkout route and
//      the admin all read. One fetch path, so the price a checkout applies and
//      the number the page shows cannot come from two different calculations.
//
//      NO NEW TABLE. Tenure comes from paid invoices, upkeep from columns that
//      already exist. A stored tenure drifts from Stripe on the first late
//      webhook, and it drifts in the direction that costs us money.
// Env / Identity: Server only. Takes a SupabaseClient so the caller decides
//      whether the read runs as the owner or as the service role.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_LOYALTY_TIERS,
  LOYALTY_FRESH_DAYS,
  REVIEW_REPLY_GRACE_DAYS,
  capacityBonusFor,
  getVerificationStatus,
  loyaltyTierFor,
  nextLoyaltyTier,
  tenureFrom,
  upkeepOk,
  type CapacityBonus,
  type LoyaltyTier,
  type PaidPeriod,
  type PlanId,
  type Tenure,
  type UpkeepChecks,
} from "@goplaza/core";

import { getLoyaltySettings } from "@/lib/loyalty/settings";

export interface LoyaltyStatus {
  /** False when the programme is switched off — callers must then offer nothing. */
  enabled: boolean;
  tenure: Tenure;
  tier: LoyaltyTier | null;
  next: LoyaltyTier | null;
  upkeep: UpkeepChecks;
  upkeepOk: boolean;
  bonus: CapacityBonus;
  tiers: LoyaltyTier[];
}

const DAY_MS = 86_400_000;

/**
 * Everything loyalty knows about one business.
 *
 * When the programme is disabled this still computes and returns the real
 * numbers — tenure is a fact either way, and the admin wants to see it before
 * flipping the switch — but `tier` and `bonus` are forced empty, so no caller
 * can accidentally hand out a discount that has not been turned on.
 */
export async function loyaltyStatusFor(
  supabase: SupabaseClient,
  businessId: string,
  now: Date = new Date()
): Promise<LoyaltyStatus> {
  const settings = await getLoyaltySettings();
  const tiers = settings.tiers.length ? settings.tiers : DEFAULT_LOYALTY_TIERS;

  const [{ data: business }, { data: invoices }, { data: reviews }] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "plan, plan_until, working_hours, updated_at, verification_method, verified_at, verified_until, verified_phone, verified_email, phone, contact_email"
      )
      .eq("id", businessId)
      .maybeSingle(),
    // Paid periods only. An unpaid or void invoice is not tenure.
    supabase
      .from("invoices")
      .select("period_start, period_end, amount_paid, status")
      .eq("business_id", businessId)
      .not("period_start", "is", null)
      .not("period_end", "is", null),
    supabase
      .from("public_reviews")
      .select("published_at, owner_reply")
      .eq("business_id", businessId)
      .eq("status", "published"),
  ]);

  const periods: PaidPeriod[] = (invoices ?? [])
    .filter((i) => i.status === "paid" || (i.amount_paid ?? 0) > 0)
    .map((i) => ({ start: i.period_start as string, end: i.period_end as string }));

  const tenure = tenureFrom(periods, now, settings.graceDays);

  // Upkeep. Every check reads something that already exists; none of them is
  // a new column, and none of them is a judgement about the business itself.
  const hours = business?.working_hours;
  const verification = business ? getVerificationStatus(business, now) : null;
  const replyDeadline = now.getTime() - REVIEW_REPLY_GRACE_DAYS * DAY_MS;
  const upkeep: UpkeepChecks = {
    verificationCurrent:
      verification?.state === "verified" || verification?.state === "expiring",
    hoursPresent:
      !!hours && (Array.isArray(hours) ? hours.length > 0 : Object.keys(hours).length > 0),
    profileFresh:
      !!business?.updated_at &&
      now.getTime() - new Date(business.updated_at).getTime() < LOYALTY_FRESH_DAYS * DAY_MS,
    // No reviews is not a failure — there is nothing to answer. Only reviews
    // published longer ago than the grace window can count against the owner.
    reviewsAnswered: (reviews ?? [])
      .filter((r) => r.published_at && new Date(r.published_at).getTime() < replyDeadline)
      .every((r) => !!r.owner_reply),
  };
  const ok = upkeepOk(upkeep);

  const plan = (business?.plan as PlanId) ?? "free";
  const planLive = !business?.plan_until || new Date(business.plan_until) > now;

  if (!settings.enabled) {
    return {
      enabled: false,
      tenure,
      tier: null,
      next: null,
      upkeep,
      upkeepOk: ok,
      bonus: { photos: 0, announcements: 0 },
      tiers,
    };
  }

  // A lapsed plan earns nothing, for the same reason entitlementsFor treats it
  // as free: continuity is the whole meaning of tenure.
  const months = planLive ? tenure.months : 0;

  return {
    enabled: true,
    tenure,
    tier: loyaltyTierFor(months, tiers),
    next: nextLoyaltyTier(months, tiers),
    upkeep,
    upkeepOk: ok,
    bonus: capacityBonusFor(plan, months, ok, tiers),
    tiers,
  };
}
