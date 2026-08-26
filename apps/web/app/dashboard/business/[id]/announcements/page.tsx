// ============================================================================
// Source: app/dashboard/business/[id]/announcements/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Owner-facing announcement manager — post a discount/event/news line
//      to the public profile, within the plan's quota (free 1 / Starter 3 /
//      Premium unlimited per rolling 30 days). The quota shown here is the
//      computed entitlement, not a guess — same rule as billing.
// Env / Identity: Owner or admin. Checked here and again by the server
//      actions that actually write (RLS grants neither direct insert).
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AnnouncementsClient, type AnnouncementRow } from "./announcements-client";

export const metadata: Metadata = { title: "اعلان‌ها" };
export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

/** Module scope: Date.now() inside the component body trips the
 *  react-compiler impure-render lint. */
const windowStartIso = () => new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

export default async function AnnouncementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/business/${id}/announcements`);
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, plan, plan_until, owner_user_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();
  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/dashboard/business");
  }

  const since = windowStartIso();
  const { data: announcements } = await supabase
    .from("business_announcements")
    .select("id, title, body, expires_at, created_at")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const ent = entitlementsFor(business);
  const usedThisWindow = (announcements ?? []).filter((a) => a.created_at >= since).length;

  return (
    <PageShell currentPath={`/dashboard/business/${id}/announcements`} currentSection="business">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard/business" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]">
          <ArrowRight size={14} /> پنل کسب‌وکار
        </Link>
        <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">اعلان‌های «{business.name}»</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-text)]">
          تخفیف، رویداد یا خبر تازه — روی پروفایل عمومی نمایش داده می‌شود. پلن {PLANS[ent.plan].name}:{" "}
          {ent.announcementLimit === null
            ? "بدون محدودیت"
            : `تا ${ent.announcementLimit} اعلان در هر ۳۰ روز (${usedThisWindow} استفاده‌شده)`}
        </p>

        <AnnouncementsClient
          businessId={business.id as string}
          announcements={(announcements ?? []) as AnnouncementRow[]}
          limit={ent.announcementLimit}
          usedThisWindow={usedThisWindow}
          nextPlanName={ent.plan === "free" ? PLANS.pro.name : ent.plan === "pro" ? PLANS.featured.name : null}
        />
      </main>
    </PageShell>
  );
}
