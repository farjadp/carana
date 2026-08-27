// ============================================================================
// Source: apps/web/lib/corrections/apply.ts
// Version: 1.0.0 — 2026-08-26
// Why: The one place a proposed correction becomes a value on a listing.
//      Both the auto-publish path (a معتمد's low-risk proposal) and the admin
//      path go through it, so the two cannot drift about what "applied" means
//      or forget to settle the ledger.
//
//      THE LADDER'S ONE REAL POWER LIVES HERE. `canAutoPublish` is the whole
//      of phase 2: it re-derives the proposer's level from the ledger, checks
//      the field against LOW_RISK_FIELDS in core, and refuses if the standing
//      programme is switched off. Nothing else in the app may grant
//      publication to a non-owner.
// Env / Identity: Server only, service role. Callers do their own auth.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

import { isLowRisk, privilegesFor } from "@goplaza/core";

import { getStanding, recordEvent, reverseSubject, settleSubject } from "@/lib/standing/ledger";
import { getStandingSettings } from "@/lib/standing/rules";

export type AutoPublishRefusal =
  | "programme_disabled"
  | "field_not_low_risk"
  | "level_too_low";

/**
 * May this person's proposal on this field go live without a human?
 *
 * Returns the refusal reason rather than a bare false: "why did my correction
 * queue?" is a question the API answers, and a silent false makes it
 * unanswerable.
 */
export async function canAutoPublish(
  userId: string,
  field: string
): Promise<{ ok: true } | { ok: false; why: AutoPublishRefusal }> {
  const settings = await getStandingSettings();
  if (!settings.enabled) return { ok: false, why: "programme_disabled" };
  if (!isLowRisk(field)) return { ok: false, why: "field_not_low_risk" };

  const standing = await getStanding(userId);
  if (!standing || !privilegesFor(standing.level).autoPublishLowRisk) {
    return { ok: false, why: "level_too_low" };
  }
  return { ok: true };
}

/**
 * Write the proposed value onto the listing and close the correction.
 *
 * `by` is the admin for a reviewed application and null for an auto-publish —
 * which is exactly what makes `applied_directly` meaningful later: a row with
 * applied_directly true and decided_by null is one the ladder let through.
 */
export async function applyCorrection(
  admin: SupabaseClient,
  correctionId: string,
  by: string | null,
  opts: { directly: boolean; note?: string }
): Promise<{ ok: boolean; error?: string }> {
  const { data: c } = await admin
    .from("business_corrections")
    .select("id, business_id, user_id, field, proposed, status")
    .eq("id", correctionId)
    .maybeSingle();
  if (!c) return { ok: false, error: "correction not found" };
  if (c.status !== "pending") return { ok: false, error: `already ${c.status}` };

  const { error: upErr } = await admin
    .from("businesses")
    .update({ [c.field as string]: c.proposed, updated_at: new Date().toISOString() })
    .eq("id", c.business_id);
  if (upErr) return { ok: false, error: upErr.message };

  const { error } = await admin
    .from("business_corrections")
    .update({
      status: "applied",
      applied_directly: opts.directly,
      decided_by: by,
      decided_at: new Date().toISOString(),
      note: opts.note ?? null,
    })
    .eq("id", correctionId)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };

  // The contribution held up, so the ledger settles. Keyed on the CORRECTION,
  // not the business: one person may correct the same listing more than once,
  // and each correction is its own contribution.
  await settleSubject("business_edit", "correction", correctionId, by);
  return { ok: true };
}

export async function rejectCorrection(
  admin: SupabaseClient,
  correctionId: string,
  by: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  if (!note.trim()) return { ok: false, error: "reason required" };
  const { error } = await admin
    .from("business_corrections")
    .update({ status: "rejected", decided_by: by, decided_at: new Date().toISOString(), note })
    .eq("id", correctionId)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  await reverseSubject("correction", correctionId, by, note);
  return { ok: true };
}

/** Record the pending ledger event for a new correction. Never fatal. */
export function recordCorrectionEvent(userId: string, correctionId: string) {
  return recordEvent({
    userId,
    kind: "business_edit",
    subjectType: "correction",
    subjectId: correctionId,
  }).catch((e) => console.error("standing: record business_edit failed", e));
}
