// ============================================================================
// Source: lib/observability/report.ts
// Version: 2.0.0 — 2026-08-26
// Why: The failures in this project do not throw. sendEmail and sendSms return
//      { sent: false } and carry on, which is correct behaviour and also the
//      reason three outages in one week were found by auditing rather than by
//      being told. An exception handler would have caught none of them.
// Env / Identity: Server only. Writes through the admin client because
//      system_errors and cron_runs have no client-facing RLS policy.
//
// This replaced a Sentry integration. The vendor was the expensive part; the
// useful part was naming the failure class, and that is kept.
// ============================================================================
import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** Anything that failed but did not throw. */
export type QuietFailure =
  | "email_not_configured"
  | "email_send_failed"
  | "sms_not_configured"
  | "sms_send_failed"
  | "sms_carrier_rejected"
  | "verification_write_failed"
  | "reminder_send_failed"
  | "job_reminder_send_failed"
  | "job_reminder_no_address"
  | "cron_run_failed"
  | "request_error"
  | "exchange_rates_http"
  | "exchange_rates_shape"
  | "exchange_rates_fetch_failed"
  // GPLZ Link analytics. A rollup that fails is not an outage — the raw
  // events are still there and the next run retries the day — but it must
  // leave a trace, because the symptom otherwise is a customer's chart
  // missing a day months later with nothing to explain it.
  | "link_rollup_day"
  | "link_rollup_backlog"
  | "link_prune";

/**
 * Record a failure the product deliberately swallowed.
 *
 * Never awaited by callers and never allowed to throw: a reporting failure
 * must not become a second, louder outage on top of the first one. If the
 * insert fails, the console line is still there.
 */
export function reportQuietFailure(
  kind: QuietFailure,
  detail: Record<string, unknown> = {}
): void {
  // Kept regardless of whether the insert lands. During an incident the
  // Vercel log is the fastest thing to read.
  console.error(`[quiet-failure] ${kind}`, detail);

  void (async () => {
    try {
      const admin = createSupabaseAdminClient();
      await admin.from("system_errors").insert({
        kind,
        detail,
        environment: process.env.VERCEL_ENV ?? "development",
      });
    } catch (err) {
      console.error("[quiet-failure] could not record:", err);
    }
  })();
}

/**
 * Wrap a scheduled job so both halves of "did it work" are observable.
 *
 * A job that fails writes a row saying so. A job that silently stops running
 * writes nothing at all — so the signal is the *absence* of recent rows, which
 * only works if successful runs are recorded too. That is why this writes on
 * the happy path as well.
 */
export async function withCronRun<T>(
  job: string,
  run: () => Promise<{ result: T; summary?: Record<string, unknown> }>
): Promise<T> {
  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();

  try {
    const { result, summary } = await run();

    await admin.from("cron_runs").insert({
      job,
      status: "ok",
      summary: summary ?? {},
      duration_ms: Date.now() - startedAt,
    });

    return result;
  } catch (error) {
    await admin.from("cron_runs").insert({
      job,
      status: "error",
      summary: { error: String(error) },
      duration_ms: Date.now() - startedAt,
    });

    reportQuietFailure("cron_run_failed", { job, error: String(error) });
    throw error;
  }
}

/**
 * Hours since the last successful run of a job, or null if it has never run.
 *
 * This is the heartbeat check. A number climbing past the job's interval means
 * the schedule stopped firing — the failure mode that produces no log line and
 * no error, because nothing executed.
 */
export async function hoursSinceLastRun(job: string): Promise<number | null> {
  const admin = createSupabaseAdminClient();

  const { data } = await admin
    .from("cron_runs")
    .select("created_at")
    .eq("job", job)
    .eq("status", "ok")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.created_at) return null;

  return (Date.now() - new Date(data.created_at).getTime()) / 3_600_000;
}
