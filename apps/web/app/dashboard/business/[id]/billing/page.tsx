// ============================================================================
// Source: app/dashboard/business/[id]/billing/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: What the owner is on, what it costs, when it renews, and every invoice
//      — plus the two buttons that matter: upgrade, and manage in Stripe.
//
//      The plan shown is the *computed* entitlement, not the stored column, so
//      a lapsed subscription reads as free here exactly as it does in the
//      gates. If those two ever disagree the page is lying, which is the one
//      thing this project will not ship.
// Env / Identity: Owner or admin. Checked here and again by RLS.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS, PLATINUM_SEAT_CAP } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BillingClient, type InvoiceRow, type SubscriptionRow } from "./billing-client";

export const metadata: Metadata = { title: "اشتراک و صورتحساب" };
export const dynamic = "force-dynamic";

export default async function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/business/${id}/billing`);
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan, plan_until, stripe_customer_id, owner_user_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();
  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/dashboard/business");
  }

  const nowIso = new Date().toISOString();
  const [{ data: subs }, { data: invoices }, { count: platinumTaken }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("invoices").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(24),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("plan", "platinum").or(`plan_until.is.null,plan_until.gte.${nowIso}`),
  ]);

  const ent = entitlementsFor(business);
  const platinumSeatsLeft = Math.max(0, PLATINUM_SEAT_CAP - (platinumTaken ?? 0));

  return (
    <PageShell currentPath={`/dashboard/business/${id}/billing`} currentSection="business">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/dashboard/business" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]">
          <ArrowRight size={14} /> پنل کسب‌وکار
        </Link>
        <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">اشتراک «{business.name}»</h1>

        <BillingClient
          businessId={business.id as string}
          planId={ent.plan}
          storedPlan={ent.storedPlan}
          expired={ent.expired}
          until={ent.until}
          hasCustomer={!!business.stripe_customer_id}
          plans={[PLANS.pro, PLANS.featured, PLANS.platinum]}
          platinumSeatsLeft={platinumSeatsLeft}
          subscription={(subs?.[0] ?? null) as SubscriptionRow | null}
          invoices={(invoices ?? []) as InvoiceRow[]}
        />
      </main>
    </PageShell>
  );
}
