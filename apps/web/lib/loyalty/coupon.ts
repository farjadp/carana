// ============================================================================
// Source: apps/web/lib/loyalty/coupon.ts
// Version: 1.0.0 — 2026-08-26
// Why: Turning an earned tier into a Stripe discount, and doing it
//      idempotently. One coupon per percentage, with a deterministic id
//      (`goplaza-loyalty-10`), created on first use and reused forever after —
//      so a redeploy, a retry or two owners checking out at once cannot leave
//      a drawer full of duplicate coupons.
//
//      duration:"forever" is deliberate and is only safe because of how it is
//      applied: the discount rides the SUBSCRIPTION, and `syncSubscriptionDiscount`
//      replaces it when the owner climbs to a better tier. A "once" coupon
//      would discount a single invoice and silently stop, which is not what
//      «تخفیف تمدید» says.
// Env / Identity: Server only. Never import from a client component.
// ============================================================================
import type { LoyaltyTier } from "@goplaza/core";

import { stripe } from "@/lib/stripe/client";

/** Deterministic, human-readable in the Stripe dashboard, stable across deploys. */
export const couponIdFor = (percentOff: number) => `goplaza-loyalty-${percentOff}`;

/**
 * The coupon for this percentage, creating it only if Stripe does not have it.
 * Races are handled by treating "already exists" as success, which is the
 * whole reason the id is deterministic rather than generated.
 */
export async function ensureLoyaltyCoupon(percentOff: number): Promise<string> {
  const s = stripe();
  const id = couponIdFor(percentOff);
  try {
    const existing = await s.coupons.retrieve(id);
    if (!existing.deleted) return id;
  } catch {
    // Not found — fall through and create it.
  }
  try {
    await s.coupons.create({
      id,
      percent_off: percentOff,
      duration: "forever",
      name: `GOPLAZA loyalty ${percentOff}%`,
      metadata: { source: "owner_loyalty" },
    });
  } catch (e) {
    // A concurrent request won the race; that is a success, not an error.
    const code = (e as { code?: string }).code;
    if (code !== "resource_already_exists") throw e;
  }
  return id;
}

/**
 * Put the earned tier's discount on a live subscription, or take it off.
 *
 * Replacing rather than stacking: Stripe would happily hold several coupons,
 * and a 5% earned last year sitting under this year's 10% is a discount
 * nobody agreed to. `discounts: []` clears.
 *
 * Returns what actually changed so the caller can report it honestly instead
 * of assuming.
 */
export async function syncSubscriptionDiscount(
  stripeSubscriptionId: string,
  tier: LoyaltyTier | null
): Promise<{ applied: number | null; changed: boolean }> {
  const s = stripe();
  const sub = await s.subscriptions.retrieve(stripeSubscriptionId);

  // In this pinned API version a Discount carries its coupon at
  // `source.coupon`, and unexpanded it is just the id. Our ids are
  // deterministic, so the percentage is readable either way — read the
  // expanded object when Stripe sent one, and parse our own id when it did
  // not. Discounts that are not ours (a promo code the owner typed) are
  // ignored rather than replaced: this function owns the loyalty discount and
  // nothing else.
  const current =
    (sub.discounts ?? [])
      .map((d) => {
        const coupon = typeof d === "string" ? null : d.source?.coupon;
        if (!coupon) return null;
        if (typeof coupon === "string") {
          const m = coupon.match(/^goplaza-loyalty-(\d+)$/);
          return m ? Number(m[1]) : null;
        }
        return coupon.metadata?.source === "owner_loyalty" ? coupon.percent_off ?? null : null;
      })
      .find((p) => p != null) ?? null;

  const wanted = tier?.percentOff ?? null;
  if (current === wanted) return { applied: current, changed: false };

  if (wanted == null) {
    await s.subscriptions.update(stripeSubscriptionId, { discounts: [] });
    return { applied: null, changed: true };
  }

  const coupon = await ensureLoyaltyCoupon(wanted);
  await s.subscriptions.update(stripeSubscriptionId, { discounts: [{ coupon }] });
  return { applied: wanted, changed: true };
}
