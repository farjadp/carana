// ============================================================================
// Source: scripts/seed-stripe-plans.mts
// Version: 2.0.0 — 2026-08-19
// Why: Create the products and prices in Stripe from packages/core/src/plans.ts,
//      so the catalogue is defined in code and can be recreated in a fresh
//      account (test today, live later) without dashboard clicking.
//
//      Idempotent: products are looked up by a stable metadata key, and a
//      price is only created when no active price with the same
//      amount/interval/currency exists. Stripe prices are immutable, so
//      changing a number here creates a new price and leaves existing
//      subscriptions on the old one — which is what you want.
//
//      v2 (19 Aug): stopped hand-typing a second, drifting copy of the plan
//      catalogue in this file — it still said "GOPLAZA Pro"/"Featured" at
//      the old $19/$49 prices after plans.ts moved to $21/$34/Platinum. Now
//      reads PLANS/PAID_PLANS/intervalsFor directly, so a price changed in
//      one place is the price this script creates in the other. Also
//      handles the two intervals plans.ts added — "2year" (year × 2) and
//      "quarter" (month × 3) — which Stripe represents as
//      {interval, interval_count}, not a fifth interval value.
//
// Usage:
//   set -a; . apps/web/.env.local; set +a
//   npx tsx scripts/seed-stripe-plans.mts            # prints the env lines
//   npx tsx scripts/seed-stripe-plans.mts --write    # also appends them
// ============================================================================
import { appendFileSync } from "node:fs";
import Stripe from "stripe";

import { PAID_PLANS, PLANS, intervalsFor, type BillingInterval } from "../packages/core/src/plans.ts";

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("STRIPE_SECRET_KEY is not set. Source apps/web/.env.local first.");
  process.exit(1);
}
if (KEY.startsWith("sk_live_")) {
  console.error("Refusing to run against a LIVE key. Seed in test mode, then create the same products in live deliberately.");
  process.exit(1);
}

const stripe = new Stripe(KEY, { apiVersion: "2026-07-29.dahlia" });

/** Stripe has no "2year" or "quarter" interval — it's interval + interval_count. */
const STRIPE_RECURRING: Record<BillingInterval, { interval: "month" | "year"; interval_count: number }> = {
  month: { interval: "month", interval_count: 1 },
  year: { interval: "year", interval_count: 1 },
  "2year": { interval: "year", interval_count: 2 },
  quarter: { interval: "month", interval_count: 3 },
};

const CURRENCY = "cad";
const lines: string[] = [];

for (const planId of PAID_PLANS) {
  const plan = PLANS[planId];

  const search = await stripe.products.search({ query: `metadata['charana_plan']:'${plan.id}'` });
  let product = search.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: `GOPLAZA ${plan.nameEn}`,
      description: plan.tagline,
      metadata: { charana_plan: plan.id },
      tax_code: "txcd_10103000", // SaaS — business use
    });
    console.log(`created product ${plan.id} → ${product.id}`);
  } else {
    console.log(`product ${plan.id} exists → ${product.id}`);
  }

  const existing = await stripe.prices.list({ product: product.id, active: true, limit: 100 });

  for (const interval of intervalsFor(plan.id)) {
    const amount = plan.price[interval];
    if (amount === null) continue; // exhaustiveness guard; intervalsFor already filters these out
    const recurring = STRIPE_RECURRING[interval];

    let price = existing.data.find(
      (p) =>
        p.recurring?.interval === recurring.interval &&
        p.recurring?.interval_count === recurring.interval_count &&
        p.unit_amount === amount &&
        p.currency === CURRENCY
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: CURRENCY,
        unit_amount: amount,
        recurring,
        // Prices are tax-exclusive: Canadian GST/HST is added at checkout
        // based on the customer's province.
        tax_behavior: "exclusive",
        metadata: { charana_plan: plan.id, charana_interval: interval },
      });
      console.log(`  created ${interval} price ${(amount / 100).toFixed(2)} ${CURRENCY.toUpperCase()} → ${price.id}`);
    } else {
      console.log(`  ${interval} price exists → ${price.id}`);
    }
    lines.push(`STRIPE_PRICE_${plan.id.toUpperCase()}_${interval.toUpperCase()}=${price.id}`);
  }
}

console.log("\n# Add these to apps/web/.env.local and to Vercel:\n" + lines.join("\n"));

if (process.argv.includes("--write")) {
  appendFileSync("apps/web/.env.local", `\n# Stripe price ids (test mode), generated ${new Date().toISOString().slice(0, 10)}\n${lines.join("\n")}\n`);
  console.log("\nAppended to apps/web/.env.local");
}
