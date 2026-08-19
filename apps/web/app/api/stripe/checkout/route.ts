// ============================================================================
// Source: app/api/stripe/checkout/route.ts
// Version: 2.0.0 — 2026-08-19
// Why: Start a subscription. Creates (or reuses) the Stripe customer for a
//      business and returns a Checkout URL.
//
//      The business id is never taken from the client as a fact: the caller's
//      session must own the listing, checked here before anything is created.
//      The plan and interval decide the price on the server, so a tampered
//      request cannot buy Featured at the Pro price.
//
//      v2: Platinum is capped at PLATINUM_SEAT_CAP nationwide and sells only
//      the "quarter" interval — both are enforced here, not just suggested by
//      the pricing page UI. The seat count is read-then-check, not a
//      database-level lock, so two people finishing checkout in the same
//      instant could theoretically both succeed and overshoot by one seat;
//      that is an accepted, documented race for a 21-seat tier, not something
//      worth a Postgres advisory lock over. The webhook is still what actually
//      grants the plan — this check only stops *starting* a checkout once the
//      count already reads full.
// Env / Identity: Server only. Requires a signed-in owner.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { PAID_PLANS, PLATINUM_SEAT_CAP, intervalsFor, priceIdFor, type BillingInterval, type PlanId } from "@/lib/billing/plans";
import { requireUser } from "@/lib/auth/session";
import { stripe } from "@/lib/stripe/client";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/utils/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser("/dashboard/business");

  const limit = rateLimit(`checkout:${user.id}`, 20, 60 * 60);
  if (!limit.allowed) return NextResponse.json({ error: "درخواست‌های زیادی فرستاده‌اید." }, { status: 429 });

  let body: { businessId?: string; plan?: string; interval?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const plan = String(body.plan ?? "") as PlanId;
  if (!PAID_PLANS.includes(plan)) return NextResponse.json({ error: "پلن نامعتبر است." }, { status: 400 });

  // Each plan only sells some intervals (Platinum: quarter only) — a request
  // for one it doesn't sell is rejected here, not silently coerced to
  // whichever interval happens to have a price id.
  const allowedIntervals = intervalsFor(plan);
  const interval = body.interval as BillingInterval;
  if (!allowedIntervals.includes(interval)) {
    return NextResponse.json({ error: "این دوره‌ی پرداخت برای این پلن وجود ندارد." }, { status: 400 });
  }

  const priceId = priceIdFor(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: "این پلن هنوز در Stripe ساخته نشده است. اسکریپت seed را اجرا کنید." },
      { status: 503 }
    );
  }

  // Ownership: the session must own the listing. Never trust the posted id.
  const supabase = await createSupabaseServerClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan, stripe_customer_id, owner_user_id, created_by")
    .eq("id", String(body.businessId ?? ""))
    .maybeSingle();

  if (!business) return NextResponse.json({ error: "کسب‌وکار پیدا نشد." }, { status: 404 });
  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    return NextResponse.json({ error: "این کسب‌وکار برای شما نیست." }, { status: 403 });
  }

  // Platinum's seat cap. A business already holding Platinum (renewing, or
  // switching interval — though there's only one interval) does not count
  // against its own seat.
  if (plan === "platinum" && business.plan !== "platinum") {
    const nowIso = new Date().toISOString();
    const { count } = await supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("plan", "platinum")
      .or(`plan_until.is.null,plan_until.gte.${nowIso}`);
    if ((count ?? 0) >= PLATINUM_SEAT_CAP) {
      return NextResponse.json({ error: `ظرفیت پلن پلاتینیوم تکمیل شده است (${PLATINUM_SEAT_CAP} از ${PLATINUM_SEAT_CAP}).` }, { status: 409 });
    }
  }

  const s = stripe();
  const admin = createSupabaseAdminClient();

  let customerId = business.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await s.customers.create({
      email: user.email ?? undefined,
      name: business.name as string,
      metadata: { business_id: business.id as string, user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business.id);
  }

  const base = env.baseUrl;
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Canadian sales tax is province-dependent; let Stripe compute it from the
    // address it collects rather than hard-coding a rate that will go stale.
    automatic_tax: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    billing_address_collection: "required",
    allow_promotion_codes: true,
    locale: "auto",
    // Both ids ride on the subscription so the webhook never has to guess.
    subscription_data: { metadata: { business_id: business.id as string, plan, user_id: user.id } },
    metadata: { business_id: business.id as string, plan, user_id: user.id },
    success_url: `${base}/dashboard/business/${business.id}/billing?checkout=success`,
    cancel_url: `${base}/dashboard/business/${business.id}/billing?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
