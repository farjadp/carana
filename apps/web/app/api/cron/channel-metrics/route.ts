// ============================================================================
// Source: app/api/cron/channel-metrics/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: Keep «کانال‌ها و گروه‌ها» honest once a day, and write the one piece of
//      data in this whole build that cannot be recovered later.
//
//      THE SNAPSHOT IS THE POINT. Every run inserts one row per measurable
//      channel into channel_member_snapshots. Two columns. After a month it
//      answers «این کانال ماه گذشته ۱۲٪ رشد کرد», which nothing else in this
//      market has — and a day this cron does not run is a day of that history
//      that cannot be backfilled from anywhere. That is why the insert ships
//      with the first version of this route and not in a follow-up.
//
//      Nothing here fetches or stores post text. See lib/channels/metrics.ts.
//
//      Failures are absorbed. A channel whose read fails keeps the numbers it
//      already has, its failure counter goes up, and past
//      CHANNEL_CHECK_FAILURES_MAX it is demoted to 'declared' so the UI stops
//      calling those numbers measured. The route never 500s on one bad
//      channel: one unreachable link must not stop the other three hundred.
// Env / Identity: Server only. Vercel cron calls it with
//      `Authorization: Bearer $CRON_SECRET`; an admin can call it by hand with
//      ?n= to check more in one go. Same auth shape as blog-syndicate.
// ============================================================================
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { CHANNEL_CHECK_FAILURES_MAX } from "@goplaza/core";

import { requireAdmin } from "@/lib/auth/require-admin";
import { readTelegramMetrics, titleChangedMaterially } from "@/lib/channels/metrics";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DEFAULT_PER_RUN = Number(process.env.CHANNEL_METRICS_PER_RUN ?? 120);
// ~1.2 s of pacing per channel against an 800 s ceiling, with headroom for the
// fetches themselves. Asking for more than this would silently truncate.
const MAX_PER_RUN = 400;
const PACE_MS = 900;

function cronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function authorised(req: NextRequest): Promise<boolean> {
  if (cronAuthorised(req)) return true;
  try {
    await requireAdmin(await createSupabaseActionClient());
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorised(req))) return NextResponse.json({ ok: false }, { status: 401 });

  const requested = Number(new URL(req.url).searchParams.get("n") ?? DEFAULT_PER_RUN);
  const perRun = Math.min(Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_PER_RUN), MAX_PER_RUN);

  const admin = createSupabaseAdminClient();

  // Oldest check first, nulls first — a channel that has never been read is
  // the most out of date thing on the list.
  const { data: due } = await admin
    .from("channels")
    .select("id, slug, title, tg_username, metrics_source, member_count, check_failures")
    .eq("status", "published")
    .not("tg_username", "is", null)
    .order("metrics_checked_at", { ascending: true, nullsFirst: true })
    .limit(perRun);

  const rows = due ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  let checked = 0;
  let failed = 0;
  let demoted = 0;
  let requeued = 0;
  let snapshots = 0;

  for (const row of rows) {
    const metrics = await readTelegramMetrics(row.tg_username as string);

    if (!metrics) {
      failed += 1;
      const failures = (row.check_failures ?? 0) + 1;
      const giveUp = failures >= CHANNEL_CHECK_FAILURES_MAX;
      if (giveUp) demoted += 1;
      // The existing numbers are left exactly as they were, and
      // metrics_checked_at is NOT advanced: the date on a number has to be the
      // date that number was read, or it stops meaning anything.
      await admin
        .from("channels")
        .update({
          check_failures: failures,
          ...(giveUp
            ? {
                metrics_source: "declared",
                // A declared row must carry an expiry — the CHECK constraint
                // says so, and a row we can no longer read is exactly the kind
                // that should have to be reconfirmed by a person.
                confirm_by: new Date(Date.now() + 90 * 86_400_000).toISOString(),
              }
            : {}),
        })
        .eq("id", row.id);
      await new Promise((r) => setTimeout(r, PACE_MS));
      continue;
    }

    checked += 1;

    // A group renamed after approval goes back to a human. The entry stops
    // being public in the same statement: the description a moderator approved
    // no longer describes the destination.
    const renamed = metrics.title ? titleChangedMaterially(row.title as string, metrics.title) : false;
    if (renamed) requeued += 1;

    await admin
      .from("channels")
      .update({
        member_count: metrics.memberCount,
        last_post_at: metrics.lastPostAt,
        posts_last_30d: metrics.posts30d,
        metrics_checked_at: now,
        metrics_source: "measured",
        // A successful read clears the counter; three failures in a row means
        // three IN A ROW, not three ever.
        check_failures: 0,
        // Promotion out of 'declared' has to drop the expiry with it, or the
        // channels_declared_expires pair goes inconsistent.
        confirm_by: null,
        ...(renamed
          ? {
              status: "pending_moderation",
              moderation_reason: `نام کانال از «${row.title}» به «${metrics.title}» تغییر کرده — دوباره بررسی شود.`,
            }
          : {}),
      })
      .eq("id", row.id);

    // The irreversible bit. One row per channel per day, idempotent on
    // (channel_id, day) so a second run today overwrites rather than doubles.
    if (typeof metrics.memberCount === "number") {
      const { error } = await admin
        .from("channel_member_snapshots")
        .upsert({ channel_id: row.id as string, day: today, member_count: metrics.memberCount });
      if (!error) snapshots += 1;
    }

    await new Promise((r) => setTimeout(r, PACE_MS));
  }

  return NextResponse.json({
    ok: true,
    considered: rows.length,
    checked,
    failed,
    demoted,
    requeued,
    snapshots,
  });
}
