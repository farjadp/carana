// ============================================================================
// Source: lib/observability/report.ts
// Version: 1.0.0 — 2026-08-25
// Why: The failures in this project do not throw. sendEmail and sendSms return
//      { sent: false } and write to console.error, which on Vercel is
//      unretained and unwatched. Three separate outages in one week were all
//      found by going and looking, never by being told.
//
//      An exception handler alone would have caught none of them, because
//      nothing was ever thrown. These helpers are how a deliberate, quiet
//      failure becomes a signal.
// Env / Identity: Safe on server and client. Inert unless SENTRY_DSN is set,
//      so local development and preview stay silent.
// ============================================================================

import * as Sentry from "@sentry/nextjs";

/** Anything that failed but did not throw. */
export type QuietFailure =
  | "email_not_configured"
  | "email_send_failed"
  | "sms_not_configured"
  | "sms_send_failed"
  | "sms_carrier_rejected"
  | "verification_write_failed"
  | "reminder_send_failed"
  | "cron_run_failed";

/**
 * Report a failure that the product deliberately swallowed.
 *
 * Fail-soft is the right behaviour — a missing API key should not crash a
 * signup. But "the user's action silently did nothing" is precisely the class
 * of bug nobody reports, because from the outside it looks like success.
 */
export function reportQuietFailure(
  kind: QuietFailure,
  detail: Record<string, unknown> = {}
) {
  // Still log. When the DSN is absent this is the only record, and when it is
  // present the two agree, which makes the Vercel log usable during an incident.
  console.error(`[quiet-failure] ${kind}`, detail);

  Sentry.captureMessage(`Quiet failure: ${kind}`, {
    level: "error",
    tags: { quiet_failure: kind },
    extra: detail,
  });
}

/**
 * Wrap a scheduled job so that both halves of "did it work" are observable.
 *
 * A cron that fails is visible. A cron that silently stops running is not:
 * nothing appears in a log when nothing executes. Sentry's check-in API exists
 * for exactly that asymmetry — a missed check-in raises an alert on its own,
 * with no code running to raise it.
 */
export async function withCronMonitor<T>(
  slug: string,
  run: () => Promise<T>
): Promise<T> {
  const checkInId = Sentry.captureCheckIn({ monitorSlug: slug, status: "in_progress" });

  try {
    const result = await run();
    Sentry.captureCheckIn({ checkInId, monitorSlug: slug, status: "ok" });
    return result;
  } catch (error) {
    Sentry.captureCheckIn({ checkInId, monitorSlug: slug, status: "error" });
    Sentry.captureException(error, { tags: { cron: slug } });
    throw error;
  }
}
