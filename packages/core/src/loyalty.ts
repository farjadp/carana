// ============================================================================
// Source: packages/core/src/loyalty.ts
// Version: 1.0.0 — 2026-08-26
// Why: «وفاداری مالک» — phase 4 of docs/16-standing-and-loyalty.md. What a
//      business owner has earned by staying, and by keeping their listing
//      worth staying for.
//
//      THE WALL (docs/16): nothing in this file may become a trust signal.
//      Tenure is a FACT about a customer relationship — «۳ سال در گوپلازا» is
//      publishable; «کسب‌وکار مورد اعتماد» is not, and no export here says
//      anything of the second kind. Loyalty buys money and room, never
//      credibility.
//
//      TENURE IS DERIVED, NEVER STORED. It is computed from the periods the
//      owner actually paid for (invoices), for the same reason
//      `entitlementsFor` recomputes expiry rather than trusting the column: a
//      stored tenure drifts from Stripe on the first late webhook, and it
//      drifts in the direction that costs us money.
// Env / Identity: Pure. No IO, no Supabase, no process.env — safe on server,
//      client and in the Expo bundle.
// ============================================================================
import { GALLERY_LIMITS, ANNOUNCEMENT_LIMITS, type PlanId } from "./plans";

/** One paid billing period, as recorded on an invoice. */
export interface PaidPeriod {
  start: string;
  end: string;
}

/**
 * How long a gap between paid periods may be before continuity breaks.
 *
 * Sized to swallow one late monthly payment (Stripe's dunning retries run for
 * weeks) without swallowing a real lapse. A customer who left for two months
 * and came back starts again — that is what "continuous" means, and pretending
 * otherwise would pay a loyalty discount for a period nobody paid us for.
 */
export const TENURE_GAP_GRACE_DAYS = 45;

const DAY_MS = 86_400_000;

/** Whole calendar months between two dates, floored, never negative. */
function monthsBetween(from: Date, to: Date): number {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Merge overlapping/adjacent periods into runs, gaps wider than grace splitting them. */
function runs(periods: PaidPeriod[], graceDays: number): { start: Date; end: Date }[] {
  const valid = periods
    .map((p) => ({ start: new Date(p.start), end: new Date(p.end) }))
    .filter((p) => !Number.isNaN(p.start.getTime()) && !Number.isNaN(p.end.getTime()) && p.end >= p.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const out: { start: Date; end: Date }[] = [];
  for (const p of valid) {
    const last = out[out.length - 1];
    if (last && p.start.getTime() - last.end.getTime() <= graceDays * DAY_MS) {
      if (p.end > last.end) last.end = p.end;
    } else {
      out.push({ ...p });
    }
  }
  return out;
}

export interface Tenure {
  /** Whole months of UNBROKEN paid history ending now. 0 once continuity breaks. */
  months: number;
  /** When the current unbroken run began, or null if there is no live run. */
  since: string | null;
  /** Every paid month ever, gaps excluded. A fact that never decreases. */
  lifetimeMonths: number;
}

/**
 * Tenure from paid periods.
 *
 * `months` deliberately drops to zero the moment continuity breaks, while
 * `lifetimeMonths` never does — the same split `peak_level` and the judged
 * level have on the contributor side. One is what you have earned today; the
 * other is what is true about the past, and the UI may show both as long as
 * it does not confuse them.
 */
export function tenureFrom(
  periods: PaidPeriod[],
  now: Date = new Date(),
  graceDays: number = TENURE_GAP_GRACE_DAYS
): Tenure {
  const merged = runs(periods, graceDays);
  const lifetimeMonths = merged.reduce((sum, r) => sum + monthsBetween(r.start, r.end), 0);

  const live = merged[merged.length - 1];
  const stillLive = !!live && now.getTime() - live.end.getTime() <= graceDays * DAY_MS;
  if (!live || !stillLive) return { months: 0, since: null, lifetimeMonths };

  // Measured to now, not to the period end: a customer eleven months into a
  // twelve-month term has been with us eleven months, not twelve.
  return {
    months: monthsBetween(live.start, now < live.end ? now : live.end),
    since: live.start.toISOString(),
    lifetimeMonths,
  };
}

// --------------------------------------------------------------- the ladder

export interface LoyaltyTier {
  /** Whole continuous months required. */
  months: number;
  /** Percent off the renewal. */
  percentOff: number;
  /** Extra gallery photos, on plans that have a photo limit at all. */
  bonusPhotos: number;
  /** Extra announcements, on plans that have an announcement limit at all. */
  bonusAnnouncements: number;
  labelFa: string;
}

/**
 * DEFAULTS, not decisions. These are deliberately modest, and every one of
 * them is a green admin knob (site_settings key "loyalty"). They pay nothing
 * at all until the master switch is turned on, which the migration seeds OFF
 * — a discount ladder is real money leaving the business, and it starts
 * moving when Farjad says so, not when a deploy lands.
 */
export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  { months: 12, percentOff: 5, bonusPhotos: 2, bonusAnnouncements: 1, labelFa: "یک سال با گوپلازا" },
  { months: 24, percentOff: 10, bonusPhotos: 5, bonusAnnouncements: 2, labelFa: "دو سال با گوپلازا" },
  { months: 36, percentOff: 15, bonusPhotos: 10, bonusAnnouncements: 3, labelFa: "سه سال با گوپلازا" },
];

/** The highest tier this many continuous months has reached, or null. */
export function loyaltyTierFor(
  months: number,
  tiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS
): LoyaltyTier | null {
  let best: LoyaltyTier | null = null;
  for (const t of tiers) if (months >= t.months && (!best || t.months > best.months)) best = t;
  return best;
}

/** The next rung, so the UI can say what is coming rather than only what is held. */
export function nextLoyaltyTier(
  months: number,
  tiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS
): LoyaltyTier | null {
  let next: LoyaltyTier | null = null;
  for (const t of tiers) if (months < t.months && (!next || t.months < next.months)) next = t;
  return next;
}

// ---------------------------------------------------------------- upkeep

/**
 * Is the listing being kept worth its place?
 *
 * WHAT UPKEEP GATES, AND WHAT IT DOES NOT: it gates the capacity bonus and
 * nothing else. Earning more room in the directory while the room you already
 * hold is stale is backwards, and room is reversible — it can be given and
 * withdrawn without anyone being charged differently.
 *
 * It deliberately does NOT gate the discount. Money must be predictable: a
 * renewal price that silently changes because a review went unanswered is the
 * kind of surprise that costs a customer, not a feature.
 */
export interface UpkeepChecks {
  /** Verification is currently valid (verified or inside its renewal window). */
  verificationCurrent: boolean;
  /** Working hours are filled in at all. */
  hoursPresent: boolean;
  /** The listing has been edited within LOYALTY_FRESH_DAYS. */
  profileFresh: boolean;
  /** Every published review old enough to answer has an owner reply. */
  reviewsAnswered: boolean;
}

/** How long a listing may go untouched before it stops counting as maintained. */
export const LOYALTY_FRESH_DAYS = 365;

/** How long an owner has to answer a review before it counts against upkeep. */
export const REVIEW_REPLY_GRACE_DAYS = 14;

export const upkeepOk = (u: UpkeepChecks): boolean =>
  u.verificationCurrent && u.hoursPresent && u.profileFresh && u.reviewsAnswered;

export const UPKEEP_LABELS_FA: Record<keyof UpkeepChecks, string> = {
  verificationCurrent: "تأیید هویت معتبر است",
  hoursPresent: "ساعت کاری پر شده",
  profileFresh: "پروفایل در یک سال گذشته به‌روز شده",
  reviewsAnswered: "به نظرها پاسخ داده شده",
};

// ------------------------------------------------------------ the capacity

export interface CapacityBonus {
  photos: number;
  announcements: number;
}

export const NO_BONUS: CapacityBonus = { photos: 0, announcements: 0 };

/**
 * Extra room earned — and ZERO on any plan that is already unlimited.
 *
 * This matters more than it looks. Premium and Platinum already have
 * `photos: null` and `announcements: null`, so for two of the three paid
 * tiers a "bonus" of +5 photos is not a small reward, it is a false one. Only
 * Starter has a ceiling to raise, so only Starter gets a number here — and the
 * UI must render nothing rather than a bonus of zero.
 */
export function capacityBonusFor(
  plan: PlanId,
  months: number,
  upkeep: boolean,
  tiers: LoyaltyTier[] = DEFAULT_LOYALTY_TIERS
): CapacityBonus {
  if (!upkeep) return NO_BONUS;
  const tier = loyaltyTierFor(months, tiers);
  if (!tier) return NO_BONUS;
  return {
    photos: GALLERY_LIMITS[plan]?.photos == null ? 0 : tier.bonusPhotos,
    announcements: ANNOUNCEMENT_LIMITS[plan] == null ? 0 : tier.bonusAnnouncements,
  };
}

export const hasBonus = (b: CapacityBonus) => b.photos > 0 || b.announcements > 0;
