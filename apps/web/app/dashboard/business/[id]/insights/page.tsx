// ============================================================================
// Source: app/dashboard/business/[id]/insights/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: What the listing actually did for the owner: profile views, and the
//      taps that mean intent — call, WhatsApp, directions, website, booking.
//      Reads `business_events`, which the profile writes.
//
//      Two honesty rules built in: a number is never shown for a window the
//      data does not cover (events started on 16 Aug 2026), and a zero is
//      shown as a zero, never hidden or smoothed.
// Env / Identity: Owner or admin only — checked here, and again by RLS.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Eye, Globe, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = { title: "آمار کسب‌وکار" };
export const dynamic = "force-dynamic";


/** The day event recording began. Nothing before this exists to report. */
const EVENTS_SINCE = new Date("2026-08-16T00:00:00Z");

const KINDS = [
  { key: "view", label: "بازدید پروفایل", icon: Eye, tone: "text-[color:var(--text)]" },
  { key: "call", label: "تماس تلفنی", icon: Phone, tone: "text-[color:var(--annabi)]" },
  { key: "whatsapp", label: "واتساپ", icon: MessageCircle, tone: "text-emerald-600" },
  { key: "directions", label: "مسیریابی", icon: MapPin, tone: "text-[color:var(--lajvard)]" },
  { key: "website", label: "وب‌سایت", icon: Globe, tone: "text-[color:var(--lajvard)]" },
  { key: "booking", label: "رزرو نوبت", icon: CalendarDays, tone: "text-[color:var(--lajvard)]" },
] as const;

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> };

export default async function InsightsPage({ params, searchParams }: Params) {
  const { id } = await params;
  const requestedDays = Math.min(90, Math.max(7, parseInt((await searchParams).days ?? "30", 10) || 30));
  const user = await requireUser(`/dashboard/business/${id}/insights`);
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, city, status, created_by, owner_user_id, view_count, plan, plan_until")
    .eq("id", id)
    .maybeSingle();
  if (!business) notFound();
  if (business.created_by !== user.id && business.owner_user_id !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && profile?.role !== "moderator") redirect("/dashboard/business");
  }

  // The window is an entitlement, enforced here rather than by hiding a
  // button: a free plan asking for ?days=90 gets 30 days and is told why.
  const ent = entitlementsFor(business);
  const maxDays = ent.has("insights_full") ? 90 : 30;
  const days = Math.min(requestedDays, maxDays);
  const capped = requestedDays > maxDays;

  // One clock reading for the whole render: reading the clock twice mid-render
  // can straddle a midnight boundary and shift the window under itself. The
  // page is force-dynamic, so a per-request timestamp is the intent.
  const now = new Date().getTime();
  const { data: summary } = await supabase.rpc("business_event_summary", { p_business_id: id, p_days: days });
  const rows = (summary ?? []) as { day: string; event_type: string; n: number }[];

  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.event_type, (totals.get(r.event_type) ?? 0) + Number(r.n));
  const contactTotal = ["call", "whatsapp", "directions", "website", "booking"].reduce((s, k) => s + (totals.get(k) ?? 0), 0);
  const views = totals.get("view") ?? 0;
  const rate = views > 0 ? Math.round((contactTotal / views) * 100) : null;

  // Daily series for the bar chart — every day in the window, including zeros.
  const byDay = new Map<string, { views: number; actions: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 864e5).toISOString().slice(0, 10);
    byDay.set(d, { views: 0, actions: 0 });
  }
  for (const r of rows) {
    const slot = byDay.get(r.day);
    if (!slot) continue;
    if (r.event_type === "view") slot.views += Number(r.n);
    else slot.actions += Number(r.n);
  }
  const series = [...byDay.entries()];
  const peak = Math.max(1, ...series.map(([, v]) => v.views + v.actions));
  const windowStart = new Date(now - (days - 1) * 864e5);
  const partial = windowStart < EVENTS_SINCE;

  return (
    <PageShell currentPath={`/dashboard/business/${id}/insights`} currentSection="business">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Link href="/dashboard/business" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]"><ArrowRight size={14} /> پنل کسب‌وکار</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[color:var(--text)] md:text-3xl">آمار «{business.name}»</h1>
            <p className="mt-1 text-sm text-[color:var(--muted-text)]">{fa(days)} روز گذشته{business.city ? ` · ${business.city}` : ""}</p>
          </div>
          <nav className="flex gap-1.5 text-sm">
            {[7, 30, 90].filter((d) => d <= maxDays).map((d) => (
              <Link key={d} href={`?days=${d}`} className={`rounded-full px-3 py-1.5 font-bold ${d === days ? "bg-[color:var(--text)] text-[#f6f1e8]" : "border border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>{fa(d)} روز</Link>
            ))}
          </nav>
        </div>

        {capped ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[color:var(--annabi)]/8 px-4 py-2.5 text-xs leading-6 text-[color:var(--text)]">
            بازه‌ی بلندتر از {fa(maxDays)} روز و تفکیک هر اقدام در پلن حرفه‌ای است.
            <Link href={`/dashboard/business/${id}/billing`} className="font-bold text-[color:var(--annabi)] underline-offset-4 hover:underline">دیدن پلن‌ها</Link>
          </p>
        ) : null}

        {partial ? (
          <p className="mt-4 rounded-xl bg-[color:var(--gold)]/15 px-4 py-2.5 text-xs leading-6 text-[color:var(--text)]">
            ثبت رویدادها از ۲۵ مرداد ۱۴۰۵ (۱۶ اوت ۲۰۲۶) شروع شده است؛ روزهای قبل از آن داده ندارند، نه اینکه صفر بوده‌اند.
          </p>
        ) : null}

        {/* Totals */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {KINDS.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.key} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[color:var(--muted-text)]"><Icon size={14} className={k.tone} /> {k.label}</div>
                <div className="text-2xl font-black text-[color:var(--text)]">{fa(totals.get(k.key) ?? 0)}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[color:var(--lajvard)] p-4 text-white">
            <div className="text-xs font-bold text-white/80">مجموع تماس‌ها و اقدام‌ها</div>
            <div className="text-2xl font-black">{fa(contactTotal)}</div>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <div className="text-xs font-bold text-[color:var(--muted-text)]">از هر ۱۰۰ بازدید، چند نفر اقدام کردند</div>
            <div className="text-2xl font-black text-[color:var(--text)]">{rate === null ? "—" : `${fa(rate)}٪`}</div>
          </div>
        </div>

        {/* Daily bars */}
        <section className="mt-8 rounded-3xl border border-[color:var(--line)] bg-white p-5">
          <h2 className="mb-4 font-black text-[color:var(--text)]">روزبه‌روز</h2>
          {contactTotal + views === 0 ? (
            <p className="py-8 text-center text-sm text-[color:var(--muted-text)]">هنوز رویدادی ثبت نشده است. به‌محض اینکه کسی پروفایل را ببیند یا دکمه‌ای بزند، این‌جا ظاهر می‌شود.</p>
          ) : (
            <>
              <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="نمودار روزانه‌ی بازدید و اقدام">
                {series.map(([day, v]) => (
                  <div key={day} className="group relative flex-1" title={`${day}: ${v.views} بازدید، ${v.actions} اقدام`}>
                    <div className="flex h-40 w-full flex-col justify-end gap-[2px]">
                      <div className="w-full rounded-t-sm bg-[color:var(--annabi)]" style={{ height: `${(v.actions / peak) * 100}%` }} />
                      <div className="w-full rounded-t-sm bg-[color:var(--lajvard)]/25" style={{ height: `${(v.views / peak) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-[color:var(--muted-text)]">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--lajvard)]/25" /> بازدید</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[color:var(--annabi)]" /> اقدام (تماس، واتساپ، مسیر، سایت، رزرو)</span>
              </div>
            </>
          )}
        </section>

        <p className="mt-6 text-xs leading-6 text-[color:var(--muted-text)]">
          پلازا هویت بازدیدکننده را ذخیره نمی‌کند. برای اینکه یک نفر در یک روز چند بار شمرده نشود، از یک اثر رمزنگاری‌شده استفاده می‌شود که هر روز عوض می‌شود و به هیچ شخصی برنمی‌گردد.
        </p>
      </main>
    </PageShell>
  );
}
