// ============================================================================
// Source: app/api/cron/standing-recompute/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: Nightly freshness for user_standing — recompute the aggregates of
//      every user whose ledger moved since the last successful run, and raise
//      peak_level where the judged level now exceeds it.
//
//      WHAT THIS CRON DELIBERATELY DOES NOT DO: apply maintenance decay.
//      There is nothing to apply — levelFor() reads last_confirmed_at at
//      judge time, so a lapsed level lapses on its own with no writer. If
//      decay logic ever appears here, the level has leaked into storage
//      somewhere; find it and remove it instead.
//
//      It asks cron_runs when it last succeeded rather than assuming
//      "yesterday", the same lesson link-analytics learned: a missed night
//      must not leave stale aggregates behind forever.
// Env / Identity: Public URL, so it authenticates: Vercel Cron sends
//      `Authorization: Bearer $CRON_SECRET`; without the secret set it
//      refuses rather than defaulting to open.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { recomputeUser } from "@/lib/standing/ledger";
import { withCronRun } from "@/lib/observability/report";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const JOB = "standing-recompute";
/** Backstop when cron_runs has no prior success (first run, or the table was cleared). */
const DEFAULT_LOOKBACK_DAYS = 7;
/** Safety valve against a runaway backlog inside one request. */
const MAX_USERS_PER_RUN = 500;

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

  const summary = await withCronRun(JOB, async () => {
    const admin = createSupabaseAdminClient();

    const { data: lastOk } = await admin
      .from("cron_runs")
      .select("created_at")
      .eq("job", JOB)
      .eq("status", "ok")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const since =
      lastOk?.created_at ??
      new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();

    // Every user whose ledger moved since then: new events (created_at) or
    // settlements/reversals (settled_at).
    const [{ data: created }, { data: settled }] = await Promise.all([
      admin.from("standing_events").select("user_id").gt("created_at", since).limit(5000),
      admin.from("standing_events").select("user_id").gt("settled_at", since).limit(5000),
    ]);
    const users = [...new Set([...(created ?? []), ...(settled ?? [])].map((r) => r.user_id as string))];
    const batch = users.slice(0, MAX_USERS_PER_RUN);

    for (const u of batch) await recomputeUser(u);

    return {
      result: { recomputed: batch.length, backlog: users.length - batch.length, since },
      summary: { recomputed: batch.length, backlog: users.length - batch.length, since },
    };
  });

  return NextResponse.json(summary);
}
