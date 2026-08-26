// ============================================================================
// Source: app/api/cron/link-analytics/route.ts
// Version: 1.1.0 — 2026-08-26 (it rolls up channels too)
// Why: Raw events were being recorded and never becoming analytics. Nothing
//      called roll_up_link_day, so `analytics_daily` stayed empty while
//      `link_events` filled up — and raw rows expire at 90 days, which meant
//      the history was quietly on a countdown to being unrecoverable.
//
//      This closes the loop: roll up every day that needs it, then prune the
//      raw rows past the retention window. Rollups are permanent, raw events
//      are not — that asymmetry is what makes "12 months of history" cheap
//      enough to sell.
//
//      IT ASKS THE DATABASE WHICH DAYS, rather than assuming "yesterday". A
//      missed run would otherwise lose a day for good once its raw rows
//      expire; link_days_needing_rollup returns every day with events and no
//      rollup, so a cron that was down for a week catches up on the next run.
//      Re-rolling is safe: roll_up_link_day deletes a day before rewriting it.
//
//      PRUNING RUNS ONLY IF THE ROLLUP SUCCEEDED. Deleting raw events after a
//      failed rollup would destroy the only copy of data that never made it
//      into a summary — the one ordering mistake here that cannot be undone.
//
//      v1.1 (26 Aug): channels were in the same position link pages had been.
//      `channel_events` was filling up and `roll_up_channel_day` existed, and
//      nothing ever called it — so every channel's view count read zero
//      forever, including on the page that displays it. Nothing failed and
//      nothing logged; the number was simply always the same number.
//
//      Channel days are rolled by date rather than by asking the database
//      which days need it: there is no channel_days_needing_rollup function,
//      and there does not need to be while `channel_events` is never pruned —
//      any day can be recomputed at any time, and roll_up_channel_day is
//      idempotent. If a prune is ever added, this must become a query first.
//
// Env / Identity: Public URL, so it authenticates. Vercel Cron sends
//      `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set it
//      refuses rather than defaulting to open — same shape as the other cron
//      routes, deliberately.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { reportQuietFailure, withCronRun } from "@/lib/observability/report";

export const dynamic = "force-dynamic";

/** Raw events live this long; their rollups live forever. */
const KEEP_DAYS = 90;

/**
 * How many recent days of channel events to recompute on every run. Three
 * covers a cron that missed a night, and re-rolling is free — the function
 * upserts on its own primary key.
 */
const CHANNEL_DAYS_PER_RUN = 3;

/**
 * Safety valve. A backlog this long means something was wrong for a quarter,
 * and grinding through it inside one request would time out anyway. The run
 * reports what it left rather than pretending it finished.
 */
const MAX_DAYS_PER_RUN = 40;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return withCronRun("link-analytics", async () => {
    const summary = await run();
    return { result: NextResponse.json(summary), summary };
  });
}

async function run() {
  const admin = createSupabaseAdminClient();

  const { data: days, error: daysError } = await admin.rpc("link_days_needing_rollup", { p_lookback: KEEP_DAYS + 5 });
  if (daysError) throw daysError;

  const list = ((days ?? []) as string[]).slice(0, MAX_DAYS_PER_RUN);
  const skipped = ((days ?? []) as string[]).length - list.length;

  let rowsWritten = 0;
  const failed: string[] = [];

  for (const day of list) {
    const { data, error } = await admin.rpc("roll_up_link_day", { p_day: day });
    if (error) {
      failed.push(day);
      reportQuietFailure("link_rollup_day", { day, message: error.message });
      continue;
    }
    rowsWritten += Number(data ?? 0);
  }

  // Only prune when every day this run touched succeeded. Raw events are the
  // sole copy of anything not yet summarised; deleting them after a partial
  // failure would turn a retryable problem into a permanent gap.
  let pruned: number | null = null;
  if (failed.length === 0) {
    const { data, error } = await admin.rpc("prune_link_events", { p_keep_days: KEEP_DAYS });
    if (error) {
      reportQuietFailure("link_prune", { message: error.message });
    } else {
      pruned = Number(data ?? 0);
    }
  }

  // ---- channels, on the same schedule and the same secret.
  let channelRowsWritten = 0;
  const channelDaysFailed: string[] = [];
  for (let back = 0; back < CHANNEL_DAYS_PER_RUN; back += 1) {
    const day = new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10);
    const { data, error } = await admin.rpc("roll_up_channel_day", { p_day: day });
    if (error) {
      channelDaysFailed.push(day);
      reportQuietFailure("channel_rollup_day", { day, message: error.message });
      continue;
    }
    channelRowsWritten += Number(data ?? 0);
  }

  if (skipped > 0) {
    // Never let a cap look like completion.
    reportQuietFailure("link_rollup_backlog", { skipped, cap: MAX_DAYS_PER_RUN });
  }

  return {
    daysConsidered: ((days ?? []) as string[]).length,
    daysRolled: list.length - failed.length,
    daysFailed: failed,
    daysSkipped: skipped,
    rowsWritten,
    rawEventsPruned: pruned,
    channelDaysRolled: CHANNEL_DAYS_PER_RUN - channelDaysFailed.length,
    channelDaysFailed,
    channelRowsWritten,
  };
}
