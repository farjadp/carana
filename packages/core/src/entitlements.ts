// ============================================================================
// Source: packages/core/src/entitlements.ts
// Version: 1.0.0 — 2026-08-24
// Why: The single question "may this listing do X?", and the two orderings
//      that answer depends on. It used to live in
//      apps/web/lib/billing/entitlements.ts marked "server only" — but the
//      three functions below are pure, and the 24 Aug parity audit found the
//      cost of that: mobile ordered by created_at while the website ordered
//      randomly with a paid boost, so the same directory answered the same
//      question two different ways depending on which client asked.
//
//      Why not read `businesses.plan` directly: a paid period ends at a
//      moment, and the webhook that downgrades it can be late (Stripe
//      retries, a deploy, a network blip). Reading the column alone would
//      keep a lapsed listing featured. `entitlementsFor` treats an expired
//      `plan_until` as free regardless of what the column says, so lateness
//      costs the customer nothing and costs us nothing either — the state is
//      recomputed, not trusted.
//
//      A UI check is a convenience. This module is the rule. The server-side
//      fetch-and-compute wrapper (`getEntitlements`) stays in apps/web,
//      because it takes a SupabaseClient and nothing here may import one.
// Env / Identity: Pure data + arithmetic, safe on the client — web and
//      native. No IO, no secrets, no platform APIs.
// ============================================================================
import {
  ANNOUNCEMENT_LIMITS,
  FEATURED_RANDOM_BOOST,
  GALLERY_LIMITS,
  PLANS,
  planOf,
  type Feature,
  type PlanId,
} from "./plans";

export type Entitlements = {
  plan: PlanId;
  /** The plan the row claims, before expiry is applied. Useful in the admin. */
  storedPlan: PlanId;
  expired: boolean;
  until: string | null;
  has: (feature: Feature) => boolean;
  /** `photos: null` means unlimited. */
  galleryLimit: { photos: number | null; video: boolean };
  /** `null` means unlimited. */
  announcementLimit: number | null;
};

export type BillingRow = {
  plan?: string | null;
  plan_until?: string | null;
  /**
   * End of a standalone Link Pro subscription — the $13/mo second axis, which
   * an individual with no listing can also buy (it is on `profiles` as well as
   * `businesses`). Never read it directly; see `hasLinkPro`.
   */
  link_pro_until?: string | null;
};

/**
 * Pure: given a row, what is actually unlocked right now.
 *
 * `bonus` is the «وفاداری مالک» capacity bump (see loyalty.ts) and is passed
 * IN rather than applied by callers afterwards. That is deliberate: this
 * function must stay the single answer to "may this listing do X", so a
 * loyalty bump is an argument to it, never a second code path that can
 * disagree with it. Callers that do not know or care about loyalty omit it
 * and get exactly the old behaviour.
 *
 * A bonus never turns a limit into unlimited and never applies to a plan that
 * is already unlimited — `capacityBonusFor` returns zero there, and the guard
 * below holds even if a caller hand-builds a bonus.
 */
export function entitlementsFor(
  row: BillingRow | null | undefined,
  now = new Date(),
  bonus?: { photos: number; announcements: number } | null
): Entitlements {
  const storedPlan = (row?.plan as PlanId) ?? "free";
  const until = row?.plan_until ?? null;
  const expired = storedPlan !== "free" && !!until && new Date(until) < now;
  const plan: PlanId = expired ? "free" : storedPlan;
  const features = new Set(PLANS[plan]?.features ?? PLANS.free.features);

  const baseGallery = GALLERY_LIMITS[plan] ?? GALLERY_LIMITS.free;
  const baseAnnouncements = ANNOUNCEMENT_LIMITS[plan] ?? ANNOUNCEMENT_LIMITS.free;
  // An expired plan is a free plan, and a free plan has earned no loyalty:
  // continuity is what tenure means, so a lapsed listing keeps no bump.
  const bump = expired || plan === "free" ? null : bonus;

  return {
    plan,
    storedPlan,
    expired,
    until,
    has: (feature) => features.has(feature),
    galleryLimit:
      bump && bump.photos > 0 && baseGallery.photos != null
        ? { ...baseGallery, photos: baseGallery.photos + bump.photos }
        : baseGallery,
    announcementLimit:
      bump && bump.announcements > 0 && baseAnnouncements != null
        ? baseAnnouncements + bump.announcements
        : baseAnnouncements,
  };
}

/**
 * May this owner use the paid link-in-bio features right now?
 *
 * Two ways to qualify, and they are OR-ed on purpose:
 *   1. a standalone Link Pro subscription ($13/mo), or
 *   2. any paid directory plan, which includes Link Pro at no extra cost.
 *
 * (2) is what makes Starter at $21 strictly better than Link Pro at $13
 * instead of a rival to it. If this ever becomes an AND, or if a caller
 * branches on `link_pro_until` alone, that pricing logic quietly breaks.
 *
 * Expiry is recomputed here rather than trusted, for the same reason
 * `entitlementsFor` recomputes it: the webhook that ends a period can be
 * late, and lateness must not cost the customer or us.
 */
export function hasLinkPro(row: BillingRow | null | undefined, now = new Date()): boolean {
  if (entitlementsFor(row, now).plan !== "free") return true;
  const until = row?.link_pro_until;
  return !!until && new Date(until) > now;
}

/**
 * Is this listing entitled to the «ویژه» chip and the placements that go with
 * it, right now? The one predicate every surface should ask — never
 * `row.plan === "featured"`, which ignores expiry and forgets Platinum.
 */
export const isFeatured = (row: BillingRow | null | undefined, now = new Date()) =>
  entitlementsFor(row, now).has("featured_placement");

/**
 * Featured listings sort first *and* are labelled. Callers must render the
 * chip when `featured` is true — an unlabelled paid position is an
 * advertisement pretending to be a search result.
 */
export function sortFeaturedFirst<T extends BillingRow & { id: string }>(rows: T[], now = new Date()) {
  return rows
    .map((r) => ({ row: r, featured: isFeatured(r, now) }))
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}

export const planLabel = (id: string | null | undefined) => planOf(id).name;

/**
 * The default "no sort" listing order: genuinely random on every call, with
 * `featured_placement` businesses (Premium, Platinum) getting
 * `FEATURED_RANDOM_BOOST` (89%) more selection weight than everyone else.
 *
 * Algorithm: Efraimidis–Spirakis weighted random sampling — each row gets a
 * key of `Math.random() ** (1 / weight)`, sorted descending. A higher weight
 * raises a row's *expected* rank; it does not fix it, so two calls with the
 * same input still produce different orders. This is why the boost is
 * honest rather than a paid-and-hidden ranking (house rule #2 in plans.ts):
 * the outcome is still random, and every business it can lift already wears
 * the "ویژه" chip that the card renders unconditionally — callers must
 * render that card (or something that shows the same chip) or the boost has
 * no visible justification.
 *
 * Callers decide how much of the filtered set to pass in; this does not
 * paginate or query.
 */
export function weightedRandomOrder<T extends BillingRow>(rows: T[], now = new Date()): T[] {
  return rows
    .map((row) => {
      const weight = isFeatured(row, now) ? 1 + FEATURED_RANDOM_BOOST : 1;
      return { row, key: Math.random() ** (1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .map((x) => x.row);
}
