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
 * PHASE 1 HONESTY NOTE: in phase 1 nothing consumes autoPublishLowRisk or
 * canSeeQueue — no code path auto-publishes an edit and no queue view exists
 * for non-admins. They are declared so phase 2 implements against a name
 * instead of inventing one, and so this comment (not absence of code) is
 * what says the feature is not live. queuePriority and showsContributions
 * gain consumers inside phase 1 itself.
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
 * The fields a معتمد (level 2) contributor's edit may publish without the
 * queue — phase 2's safety boundary, declared here so it is reviewed in a
 * diff and never edited from the admin UI (docs/16, red list). UNUSED in
 * phase 1: nothing auto-publishes yet.
 *
 * The judgement is the mirror image of the critical_fields list that
 * business_change_reviews already records — a change to either list should
 * make the reviewer look at the other. The test is: what does a WRONG value
 * cost the business? Wrong hours or a stale busy flag embarrass; a wrong
 * phone, website or social handle DIVERTS the visitor to whoever wrote it,
 * which makes every contact field an attack surface against a rival and
 * keeps all of them out of this list — deliberately narrower than the
 * brainstorm's "hours, phone, temporary closure".
 */
export const LOW_RISK_FIELDS = ["hours", "busy_status"] as const;
