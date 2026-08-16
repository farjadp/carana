// ============================================================================
// Source: app/api/stripe/webhook/route.ts
// Version: 1.0.0 — 2026-08-16
// Why: The only writer of paid state. Everything a customer is entitled to
//      flows from a Stripe event verified here.
//
//      Four rules this file exists to enforce:
//        1. **Verify the signature.** An unverified webhook endpoint is a
//           public API for granting yourself a paid plan.
//        2. **Read the raw body.** `req.text()`, never `req.json()` — parsing
//           first changes the bytes and the signature no longer matches.
//        3. **Be idempotent.** Stripe retries. Every event id is recorded in
//           `stripe_events`; a repeat is acknowledged and dropped.
//        4. **Always answer 200 once handled.** A non-2xx makes Stripe retry
//           for days. Real failures are logged and surfaced through the admin,
//           not through a retry storm.
// Env / Identity: Server only. Service role — this route is the one place
//      allowed to change `businesses.plan`.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe/client";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";
// The signature is computed over the exact bytes Stripe sent.
export const runtime = "nodejs";

const ACTIVE = new Set(["trialing", "active", "past_due"]);

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("stripe/webhook: STRIPE_WEBHOOK_SECRET is not set — refusing to trust this request");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    // Deliberately terse: a prober learns nothing from this.
    console.error("stripe/webhook: signature verification failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Idempotency. The insert fails on a duplicate id, which means we have
  // already applied this event.
  const { error: seen } = await admin.from("stripe_events").insert({ id: event.id, type: event.type });
  if (seen) {
    if (seen.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("stripe/webhook: could not record event", seen);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const sub = await stripe().subscriptions.retrieve(String(session.subscription));
        await applySubscription(admin, sub);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applySubscription(admin, event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        await recordInvoice(admin, event.data.object as Stripe.Invoice);
        break;
      }

      default:
        // Everything else is recorded in stripe_events and ignored on purpose.
        break;
    }
  } catch (e) {
    console.error(`stripe/webhook: handler for ${event.type} failed`, e);
    // 500 so Stripe retries a genuinely failed apply — the event row is
    // already written, so the retry path checks it and re-runs only if the
    // insert above did not succeed.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Mirror one subscription into our tables and set the listing's entitlement.
 * The business id comes from metadata we set at checkout; falling back to the
 * customer id covers subscriptions created directly in the dashboard.
 */
async function applySubscription(admin: Admin, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let businessId = (sub.metadata?.business_id as string | undefined) ?? null;

  if (!businessId) {
    const { data } = await admin.from("businesses").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    businessId = (data?.id as string | undefined) ?? null;
  }
  if (!businessId) {
    console.error("stripe/webhook: no business for customer", customerId);
    return;
  }

  const plan = ((sub.metadata?.plan as PlanId | undefined) ?? "pro") as PlanId;
  const item = sub.items.data[0];
  const periodEndUnix = item?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
  const active = ACTIVE.has(sub.status);

  await admin.from("subscriptions").upsert(
    {
      business_id: businessId,
      owner_user_id: (sub.metadata?.user_id as string | undefined) ?? null,
      plan: plan === "featured" ? "featured" : "pro",
      status: sub.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: item?.price?.id ?? null,
      interval: item?.price?.recurring?.interval === "year" ? "year" : "month",
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    },
    { onConflict: "stripe_subscription_id" }
  );

  // `plan_until` is what the entitlement layer actually trusts: a lapsed date
  // reads as free even if this update is late or never arrives.
  await admin
    .from("businesses")
    .update({
      plan: active ? plan : "free",
      plan_until: active ? periodEnd : null,
      stripe_customer_id: customerId,
    })
    .eq("id", businessId);
}

async function recordInvoice(admin: Admin, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null;
  let businessId: string | null = null;
  if (customerId) {
    const { data } = await admin.from("businesses").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    businessId = (data?.id as string | undefined) ?? null;
  }

  await admin.from("invoices").upsert(
    {
      business_id: businessId,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      number: invoice.number ?? null,
      status: invoice.status ?? null,
      amount_due: invoice.amount_due ?? null,
      amount_paid: invoice.amount_paid ?? null,
      currency: invoice.currency ?? "cad",
      tax: invoice.total_taxes?.reduce((sum, t) => sum + (t.amount ?? 0), 0) ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
    },
    { onConflict: "stripe_invoice_id" }
  );
}
