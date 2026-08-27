// ============================================================================
// Source: app/api/stripe/portal/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: Cancelling, changing card, downloading invoices and switching plan all
//      happen in Stripe's own Customer Portal. Rebuilding that surface would
//      mean rebuilding SCA, dunning and tax receipts badly.
// Env / Identity: Server only. Owner of the listing.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { reportQuietFailure } from "@/lib/observability/report";
import { requireUser } from "@/lib/auth/session";
import { stripe } from "@/lib/stripe/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser("/dashboard/business");

  let body: { businessId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, stripe_customer_id, owner_user_id, created_by")
    .eq("id", String(body.businessId ?? ""))
    .maybeSingle();

  if (!business) return NextResponse.json({ error: "کسب‌وکار پیدا نشد." }, { status: 404 });
  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    return NextResponse.json({ error: "این کسب‌وکار برای شما نیست." }, { status: 403 });
  }
  if (!business.stripe_customer_id) {
    return NextResponse.json({ error: "هنوز اشتراکی برای این کسب‌وکار ثبت نشده است." }, { status: 400 });
  }

  // The portal is where an owner reaches every past invoice, so a failure
  // here is a failure to hand someone their own receipts — it gets written
  // down rather than becoming a 500 nobody sees.
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: business.stripe_customer_id as string,
      return_url: `${env.baseUrl}/dashboard/business/${business.id}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    reportQuietFailure("portal_failed", {
      reason: e instanceof Error ? e.message : String(e),
      business_id: business.id as string,
      customer_id: business.stripe_customer_id as string,
    });
    return NextResponse.json(
      { error: "اتصال به پنل پرداخت ممکن نشد. تیم پشتیبانی در جریان قرار گرفت." },
      { status: 502 }
    );
  }
}
