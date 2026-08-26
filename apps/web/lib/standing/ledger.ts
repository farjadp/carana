// ============================================================================
// Source: apps/web/lib/standing/ledger.ts
// Version: 1.0.0 — 2026-08-26
// Why: The only writer of standing_events — record, settle, reverse,
//      recompute. Emitters (channel submit, review moderation, …) call these
//      and never touch the table themselves, so the guards below cannot be
//      bypassed by a second code path.
//
//      Two behaviours here are the product, not plumbing:
//
//      * recordEvent() IGNORES the master switch. With the program disabled
//        we still record — as pending — so flipping it on later loses nothing.
//        Getting this backwards is the difference between a switch and a
//        shredder.
//      * A blocked settle leaves the event PENDING, never voided. The user
//        who verifies their phone next month must collect their backlog; the
//        one who hits today's cap settles tomorrow.
//
//      Settlement freezes points + rule version into the row (docs/16). No
//      function in this file updates points on a settled row, and none may.
// Env / Identity: Server only, service role throughout. Admin-triggered paths
//      pass `by`; system paths (moderation hooks, cron) leave it null.
// ============================================================================
import { levelFor, type StandingAggregates, type StandingLevel } from "@goplaza/core";

import { getRule, getStandingSettings } from "@/lib/standing/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type SettleBlock =
  | "program_disabled"
  | "rule_missing"
  | "rule_disabled"
  | "not_verified"
  | "frozen"
  | "self_dealing"
  | "daily_cap"
  | "no_pending_event";

export interface SettleResult {
  ok: boolean;
  settled: number;
  /** Named reason when nothing settled — a silent no-op here is undebuggable. */
  blocked?: SettleBlock;
  error?: string;
}

interface RecordInput {
  userId: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  meta?: Record<string, unknown>;
}

/**
 * Insert a pending event. Idempotent by the DB's unique constraint — a
 * duplicate is a success, not an error, and callers never check first.
 * Deliberately does NOT consult the master switch (see header).
 */
export async function recordEvent(
  input: RecordInput
): Promise<{ ok: boolean; skipped?: "duplicate"; error?: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("standing_events").insert({
      user_id: input.userId,
      kind: input.kind,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      meta: input.meta ?? {},
    });
    if (error) {
      // 23505 = unique_violation: this contribution is already on the ledger.
      if (error.code === "23505") return { ok: true, skipped: "duplicate" };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

/** The six settle guards, in the order that gives the most useful reason. */
async function settleBlockFor(
  userId: string,
  kind: string,
  subjectType: string,
  subjectId: string
): Promise<SettleBlock | null> {
  const settings = await getStandingSettings();
  if (!settings.enabled) return "program_disabled";

  const rule = await getRule(kind);
  if (!rule) return "rule_missing";
  if (!rule.enabled) return "rule_disabled";

  const admin = createSupabaseAdminClient();

  // 3. Only a verified account settles. Email or phone — either proof.
  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified_at, phone_verified_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.email_verified_at && !profile?.phone_verified_at) return "not_verified";

  // 4. Frozen stops accrual without destroying history.
  const { data: standing } = await admin
    .from("user_standing")
    .select("frozen")
    .eq("user_id", userId)
    .maybeSingle();
  if (standing?.frozen) return "frozen";

  // 5. No self-dealing. For business subjects: owner, creator or member earns
  // nothing from their own listing. For channels: the submitter earns nothing
  // from reconfirming their own entry — that is an obligation, not a favour.
  if (subjectType === "business") {
    const [{ data: biz }, { data: membership }] = await Promise.all([
      admin
        .from("businesses")
        .select("owner_user_id, created_by")
        .eq("id", subjectId)
        .maybeSingle(),
      admin
        .from("business_memberships")
        .select("id")
        .eq("business_id", subjectId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    // business_submit is the exception: creating your own listing IS the
    // contribution. Editing or reviewing it is not.
    if (kind !== "business_submit") {
      if (biz?.owner_user_id === userId || biz?.created_by === userId || membership)
        return "self_dealing";
    }
  }
  if (subjectType === "review") {
    const { data: review } = await admin
      .from("public_reviews")
      .select("business_id")
      .eq("id", subjectId)
      .maybeSingle();
    if (review?.business_id) {
      const [{ data: biz }, { data: membership }] = await Promise.all([
        admin
          .from("businesses")
          .select("owner_user_id, created_by")
          .eq("id", review.business_id)
          .maybeSingle(),
        admin
          .from("business_memberships")
          .select("id")
          .eq("business_id", review.business_id)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (biz?.owner_user_id === userId || biz?.created_by === userId || membership)
        return "self_dealing";
    }
  }
  if (kind === "channel_reconfirm") return "self_dealing";

  // 6. Daily cap, counted over settlements today — not submissions.
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from("standing_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("state", "confirmed")
    .gt("settled_at", dayAgo);
  if ((count ?? 0) >= rule.daily_cap) return "daily_cap";

  return null;
}

/**
 * pending → confirmed for one subject's event, freezing points + version
 * from the rule at this moment. `by` is the admin for manual settles, null
 * for moderation hooks and the cron.
 */
export async function settleSubject(
  kind: string,
  subjectType: string,
  subjectId: string,
  by?: string | null,
  reason?: string
): Promise<SettleResult> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: event } = await admin
      .from("standing_events")
      .select("id, user_id, state")
      .eq("kind", kind)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .eq("state", "pending")
      .maybeSingle();
    if (!event) return { ok: true, settled: 0, blocked: "no_pending_event" };

    const blocked = await settleBlockFor(event.user_id, kind, subjectType, subjectId);
    if (blocked) return { ok: true, settled: 0, blocked };

    const rule = await getRule(kind);
    if (!rule) return { ok: true, settled: 0, blocked: "rule_missing" };

    // The freeze: points + version copied now, never touched again.
    const { error } = await admin
      .from("standing_events")
      .update({
        state: "confirmed",
        points: rule.points,
        rule_version: rule.version,
        settled_at: new Date().toISOString(),
        settled_by: by ?? null,
        reason: reason ?? null,
      })
      .eq("id", event.id)
      .eq("state", "pending"); // races settle once
    if (error) return { ok: false, settled: 0, error: error.message };

    await recomputeUser(event.user_id);
    return { ok: true, settled: 1 };
  } catch (e) {
    return { ok: false, settled: 0, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * → reversed for EVERY confirmed AND pending event pointing at a subject.
 * Confirmed, because an upheld report reverses all credit the subject ever
 * produced; pending too, because an explicit rejection means the contribution
 * was wrong, and "wrong before it settled" still belongs in the accuracy
 * denominator — otherwise a user could farm accuracy by only ever having
 * their rejects die quietly as pending. Reason is required: this is the row
 * a user will ask about.
 *
 * points stays frozen (0 for never-settled rows). xp falls because
 * recompute_standing sums only confirmed rows — history is re-read, never
 * edited.
 */
export async function reverseSubject(
  subjectType: string,
  subjectId: string,
  by: string | null,
  reason: string
): Promise<{ ok: boolean; reversed: number; error?: string }> {
  if (!reason.trim()) return { ok: false, reversed: 0, error: "reason required" };
  try {
    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("standing_events")
      .update({
        state: "reversed",
        settled_at: new Date().toISOString(),
        settled_by: by ?? null,
        reason,
      })
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .in("state", ["pending", "confirmed"])
      .select("user_id");
    if (error) return { ok: false, reversed: 0, error: error.message };
    const users = [...new Set((rows ?? []).map((r) => r.user_id as string))];
    for (const u of users) await recomputeUser(u);
    return { ok: true, reversed: rows?.length ?? 0 };
  } catch (e) {
    return { ok: false, reversed: 0, error: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Refresh one user's aggregates via SQL, then raise peak_level if the
 * *judged* level now exceeds it. Peak only ever rises — a reversal or lapse
 * lowers the computed level, never the record of what was reached.
 */
export async function recomputeUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.rpc("recompute_standing", { p_user: userId });
  const s = await getStanding(userId);
  if (s && s.level > s.aggregates.peak_level) {
    await admin
      .from("user_standing")
      .update({ peak_level: s.level, peak_level_at: new Date().toISOString() })
      .eq("user_id", userId);
  }
}

/**
 * The one read path for a user's standing. Every consumer goes through this,
 * so the thresholds-from-settings override is applied in exactly one place.
 */
export async function getStanding(
  userId: string
): Promise<{ aggregates: StandingAggregates; level: StandingLevel } | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("user_standing")
      .select(
        "xp, confirmed_count, reversed_count, distinct_kinds, accuracy, last_confirmed_at, peak_level, level_grant, frozen"
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return null;
    const aggregates: StandingAggregates = {
      ...data,
      accuracy: data.accuracy == null ? null : Number(data.accuracy),
    } as StandingAggregates;
    const settings = await getStandingSettings();
    const level = levelFor(
      aggregates,
      settings.thresholds,
      new Date(),
      settings.maintenance_window_days
    );
    return { aggregates, level };
  } catch {
    return null;
  }
}
