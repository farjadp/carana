// ============================================================================
// Source: packages/core/src/live-status.ts
// Version: 1.0.0 — 2026-08-16
// Why: "Busy now / quiet now" — a manual, self-expiring status the owner
//      sets (Starter+ feature, see apps/web/lib/billing/plans.ts). Lives in
//      @goplaza/core, not apps/web, so the mobile app reads the same expiry
//      rule instead of re-deriving it — same reason verification status
//      moved here (see apps/web/lib/verification/status.ts, a re-export).
//      Self-expiring on purpose: a status set once during a Friday rush must
//      not still read "busy" the following week because nobody remembered
//      to clear it. Never trust the stored value past its own timestamp —
//      same pattern as verified_until and plan_until.
// Env / Identity: Pure logic — safe on client and server, web and mobile.
// ============================================================================

export type BusyStatus = "busy" | "quiet";

/** How long a status lasts before it silently stops showing. */
export const BUSY_STATUS_HOURS = 4;

export type BusyStatusRow = { busy_status?: string | null; busy_status_until?: string | null };

/** The status to actually show right now, or `null` if unset/expired. */
export function activeBusyStatus(row: BusyStatusRow, now = new Date()): BusyStatus | null {
  if (row.busy_status !== "busy" && row.busy_status !== "quiet") return null;
  if (!row.busy_status_until) return null;
  if (new Date(row.busy_status_until) < now) return null;
  return row.busy_status;
}
