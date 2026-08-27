// ============================================================================
// Source: lib/time.ts
// Version: 1.0.0 — 2026-08-27
// Why: One definition of "the last N days/hours as an ISO timestamp". These
//      windows were retyped inline in a dozen places, and inside a server
//      component the inline `Date.now()` also trips react-hooks/purity —
//      the rule fires on the call site, not on the request-scoped read,
//      which is what a server component actually does.
// Env / Identity: Pure helpers, no secrets, no I/O.
// ============================================================================

const DAY_MS = 86_400_000;

/** ISO timestamp for `days` days before now — for `.gte("created_at", …)`. */
export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** ISO timestamp for `hours` hours before now. */
export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
