// ============================================================================
// Source: app/dashboard/business/[id]/link/page.tsx
// Version: 1.0.0 — 2026-08-25
// Why: The button that was missing. `createLinkPageForBusiness` has existed
//      and been tested since 39df58f, and nothing called it — so the whole
//      link-in-bio feature was unreachable by the people it is for.
//
//      It shows what is actually on the page rather than promising a page
//      exists. The mirrored items are listed by name, resolved the same way
//      the public renderer resolves them, so an owner whose listing has no
//      Google Maps link sees that there is no directions button — instead of
//      discovering it later on their own printed QR code.
//
// Env / Identity: Owner or admin, checked here and again by every server
//      action that writes. Same shape as the announcements page.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { hasLinkPro, linkLimitsFor } from "@goplaza/core";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LinkPageClient, type LinkItemRow } from "./link-client";

export const metadata: Metadata = { title: "صفحه‌ی لینک" };
export const dynamic = "force-dynamic";

/** The columns the public renderer reads, so "will this item appear?" is
 *  answered here with the same information rather than a guess. */
const BUSINESS_COLUMNS = `
  id, name, slug, status, plan, plan_until, link_pro_until, owner_user_id, created_by,
  phone, whatsapp, telegram, instagram, website, contact_email,
  google_maps_url, working_hours, booking_url, gallery_urls
`;

export default async function LinkPageSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/business/${id}/link`);
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase.from("businesses").select(BUSINESS_COLUMNS).eq("id", id).maybeSingle();
  if (!business) notFound();

  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/dashboard/business");
  }

  const { data: page } = await supabase
    .from("link_pages")
    .select("id, handle, title, status, footer_hidden")
    .eq("business_id", id)
    .limit(1)
    .maybeSingle();

  const { data: items } = page
    ? await supabase
        .from("link_items")
        .select("id, kind, label_fa, enabled, position")
        .eq("page_id", page.id)
        .order("position", { ascending: true })
    : { data: null };

  const pro = hasLinkPro(business);
  const limits = linkLimitsFor(business);

  // A page attached to a business is only public while the business itself is
  // published — that is the RLS policy, not a UI nicety. Saying so here is the
  // difference between "your page is live" and a live page nobody can open.
  const businessPublic = business.status === "APPROVED" || business.status === "PUBLISHED";

  return (
    <PageShell currentPath={`/dashboard/business/${id}/link`} currentSection="business">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/dashboard/business"
          className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]"
        >
          <ArrowRight size={14} /> پنل کسب‌وکار
        </Link>
        <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">صفحه‌ی لینک «{business.name}»</h1>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted-text)]">
          یک صفحه با همه‌ی راه‌های تماس، برای گذاشتن در بیوی اینستاگرام. از همین اطلاعاتی که همین حالا ثبت کرده‌ای
          ساخته می‌شود — چیزی برای پر کردن نیست.
        </p>

        <LinkPageClient
          businessId={business.id as string}
          businessPublic={businessPublic}
          page={page as { id: string; handle: string; title: string; status: string; footer_hidden: boolean } | null}
          items={(items ?? []) as LinkItemRow[]}
          pro={pro}
          customLinkLimit={limits.customLinks}
        />
      </main>
    </PageShell>
  );
}
