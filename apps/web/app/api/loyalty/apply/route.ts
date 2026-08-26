// ============================================================================
// Source: app/api/loyalty/apply/route.ts
// Version: 1.0.0 — 2026-08-26
// Why: The other half of «تخفیف تمدید». Checkout can only discount a NEW
//      subscription; an existing one renews inside Stripe and never passes
//      through checkout again, so the earned discount has to be put onto the
//      live subscription itself.
//
//      OWNER-TRIGGERED, NOT A CRON. A nightly job silently mutating other
//      people's subscription prices is a lot of unattended authority over real
//      money for a benefit nobody is waiting on by the minute. The owner asks,
//      the server recomputes tenure from invoices — never trusting anything
//      the client sent — and applies exactly what they have earned.
// Env / Identity: The listing's owner, or an admin. Re-derives entitlement
//      server-side; the button is a convenience, not the gate.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { syncSubscriptionDiscount } from "@/lib/loyalty/coupon";
import { loyaltyStatusFor } from "@/lib/loyalty/status";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { businessId?: string };
  const businessId = String(body.businessId ?? "");
  if (!businessId) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_user_id, created_by")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) return NextResponse.json({ error: "کسب‌وکار پیدا نشد." }, { status: 404 });

  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "این کسب‌وکار برای شما نیست." }, { status: 403 });
    }
  }

  const loyalty = await loyaltyStatusFor(supabase, businessId);
  if (!loyalty.enabled) {
    return NextResponse.json({ error: "برنامه‌ی وفاداری فعال نیست." }, { status: 409 });
  }
  if (!loyalty.tier) {
    return NextResponse.json(
      { error: "هنوز به اولین پله‌ی وفاداری نرسیده‌ای." },
      { status: 409 }
    );
  }

  // The live subscription. Only a subscription Stripe still bills can carry a
  // renewal discount; a canceled one has no renewal to discount.
  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("business_id", businessId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "اشتراک فعالی برای اعمال تخفیف پیدا نشد." },
      { status: 409 }
    );
  }

  try {
    const result = await syncSubscriptionDiscount(sub.stripe_subscription_id, loyalty.tier);
    return NextResponse.json({
      ok: true,
      percentOff: result.applied,
      changed: result.changed,
      tenureMonths: loyalty.tenure.months,
    });
  } catch (e) {
    console.error("loyalty/apply:", e);
    return NextResponse.json({ error: "اعمال تخفیف در Stripe ناموفق بود." }, { status: 502 });
  }
}
