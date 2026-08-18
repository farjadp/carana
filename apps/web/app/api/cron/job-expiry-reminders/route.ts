// ============================================================================
// Source: app/api/cron/job-expiry-reminders/route.ts
// Version: 1.0.0 — 2026-08-18
// Why: Expiry is what keeps the board honest — an ad disappears the moment it
//      lapses, with no cron needed to make that true. But it means an owner
//      still hiring loses their ad silently, on a date they picked weeks ago
//      and have no reason to remember. This is the nudge, three days out.
//
//      Deliberately one reminder, not a series. The stakes are lower than a
//      lapsing verification badge, and this sender also delivers verification
//      codes, so teaching anyone to filter it is expensive.
//
// Env / Identity: Public URL, so it authenticates. Vercel Cron sends
//      `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set the route
//      refuses rather than defaulting to open — an unauthenticated endpoint
//      that emails people is a spam relay with extra steps. Same shape as
//      verification-reminders, deliberately.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { JOB_EXPIRY_REMINDER_DAYS } from "@charana/core";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { jobExpiringEmail } from "@/lib/email/templates";
import { reportQuietFailure, withCronRun } from "@/lib/observability/report";

export const dynamic = "force-dynamic";

/** Safety valve: a bug that selects every row must not mail the whole table. */
const MAX_PER_RUN = 200;

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
  return withCronRun("job-expiry-reminders", async () => {
    const summary = await run();
    return { result: NextResponse.json(summary), summary };
  });
}

async function run() {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const horizon = new Date(now.getTime() + JOB_EXPIRY_REMINDER_DAYS * 86_400_000);

  // Live ads whose expiry falls inside the window and that have not been told.
  // `expiry_reminder_sent_at is null` is the whole idempotency story: extend()
  // clears it, so an extended ad becomes eligible again on its own.
  const { data: jobs, error } = await admin
    .from("job_posts")
    .select("id, slug, title, business_id, created_by, expires_at, businesses(id, name, created_by, owner_user_id, contact_email)")
    .eq("status", "published")
    .is("closed_at", null)
    .is("expiry_reminder_sent_at", null)
    .gt("expires_at", now.toISOString())
    .lte("expires_at", horizon.toISOString())
    .order("expires_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) throw new Error(`job expiry scan failed: ${error.message}`);

  const summary = { scanned: jobs?.length ?? 0, sent: 0, skipped: 0, failed: 0 };

  for (const job of jobs ?? []) {
    const business = job.businesses as unknown as {
      id: string; name: string; created_by: string | null; owner_user_id: string | null; contact_email: string | null;
    } | null;
    if (!business) { summary.skipped += 1; continue; }

    // The account that posted it, falling back to the owner, falling back to
    // the listing's public address. Whoever gets this has to be able to sign
    // in and act on it.
    const recipientId = job.created_by ?? business.owner_user_id ?? business.created_by;
    let to: string | null = null;
    if (recipientId) {
      const { data: profile } = await admin.from("profiles").select("email").eq("id", recipientId).maybeSingle();
      to = (profile?.email as string) ?? null;
    }
    to = to ?? business.contact_email;
    if (!to) {
      reportQuietFailure("job_reminder_no_address", { jobId: job.id });
      summary.failed += 1;
      continue;
    }

    // The number that makes the mail worth opening, and it has to be real:
    // counted from business_events, and omitted from the mail entirely when
    // it is zero rather than rendered as «۰ نفر».
    const { count: applyClicks } = await admin
      .from("business_events")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("event_type", "job_apply");

    const daysRemaining = Math.max(
      1,
      Math.ceil((new Date(job.expires_at).getTime() - now.getTime()) / 86_400_000)
    );

    const result = await sendEmail({
      to,
      ...jobExpiringEmail({
        businessName: business.name,
        jobTitle: job.title as string,
        jobSlug: job.slug as string,
        businessId: business.id,
        daysRemaining,
        applyClicks: applyClicks ?? null,
      }),
    });

    if (!result.sent) {
      // Not marked as sent. A silent failure that records itself as done is
      // the worst outcome: the owner is never told and never will be.
      reportQuietFailure("job_reminder_send_failed", { jobId: job.id, reason: result.error });
      summary.failed += 1;
      continue;
    }

    await admin.from("job_posts").update({ expiry_reminder_sent_at: now.toISOString() }).eq("id", job.id);
    summary.sent += 1;
  }

  console.log("Job expiry reminders:", summary);
  return summary;
}
