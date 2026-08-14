// ============================================================================
// Source: app/api/cron/verification-reminders/route.ts
// Version: 1.0.0 — 2026-08-25
// Why: The six-month rule was visible but silent. Without this, the only way an
//      owner learns their verification lapsed is by opening a dashboard page
//      they had no reason to open — so the rule would mostly express itself as
//      badges quietly going grey, which punishes the owner for our timer.
// Env / Identity: Public URL, so it authenticates. Vercel Cron sends
//      `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set the route
//      refuses to run rather than defaulting to open — an unauthenticated
//      endpoint that emails users is a spam relay with extra steps.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { verificationRenewalEmail } from "@/lib/email/templates";
import {
  getVerificationStatus,
  reminderIsDue,
  reminderStageFor,
} from "@/lib/verification/status";
import { reportQuietFailure, withCronRun } from "@/lib/observability/report";

// Reminders are per-listing state, never cached.
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
    // Deliberately terse. A detailed error here tells a prober what to fix.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Every run is recorded, success included. A failed run writes a row saying
  // so; a run that silently stops happening writes nothing at all, so the
  // signal is the absence of recent rows — which only works if the happy path
  // is recorded too.
  return withCronRun("verification-reminders", async () => {
    const summary = await run();
    return { result: NextResponse.json(summary), summary };
  });
}

async function run() {
  const admin = createSupabaseAdminClient();

  // Everything inside the widest reminder window, plus anything already past
  // its expiry that has not been told yet. The stage filter is applied in
  // code, because "which bucket did we last send" is a comparison the query
  // language would only make less readable.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);

  const { data: businesses, error } = await admin
    .from("businesses")
    .select(
      "id, name, slug, phone, contact_email, owner_user_id, verification_method, verified_at, verified_until, verified_phone, verified_email, verification_reminder_stage"
    )
    .not("verified_until", "is", null)
    .not("owner_user_id", "is", null)
    .lte("verified_until", horizon.toISOString())
    .order("verified_until", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    throw new Error(`reminder scan failed: ${error.message}`);
  }

  const summary = { scanned: businesses?.length ?? 0, sent: 0, skipped: 0, failed: 0 };

  for (const business of businesses ?? []) {
    const status = getVerificationStatus(business);

    // A listing whose contact details changed is not "expiring" — it is
    // already unverified, and the banner in the dashboard says so. Mailing it
    // a renewal countdown would be describing a deadline that no longer runs.
    if (status.daysRemaining === null || status.state === "superseded") {
      summary.skipped += 1;
      continue;
    }

    const stage = reminderStageFor(status.daysRemaining);
    if (!reminderIsDue(stage, business.verification_reminder_stage)) {
      summary.skipped += 1;
      continue;
    }

    // The account email, not the listing's public contact address: the
    // reminder is for whoever can actually log in and renew.
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", business.owner_user_id)
      .maybeSingle();

    const to = profile?.email ?? business.contact_email;
    if (!to) {
      console.error(`No address to remind for business ${business.id}`);
      summary.failed += 1;
      continue;
    }

    const mail = verificationRenewalEmail({
      name: business.name,
      daysRemaining: status.daysRemaining,
      stage,
    });

    const result = await sendEmail({ to, ...mail });

    if (!result.sent) {
      // Do not record the stage. A silent failure that marks itself done is
      // the worst outcome — the owner is never told and never will be.
      reportQuietFailure("reminder_send_failed", {
        businessId: business.id,
        stage,
        reason: result.error,
      });
      summary.failed += 1;
      continue;
    }

    await admin
      .from("businesses")
      .update({
        verification_reminder_stage: stage,
        verification_reminder_sent_at: new Date().toISOString(),
      })
      .eq("id", business.id);

    summary.sent += 1;
  }

  console.log("Verification reminders:", summary);
  return summary;
}
