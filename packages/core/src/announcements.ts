// ============================================================================
// Source: packages/core/src/announcements.ts
// Version: 1.0.0 — 2026-11-15
// Why: How long a business announcement stays public. The dashboard used to
//      offer «تا حذف دستی», which stored expires_at = null, and every reader
//      (home band, profile banner, followed feed, mobile rails, the
//      search_announcements RPC) treats null as "never expires". A
//      back-to-school discount posted on 27 Aug was still on the home page
//      under «همین حالا در پلازا» in mid-November. An announcement is news;
//      it now always carries an end date, at most ANNOUNCEMENT_MAX_DAYS out.
// Env / Identity: Pure; shared by web and mobile.
// ============================================================================

/** The durations the dashboard offers, in days. */
export const ANNOUNCEMENT_DURATION_CHOICES = [7, 14, 30] as const;
export const ANNOUNCEMENT_DEFAULT_DAYS = 14;
export const ANNOUNCEMENT_MAX_DAYS = 30;

/**
 * The expires_at to store for a new announcement. Missing, zero, negative or
 * non-numeric input falls back to the default; anything longer is clamped to
 * the maximum. Never returns null.
 */
export function announcementExpiresAt(days: number | null | undefined, now: Date = new Date()): string {
  const n = typeof days === "number" && Number.isFinite(days) && days > 0 ? Math.ceil(days) : ANNOUNCEMENT_DEFAULT_DAYS;
  const clamped = Math.min(n, ANNOUNCEMENT_MAX_DAYS);
  return new Date(now.getTime() + clamped * 86_400_000).toISOString();
}
