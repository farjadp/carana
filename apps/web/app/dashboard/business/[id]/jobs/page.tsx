// ============================================================================
// Source: app/dashboard/business/[id]/jobs/page.tsx
// Version: 1.0.0 — 2026-08-18
// Why: Where an owner posts and manages hiring ads. Free and unlimited for
//      everyone (Farjad, 18 Aug) — so nothing here may present jobs as a paid
//      perk. The only ceiling is a rate limit, and it is shown as one.
// Env / Identity: Owner or admin. Checked here and again in every server
//      action that writes (RLS grants no direct insert).
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { JOB_POSTS_PER_DAY, getVerificationStatus, isTrusted } from "@goplaza/core";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JobsClient, type JobRow } from "./jobs-client";

export const metadata: Metadata = { title: "آگهی‌های استخدام" };
export const dynamic = "force-dynamic";

/** Module scope — see the impure-render lint note in channels/page.tsx. */
const dayAgoMs = () => Date.now() - 24 * 3600_000;

export default async function BusinessJobsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/business/${id}/jobs`);
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, status, city, province, phone, contact_email, owner_user_id, created_by, verification_method, verified_at, verified_until, verified_phone, verified_email")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();

  if (business.owner_user_id !== user.id && business.created_by !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/dashboard/business");
  }

  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, slug, title, employment_type, workplace_type, city, salary_min, salary_max, salary_period, salary_is_public, requires_persian, requires_english, apply_method, apply_value, status, moderation_reason, expires_at, closed_at, published_at, created_at")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Recomputed, not read off a flag: a lapsed badge must not still be shown as
  // buying the fast path. The server action makes the same call independently.
  const trusted = isTrusted(getVerificationStatus(business));

  const since = dayAgoMs();
  const usedToday = (jobs ?? []).filter((j) => new Date(j.created_at).getTime() > since).length;
  const listingIsPublic = business.status === "PUBLISHED" || business.status === "APPROVED";

  return (
    <PageShell currentPath={`/dashboard/business/${id}/jobs`} currentSection="business">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/dashboard/business" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]">
          <ArrowRight size={14} /> پنل کسب‌وکار
        </Link>
        <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">آگهی‌های استخدام «{business.name}»</h1>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted-text)]">
          آگهی استخدام برای همه رایگان است و سقفی ندارد. تنها محدودیت این است که هر کسب‌وکار در هر
          ۲۴ ساعت تا {JOB_POSTS_PER_DAY.toLocaleString("fa-IR")} آگهی می‌تواند ثبت کند
          ({usedToday.toLocaleString("fa-IR")} تا امروز).
        </p>

        {/* Verified publishes directly; everyone else queues. Said plainly
            before the form, not discovered after submitting. */}
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-4 text-sm text-[color:var(--text)]">
          <ShieldCheck size={16} className={`mt-0.5 shrink-0 ${trusted ? "text-emerald-600" : "text-[color:var(--muted-text)]"}`} />
          <span>
            {trusted
              ? "این کسب‌وکار تاییدشده است، پس آگهی‌هایت بدون بررسی و بلافاصله منتشر می‌شوند."
              : "این کسب‌وکار هنوز تاییدشده نیست، پس هر آگهی پیش از انتشار بررسی می‌شود. با تایید کسب‌وکار، آگهی‌ها مستقیم منتشر می‌شوند."}
          </span>
        </div>

        {!listingIsPublic ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            تا وقتی این کسب‌وکار منتشر نشده، آگهی استخدامش جایی برای نمایش ندارد. اول ثبت را کامل کن.
          </div>
        ) : null}

        <JobsClient
          businessId={business.id as string}
          businessCity={(business.city as string) ?? null}
          defaultEmail={(business.contact_email as string) ?? null}
          defaultPhone={(business.phone as string) ?? null}
          canPost={listingIsPublic && usedToday < JOB_POSTS_PER_DAY}
          rateLimited={usedToday >= JOB_POSTS_PER_DAY}
          jobs={(jobs ?? []) as JobRow[]}
        />
      </main>
    </PageShell>
  );
}
