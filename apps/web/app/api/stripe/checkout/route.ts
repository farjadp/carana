// ============================================================================
// Source: app/api/stripe/checkout/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: Start a subscription. Creates (or reuses) the Stripe customer for a
//      business and returns a Checkout URL.
//
//      The business id is never taken from the client as a fact: the caller's
//      session must own the listing, checked here before anything is created.
//      The plan and interval decide the price on the server, so a tampered
//      request cannot buy Featured at the Pro price.
// Env / Identity: Server only. Requires a signed-in owner.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { PAID_PLANS, priceIdFor, type BillingInterval, type PlanId } from "@/lib/billing/plans";
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
  const interval = (body.interval === "year" ? "year" : "month") as BillingInterval;
  if (!PAID_PLANS.includes(plan)) return NextResponse.json({ error: "پلن نامعتبر است." }, { status: 400 });

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
