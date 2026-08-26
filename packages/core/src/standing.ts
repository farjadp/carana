// ============================================================================
// Source: packages/core/src/standing.ts
// Version: 1.0.0 — 2026-08-26
// Why: The single definition of the «اعتبار مشارکت» ladder for web and mobile.
//      The ledger and its aggregates live in SQL (standing_events,
//      user_standing), but the *judgement* — which level those aggregates add
//      up to, and what each level permits — lives only here. Putting any of
//      it in SQL would give the database one ladder and the app another, the
//      exact split plans.ts v3 was written to close.
//
//      Spec: docs/16-standing-and-loyalty.md. The two properties this file is
//      responsible for keeping true:
//
//      1. The level is COMPUTED, never stored. levelFor() reads
//         last_confirmed_at itself, so a lapsed contributor loses the level
//         the moment the window passes with no cron, no decay job, and no
//         stored verdict to go stale — the same read-time rule
//         channelActivity() and verification-status already follow.
//      2. Levels are permissions, badges are memories. privilegesFor() is the
//         only map from level to capability; nothing else may gate on a raw
//         level number, or the ladder grows a second meaning per call site.
//
// Env / Identity: Pure. No IO, no Supabase, no process.env — safe on server,
//      client and in the Expo bundle.
// ============================================================================

/**
 * 0 تازه‌وارد · 1 مشارکت‌کننده · 2 معتمد · 3 نگهبان
 *
 * Four, not seven: each level unlocks something that exists, and a level that
 * unlocks nothing gets deleted rather than kept as decoration. No metal names
 * — «پلاتینیوم» is a paid plan with 21 national seats, and a loyalty tier
 * sharing its name would sell the confusion.
 */
export type StandingLevel = 0 | 1 | 2 | 3;

export const LEVEL_LABELS_FA: Record<StandingLevel, string> = {
  0: "تازه‌وارد",
  1: "مشارکت‌کننده",
  2: "معتمد",
  3: "نگهبان",
};

/**
 * The aggregate row levelFor() judges — the shape user_standing holds and
 * recompute_standing() maintains. `accuracy` is null until anything has ever
 * settled: "no evidence yet" is a different claim from "0% right".
 */
export interface StandingAggregates {
  xp: number;
  confirmed_count: number;
  reversed_count: number;
  distinct_kinds: number;
  accuracy: number | null;
  last_confirmed_at: string | null;
  peak_level: number;
  level_grant: number | null;
  frozen: boolean;
}

/** What a level must show before it is granted. All conditions, not any. */
export interface LevelThreshold {
  xp: number;
  confirmed: number;
  /** Floor on confirmed/(confirmed+reversed). Being wrong demotes immediately. */
  accuracy: number;
  /** Distinct contribution kinds — variety, not volume. 200 identical
   *  hour-corrections must not reach معتمد. */
  kinds: number;
}

export interface StandingThresholds {
  level1: LevelThreshold;
  level2: LevelThreshold;
}

/**
 * GUESSES. These numbers have never met real data; they exist so the system
 * has a starting posture, and they are overridable at runtime from
 * site_settings (key "standing") via the admin page — which is where tuning
 * belongs once there are real contributors to tune against. Do not cite them
 * as researched.
 */
export const DEFAULT_THRESHOLDS: StandingThresholds = {
  level1: { xp: 100, confirmed: 5, accuracy: 0.8, kinds: 1 },
  level2: { xp: 500, confirmed: 25, accuracy: 0.9, kinds: 3 },
};

/**
 * How long a level survives absence: days since the last *confirmed*
 * contribution. Same philosophy as VERIFICATION_WINDOW_DAYS — a privilege
 * granted on year-old evidence is not evidence today. Absence lapses the
 * level; xp and peak_level do not move, and one confirmed contribution
 * restores it (the thresholds are cumulative, so nothing is re-earned from
 * zero).
 */
export const MAINTENANCE_WINDOW_DAYS = 180;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The ladder, judged. The evaluation order is the correctness of this
 * function — reordering it changes the product:
 *
 * 1. frozen → 0. An account under investigation holds no level.
 * 2. level_grant → returned as-is. This is how نگهبان exists; a grant is a
 *    role, not an earned rank, so it bypasses both the thresholds and the
 *    maintenance window. It is set only by an admin, with a reason.
 * 3. Absence: last_confirmed_at outside the window (or never) → 0.
 * 4. Otherwise the highest level whose xp AND confirmed AND accuracy AND
 *    variety are all met. A null accuracy meets no floor — nothing has ever
 *    settled, so there is no evidence to promote on.
 *
 * `now` is a parameter so the window boundary is testable without mocking
 * the clock.
 */
export function levelFor(
  a: StandingAggregates,
  t: StandingThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date(),
  windowDays: number = MAINTENANCE_WINDOW_DAYS
): StandingLevel {
  if (a.frozen) return 0;

  if (a.level_grant != null) {
    const g = Math.trunc(a.level_grant);
    return (g <= 0 ? 0 : g >= 3 ? 3 : g) as StandingLevel;
  }

  if (!a.last_confirmed_at) return 0;
  const idle = now.getTime() - new Date(a.last_confirmed_at).getTime();
  if (!(idle < windowDays * DAY_MS)) return 0;

  const meets = (lt: LevelThreshold) =>
    a.xp >= lt.xp &&
    a.confirmed_count >= lt.confirmed &&
    a.accuracy != null &&
    a.accuracy >= lt.accuracy &&
    a.distinct_kinds >= lt.kinds;

  if (meets(t.level2)) return 2;
  if (meets(t.level1)) return 1;
  return 0;
}

/**
 * What a level permits. This map is the ONLY place level numbers turn into
 * capabilities; call sites gate on these booleans, never on `level >= n`.
 *
 * As of phase 2 (26 Aug) all four have consumers: `autoPublishLowRisk` is read
 * by the corrections API, `canSeeQueue` by /corrections/queue, and the other
 * two by the corrections admin ordering and the public standing page.
 */
export interface StandingPrivileges {
  /** Their queue items sort ahead of anonymous ones. */
  queuePriority: boolean;
  /** Their confirmed-contribution count may show on their own profile. */
  showsContributions: boolean;
  /** Low-risk edits (LOW_RISK_FIELDS) publish without the queue. UNUSED in phase 1. */
  autoPublishLowRisk: boolean;
  /** Read-only moderation-queue view + flag for admin. UNUSED in phase 1. */
  canSeeQueue: boolean;
}

export function privilegesFor(level: StandingLevel): StandingPrivileges {
  return {
    queuePriority: level >= 1,
    showsContributions: level >= 1,
    autoPublishLowRisk: level >= 2,
    canSeeQueue: level >= 3,
  };
}

/**
 * What a contributor may PROPOSE a correction to at all.
 *
 * Everything here is operational: a wrong value is annoying or misleading,
 * never an identity claim. Name, category, city, address, ownership and the
 * licence fields are deliberately absent — changing those turns an approved
 * listing into a different business, which is why
 * lib/moderation/change-review.ts sends them to a human even when the OWNER
 * changes them. A stranger may not propose them at all.
 *
 * Column names, not friendly names: these strings are written straight into
 * an update, so they must match `businesses` exactly.
 */
export const CORRECTABLE_FIELDS = [
  "working_hours",
  "busy_status",
  "phone",
  "contact_email",
  "website",
  "instagram",
  "telegram",
  "booking_url",
  "google_maps_url",
  "postal_code",
] as const;

export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

/**
 * The subset a معتمد (level 2) may publish WITHOUT the queue — phase 2's
 * safety boundary, in code so it is reviewed in a diff and never editable
 * from the admin UI (docs/16, red list).
 *
 * The test is: what does a WRONG value cost the business? Wrong hours or a
 * stale busy flag embarrass. A wrong phone, website or social handle DIVERTS
 * the visitor to whoever wrote it, which makes every contact field an attack
 * surface against a rival — so a contributor may propose those, and an admin
 * still looks. Deliberately narrower than the brainstorm's "hours, phone,
 * temporary closure".
 */
export const LOW_RISK_FIELDS = ["working_hours", "busy_status"] as const;

export const isLowRisk = (field: string): boolean =>
  (LOW_RISK_FIELDS as readonly string[]).includes(field);

export const isCorrectable = (field: string): boolean =>
  (CORRECTABLE_FIELDS as readonly string[]).includes(field);

export const CORRECTABLE_LABELS_FA: Record<CorrectableField, string> = {
  working_hours: "ساعت کاری",
  busy_status: "وضعیت شلوغی",
  phone: "تلفن",
  contact_email: "ایمیل تماس",
  website: "وب‌سایت",
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  booking_url: "لینک رزرو",
  google_maps_url: "گوگل مپ",
  postal_code: "کد پستی",
};

// ---------------------------------------------------------------- badges

/**
 * Badges — phase 3.
 *
 * A badge is a VIEW OF HISTORY, not a record. `badgesFor` is a pure function
 * over counts the ledger already holds, and there is deliberately no badge
 * table: a stored badge is a second copy of the truth that can disagree with
 * the ledger, and re-tiering a family would then need a data migration
 * instead of a code change.
 *
 * BADGES UNLOCK NOTHING. Levels are permissions, badges are memory. The
 * moment a badge grants something it becomes a second permission system with
 * its own farming incentive — which is the whole reason the ladder was kept
 * to four rungs.
 */
export interface BadgeFamily {
  key: string;
  labelFa: string;
  emoji: string;
  /** Which confirmed `kind` counts toward it. */
  kind: string;
  /** Thresholds for tiers I..V. */
  tiers: readonly number[];
}

export const BADGE_FAMILIES: readonly BadgeFamily[] = [
  { key: "explorer", labelFa: "کاشف", emoji: "🧭", kind: "channel_submit", tiers: [1, 3, 10, 25, 100] },
  { key: "editor", labelFa: "اصلاح‌گر", emoji: "✏️", kind: "business_edit", tiers: [1, 5, 20, 50, 200] },
  { key: "reviewer", labelFa: "نظردهنده", emoji: "⭐", kind: "review_publish", tiers: [1, 3, 10, 25, 100] },
  { key: "guardian", labelFa: "دیده‌بان", emoji: "🛡", kind: "report_upheld", tiers: [1, 3, 10, 25, 100] },
  { key: "founder", labelFa: "بنیان‌گذار", emoji: "🏛", kind: "business_submit", tiers: [1, 3, 10, 25, 100] },
] as const;

export interface EarnedBadge {
  key: string;
  labelFa: string;
  emoji: string;
  /** 1..5 */
  tier: number;
  /** Confirmed contributions of this kind. */
  count: number;
  /** What the next tier needs, or null at the top. */
  nextAt: number | null;
}

export const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

/**
 * Badges from a map of kind → confirmed count.
 *
 * Counts must come from CONFIRMED events only. Feeding it pending or reversed
 * counts would hand out a badge for work that never held up, which is the one
 * thing the settled-not-granted design exists to prevent.
 */
export function badgesFor(
  confirmedByKind: Record<string, number>,
  families: readonly BadgeFamily[] = BADGE_FAMILIES
): EarnedBadge[] {
  const out: EarnedBadge[] = [];
  for (const f of families) {
    const count = confirmedByKind[f.kind] ?? 0;
    let tier = 0;
    for (let i = 0; i < f.tiers.length; i++) if (count >= f.tiers[i]) tier = i + 1;
    if (tier === 0) continue;
    out.push({
      key: f.key,
      labelFa: f.labelFa,
      emoji: f.emoji,
      tier,
      count,
      nextAt: tier < f.tiers.length ? f.tiers[tier] : null,
    });
  }
  return out.sort((a, b) => b.tier - a.tier || b.count - a.count);
}
