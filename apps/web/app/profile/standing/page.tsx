// ============================================================================
// Source: app/profile/standing/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: «اعتبار مشارکت من» — phase 3. The user's own level, badges, and their
//      LEDGER INCLUDING REVERSALS.
//
//      Showing the reversals is the point, not a concession. "Why did my
//      number go down?" has to be answerable on the page, and a history with
//      the failures edited out is a flattering fiction. It is also the only
//      honest way to display an accuracy figure.
//
//      Gated twice: `standing.enabled` and `standing.public_display`. With
//      either off this route 404s rather than rendering an empty shell,
//      because a page that exists is a claim that the programme does.
// Env / Identity: The signed-in user's OWN standing only. There is no route
//      to anyone else's — a public ranking of neighbours in a community this
//      size was ruled out in docs/16 and this page must not become the back
//      door to one.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, RotateCcw } from "lucide-react";

import { LEVEL_LABELS_FA, ROMAN, privilegesFor } from "@goplaza/core";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { getStandingProfile } from "@/lib/standing/ledger";
import { getStandingSettings } from "@/lib/standing/rules";
import { faNumber as fa } from "@goplaza/core";

export const metadata: Metadata = { title: "اعتبار مشارکت من" };
export const dynamic = "force-dynamic";

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "medium" }) : "—";

const KIND_FA: Record<string, string> = {
  channel_submit: "ثبت کانال",
  business_submit: "ثبت کسب‌وکار",
  business_edit: "اصلاح اطلاعات",
  review_publish: "نظر",
  report_upheld: "گزارش",
  channel_reconfirm: "تأیید دوباره‌ی کانال",
};

const STATE_FA: Record<string, string> = {
  pending: "در انتظار",
  confirmed: "تأیید شد",
  reversed: "بازپس گرفته شد",
  void: "باطل",
};

export default async function MyStandingPage() {
  const settings = await getStandingSettings();
  // Not "render nothing" — 404. A route that answers is a claim that the
  // programme is running.
  if (!settings.enabled || !settings.public_display) notFound();

  const user = await requireUser("/profile/standing");
  const profile = await getStandingProfile(user.id);

  const level = profile?.level ?? 0;
  const agg = profile?.aggregates;
  const priv = privilegesFor(level);

  return (
    <PageShell currentPath="/profile/standing" currentSection="business">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="flex items-center gap-2 text-2xl font-black text-[color:var(--text)]">
          <Award size={22} /> اعتبار مشارکت من
        </h1>
        <p className="mt-2 text-sm text-[color:var(--muted-text)]">
          امتیاز وقتی شمرده می‌شود که مشارکتت تأیید شود — نه وقتی ثبتش می‌کنی.
          اگر بعداً معلوم شود اشتباه بوده، پس گرفته می‌شود.{" "}
          <Link href="/standing" className="underline">
            توضیح کامل
          </Link>
          .
        </p>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { label: "سطح", value: LEVEL_LABELS_FA[level] },
            { label: "امتیاز", value: fa(agg?.xp ?? 0) },
            { label: "تأییدشده", value: fa(agg?.confirmed_count ?? 0) },
            {
              label: "دقت",
              value: agg?.accuracy == null ? "—" : `${fa(Math.round(agg.accuracy * 100))}٪`,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
              <div className="text-xs text-[color:var(--muted-text)]">{s.label}</div>
              <div className="mt-1 text-lg font-black text-[color:var(--text)]">{s.value}</div>
            </div>
          ))}
        </section>

        {/* Highest reached vs held now — one is what you have, the other is
            true about the past and stays true. */}
        {agg && agg.peak_level > level ? (
          <p className="mt-3 text-sm text-[color:var(--muted-text)]">
            بالاترین سطحی که رسیده‌ای: <b>{LEVEL_LABELS_FA[agg.peak_level as 0 | 1 | 2 | 3]}</b> — سطح
            فعلی پایین‌تر است چون مدتی مشارکت تأییدشده‌ای نداشته‌ای.
          </p>
        ) : null}

        {priv.autoPublishLowRisk || priv.queuePriority ? (
          <section className="mt-6 rounded-xl border border-[color:var(--line)] p-4">
            <h2 className="text-sm font-black text-[color:var(--text)]">این سطح چه چیزی باز می‌کند</h2>
            <ul className="mt-2 space-y-1 text-sm text-[color:var(--text)]">
              {priv.queuePriority && <li>· پیشنهادهایت زودتر از بقیه بررسی می‌شوند</li>}
              {priv.autoPublishLowRisk && <li>· اصلاح ساعت کاری و وضعیت شلوغی مستقیم منتشر می‌شود</li>}
              {priv.canSeeQueue && <li>· دسترسی خواندنی به صف بررسی</li>}
            </ul>
          </section>
        ) : null}

        {profile && profile.badges.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-black text-[color:var(--text)]">نشان‌ها</h2>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((b) => (
                <span
                  key={b.key}
                  title={b.nextAt ? `${fa(b.nextAt)} تا برای پله‌ی بعد` : "بالاترین پله"}
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line)] px-3 py-1 text-sm"
                >
                  <span>{b.emoji}</span>
                  <b>{b.labelFa}</b>
                  <span className="text-xs text-[color:var(--muted-text)]" dir="ltr">
                    {ROMAN[b.tier]}
                  </span>
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-black text-[color:var(--text)]">
            <RotateCcw size={15} /> دفترچه‌ی مشارکت
          </h2>
          <p className="mb-3 text-xs text-[color:var(--muted-text)]">
            شامل مواردی که پس گرفته شده‌اند — تاریخچه‌ای که شکست‌هایش حذف شده
            باشد، تاریخچه نیست.
          </p>
          {!profile || profile.events.length === 0 ? (
            <p className="text-sm text-[color:var(--muted-text)]">هنوز مشارکتی ثبت نشده.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[color:var(--line)]">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="text-right text-xs text-[color:var(--muted-text)]">
                    <th className="p-2 font-normal">نوع</th>
                    <th className="p-2 font-normal">وضعیت</th>
                    <th className="p-2 font-normal">امتیاز</th>
                    <th className="p-2 font-normal">تاریخ</th>
                    <th className="p-2 font-normal">توضیح</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.events.map((e) => (
                    <tr key={e.id} className="border-t border-[color:var(--line)]">
                      <td className="p-2">{KIND_FA[e.kind] ?? e.kind}</td>
                      <td className={`p-2 ${e.state === "reversed" ? "font-bold text-red-600" : ""}`}>
                        {STATE_FA[e.state] ?? e.state}
                      </td>
                      <td className="p-2" dir="ltr">
                        {e.state === "confirmed" ? fa(e.points) : "—"}
                      </td>
                      <td className="p-2 text-[color:var(--muted-text)]">
                        {date(e.settled_at ?? e.created_at)}
                      </td>
                      <td className="p-2 max-w-[220px] truncate text-[color:var(--muted-text)]">
                        {e.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}
