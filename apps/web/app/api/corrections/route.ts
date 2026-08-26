// ============================================================================
// Source: app/api/corrections/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: Someone who does not own a listing proposes a value for one of its
//      fields. Standing phase 2: a معتمد's proposal on a LOW_RISK field goes
//      live at once; everything else queues.
//
//      The response says WHICH of those happened and why, because "did my
//      correction do anything?" is the question this endpoint exists to
//      answer, and a bare 200 does not answer it.
// Env / Identity: Any signed-in user. The owner is refused — they have their
//      own edit page, which is a different (and less restricted) flow.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { CORRECTABLE_FIELDS, isCorrectable } from "@goplaza/core";

import { applyCorrection, canAutoPublish, recordCorrectionEvent } from "@/lib/corrections/apply";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const Shape = z.object({
  businessId: z.string().uuid(),
  field: z.string().min(1).max(64),
  // Any JSON: working_hours is an object, phone is a string.
  proposed: z.unknown(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });

  const parsed = Shape.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  const { businessId, field, proposed, note } = parsed.data;

  // The allow-list is the boundary. Anything outside it — name, category,
  // city, address, ownership — is an identity claim, and a stranger may not
  // propose one at all, however the request is shaped.
  if (!isCorrectable(field)) {
    return NextResponse.json(
      { error: `این فیلد قابل اصلاح از بیرون نیست. فیلدهای مجاز: ${CORRECTABLE_FIELDS.join(", ")}` },
      { status: 400 }
    );
  }
  if (proposed === undefined || proposed === null || proposed === "") {
    return NextResponse.json({ error: "مقدار پیشنهادی خالی است." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  // select("*") rather than a template-literal column list: interpolating the
  // field name defeats supabase-js's type parser AND would put user input into
  // the column list. `field` is already allow-listed above, but keeping it out
  // of the query string entirely is the version that stays safe if that check
  // is ever moved.
  const { data: row } = await admin
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "کسب‌وکار پیدا نشد." }, { status: 404 });
  const business = row as Record<string, unknown>;

  // The owner has an edit page. Sending them through the stranger flow would
  // let them bypass their own change-review tiers, which are stricter.
  if (business.owner_user_id === user.id || business.created_by === user.id) {
    return NextResponse.json(
      { error: "این کسب‌وکار برای خودت است — از صفحه‌ی ویرایش استفاده کن." },
      { status: 409 }
    );
  }

  const previous = business[field] ?? null;

  const { data: created, error } = await admin
    .from("business_corrections")
    .insert({
      business_id: businessId,
      user_id: user.id,
      field,
      proposed: proposed as never,
      previous: previous as never,
      note: note ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "یک پیشنهاد باز برای همین فیلد داری." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "ثبت پیشنهاد ناموفق بود." }, { status: 500 });
  }

  // Ledger first, so the event exists whether or not the auto-publish path
  // fires — a queued correction is still a contribution, it just has not
  // settled yet.
  await recordCorrectionEvent(user.id, created.id);

  const auto = await canAutoPublish(user.id, field);
  if (auto.ok) {
    const applied = await applyCorrection(admin, created.id, null, { directly: true });
    if (applied.ok) {
      return NextResponse.json({ ok: true, applied: true, id: created.id });
    }
    // Falling back to the queue is the right failure: the proposal is saved,
    // a human will look, and nothing was silently lost.
    console.error("corrections: auto-publish failed, left pending", applied.error);
    return NextResponse.json({ ok: true, applied: false, queued: true, id: created.id });
  }

  return NextResponse.json({ ok: true, applied: false, queued: true, why: auto.why, id: created.id });
}
