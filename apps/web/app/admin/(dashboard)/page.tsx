// ============================================================================
// Source: app/admin/(dashboard)/page.tsx
// Version: 2.0.0 — 2026-11-13
// Why: v1 showed three counts and a link to categories. Farjad: «خیلی ساکته».
//      v2 is the live picture: listings, users, money, every moderation queue,
//      the blog pipeline, typed searches and AI calls — each number from
//      lib/admin/dashboard-stats.ts, re-read every 60 seconds.
//
//      Honesty rules specific to this page:
//      · A section whose query failed says «خواندن ناموفق» with the error. It
//        never shows 0.
//      · MRR comes from Stripe subscription rows only. Paid plans that no
//        subscription backs are shown as "granted", not as revenue.
//      · Traffic (Vercel Analytics, Search Console) is absent on purpose: no
//        credential for either is readable from server code today.
// Env / Identity: Server component, admin/moderator only (requireAdmin on top
//      of the layout's own check). Dynamic: every load reads production.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CircleDollarSign,
  Inbox,
  Newspaper,
  Search,
  Users,
} from "lucide-react";
import { faNumber as fa, formatCad, PLANS, type PlanId } from "@goplaza/core";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getDashboardStats, type Section } from "@/lib/admin/dashboard-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AutoRefresh } from "./_dashboard/auto-refresh";
import { TrendChart } from "./_dashboard/trend-chart";

// The root layout's title template appends the brand already.
export const metadata: Metadata = { title: "داشبورد ادمین" };
export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("fa-IR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  });

/** Whole dollars in Persian digits; the label carries the currency, so the figure fits a narrow column. */
const dollars = (cents: number) => fa(Math.round(cents / 100));

const planName = (key: string) =>
  key === "link_pro" ? "GPLZ Link Pro" : (PLANS[key as PlanId]?.name ?? key);

// ---------------------------------------------------------------------------
// Building blocks — flat panels, no card inside a card.
// ---------------------------------------------------------------------------

function Panel({
  title,
  icon,
  href,
  hrefLabel,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // A div, not <section>: globals.css gives every section a 72px bottom
    // margin, and unlayered CSS beats Tailwind's layered m-0.
    <div role="region" aria-label={title} className={`flex flex-col gap-4 rounded-2xl border border-(--line) bg-white p-5 ${className}`}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-base font-extrabold text-(--text)">
          <span className="text-(--lajvard)">{icon}</span>
          {title}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-(--lajvard) hover:underline">
            {hrefLabel ?? "همه"}
            <ArrowLeft size={13} />
          </Link>
        )}
      </header>
      {children}
    </div>
  );
}

function Failed({ s }: { s: { ok: false; error: string } }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-lg bg-[#fbeff1] p-3 text-sm text-(--annabi)">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>
        خواندن ناموفق — این بخش عددی نشان نمی‌دهد تا عدد غلط نشان ندهد.
        <code className="mt-1 block text-xs opacity-80" dir="ltr">{s.error.slice(0, 200)}</code>
      </span>
    </p>
  );
}

function Load<T>({ s, children }: { s: Section<T>; children: (d: T) => ReactNode }) {
  return s.ok ? <>{children(s.data)}</> : <Failed s={s} />;
}

/** A figure with its label; `sub` is a muted second line. */
function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: "warn" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-semibold text-(--muted-text)">{label}</span>
      <span className={`whitespace-nowrap text-2xl font-extrabold leading-tight ${tone === "warn" ? "text-(--annabi)" : "text-(--text)"}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-(--muted-text)">{sub}</span>}
    </div>
  );
}

function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">{children}</div>;
}

/** Thin two-part bar: claimed vs the rest. SVG so the width is an attribute, not an inline style. */
function SplitBar({ a, b, aLabel, bLabel }: { a: number; b: number; aLabel: string; bLabel: string }) {
  const total = a + b;
  const pct = total ? (a / total) * 100 : 0;
  // A non-zero share stays visible even when it rounds to nothing at this width.
  const drawn = a > 0 ? Math.max(pct, 1) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full" role="img" aria-label={`${aLabel} ${fa(a)}، ${bLabel} ${fa(b)}`}>
        <rect x={0} y={0} width={100} height={8} rx={4} fill="var(--line)" />
        {drawn > 0 && <rect x={100 - drawn} y={0} width={drawn} height={8} rx={Math.min(4, drawn / 2)} fill="var(--lajvard)" />}
      </svg>
      <div className="flex justify-between text-xs text-(--muted-text)">
        <span>
          <i className="me-1 inline-block size-2 rounded-full bg-(--lajvard) align-middle" />
          {aLabel}: <b className="text-(--text)">{fa(a)}</b> ({fa(Math.round(pct * 10) / 10)}٪)
        </span>
        <span>
          {bLabel}: <b className="text-(--text)">{fa(b)}</b>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  try {
    await requireAdmin(await createSupabaseServerClient());
  } catch {
    redirect("/admin/login");
  }

  const s = await getDashboardStats();

  const queueTotal = s.queues.ok
    ? s.queues.data.claims + s.queues.data.reviews + s.queues.data.reports + s.queues.data.jobs + s.queues.data.channels + s.queues.data.suggestions + s.queues.data.blogReview
    : 0;

  const queues = s.queues.ok
    ? [
        { label: "درخواست مالکیت", n: s.queues.data.claims, href: "/admin/claims" },
        { label: "نظرهای در انتظار", n: s.queues.data.reviews, href: "/admin/reviews" },
        { label: "گزارش تخلف", n: s.queues.data.reports, href: "/admin/reports", danger: true },
        { label: "آگهی استخدام", n: s.queues.data.jobs, href: "/admin/jobs" },
        { label: "کانال و گروه", n: s.queues.data.channels, href: "/admin/channels" },
        { label: "پیشنهاد کاربران", n: s.queues.data.suggestions, href: "/admin/suggestions" },
        { label: "مقاله برای بازبینی", n: s.queues.data.blogReview, href: "/admin/blog" },
      ]
    : [];

  const linkPro = s.revenue.ok ? (s.revenue.data.subsByPlan.find((x) => x.key === "link_pro")?.n ?? 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-(--muted-text)">همهٔ عددها مستقیم از پایگاه دادهٔ تولید خوانده می‌شوند.</p>
        <AutoRefresh generatedAt={s.generatedAt} />
      </div>

      {/* KPI row: the four numbers the page leads with. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Building2 size={18} />} label="کسب‌وکارهای منتشرشده" s={s.businesses} value={(d) => fa(d.listed)} sub={(d) => `${fa(d.new7d)} افزوده در ۷ روز`} />
        <Kpi icon={<Users size={18} />} label="کاربران" s={s.users} value={(d) => fa(d.total)} sub={(d) => `${fa(d.d7)} ثبت‌نام در ۷ روز · ${fa(d.today)} امروز`} />
        <Kpi icon={<CircleDollarSign size={18} />} label="درآمد ماهانهٔ تکرارشونده" s={s.revenue} value={(d) => formatCad(d.mrrCents)} sub={(d) => `${fa(d.activeSubs)} اشتراک فعال Stripe`} />
        <Kpi
          icon={<Inbox size={18} />}
          label="در انتظار تصمیم شما"
          s={s.queues}
          value={() => fa(queueTotal)}
          sub={(d) => (d.errors24h > 0 ? `${fa(d.errors24h)} خطای سیستمی در ۲۴ ساعت` : "بدون خطای سیستمی در ۲۴ ساعت")}
          warn={(d) => d.errors24h > 0}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Businesses */}
        <Panel title="کسب‌وکارها" icon={<Building2 size={18} />} href="/admin/listings" hrefLabel="مدیریت" className="xl:col-span-2">
          <Load s={s.businesses}>
            {(d) => (
              <>
                <StatRow>
                  <Stat label="منتشرشده" value={fa(d.listed)} />
                  <Stat label="پیش‌نویس" value={fa(d.drafts)} />
                  <Stat label="افزوده در ۷ روز" value={fa(d.new7d)} />
                  <Stat label="افزوده در ۳۰ روز" value={fa(d.new30d)} />
                </StatRow>
                <SplitBar a={d.claimed} b={d.unclaimed} aLabel="مالک ثبت‌شده" bLabel="بدون مالک" />
                <TrendChart title="کسب‌وکارهای افزوده‌شده" unit="کسب‌وکار" points={d.trend} />
              </>
            )}
          </Load>
        </Panel>

        {/* Queues */}
        <Panel title="صف‌های بررسی" icon={<Inbox size={18} />}>
          <Load s={s.queues}>
            {(d) => (
              <ul className="m-0 flex list-none flex-col p-0">
                {queues.map((q) => (
                  <li key={q.href} className="border-b border-(--line) last:border-0">
                    <Link href={q.href} className="flex items-center justify-between py-2.5 text-sm text-(--text) hover:text-(--lajvard)">
                      <span>{q.label}</span>
                      <span
                        className={`min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-extrabold ${
                          q.n === 0 ? "text-(--muted-text)" : q.danger ? "bg-(--annabi) text-white" : "bg-(--lajvard) text-white"
                        }`}
                      >
                        {fa(q.n)}
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/admin/health" className="flex items-center justify-between py-2.5 text-sm text-(--text) hover:text-(--lajvard)">
                    <span>خطاهای سیستمی (۲۴ ساعت)</span>
                    <span className={`min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-extrabold ${d.errors24h ? "bg-(--annabi) text-white" : "text-(--muted-text)"}`}>
                      {fa(d.errors24h)}
                    </span>
                  </Link>
                </li>
              </ul>
            )}
          </Load>
        </Panel>

        {/* Users */}
        <Panel title="کاربران" icon={<Users size={18} />} href="/admin/users" hrefLabel="مدیریت">
          <Load s={s.users}>
            {(d) => (
              <>
                <StatRow>
                  <Stat label="امروز" value={fa(d.today)} />
                  <Stat label="۷ روز" value={fa(d.d7)} />
                  <Stat label="۳۰ روز" value={fa(d.d30)} />
                  <Stat label="فعال" value={fa(d.active30)} sub="ورود در ۳۰ روز" />
                </StatRow>
                <TrendChart title="ثبت‌نام روزانه" unit="ثبت‌نام" points={d.trend} />
              </>
            )}
          </Load>
        </Panel>

        {/* Revenue */}
        <Panel title="درآمد" icon={<CircleDollarSign size={18} />}>
          <Load s={s.revenue}>
            {(d) => (
              <>
                <StatRow>
                  <Stat label="MRR (دلار کانادا)" value={dollars(d.mrrCents)} sub="از اشتراک‌های Stripe" />
                  <Stat label="دریافتی این ماه (دلار)" value={dollars(d.paidThisMonthCents)} sub="فاکتورهای پرداخت‌شده" />
                  <Stat label="اشتراک جدید" value={fa(d.newThisMonth)} sub="این ماه" />
                  <Stat label="لغو شده" value={fa(d.cancelledThisMonth)} sub="این ماه" />
                </StatRow>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-semibold text-(--muted-text)">پلن‌های فعال روی کسب‌وکارها</span>
                  {d.entitledByPlan.map((p) => {
                    const subs = d.subsByPlan.find((x) => x.key === p.plan)?.n ?? 0;
                    return (
                      <div key={p.plan} className="flex justify-between border-b border-(--line) py-1.5 last:border-0">
                        <span>{planName(p.plan)}</span>
                        <span className="text-(--muted-text)">
                          <b className="text-(--text)">{fa(p.n)}</b> فعال · {fa(subs)} با اشتراک Stripe
                        </span>
                      </div>
                    );
                  })}
                  {linkPro > 0 && (
                    <div className="flex justify-between py-1.5">
                      <span>GPLZ Link Pro</span>
                      <b>{fa(linkPro)}</b>
                    </div>
                  )}
                </div>
                {d.entitledWithoutSub > 0 && (
                  <p className="m-0 rounded-lg bg-[#f7f3ea] p-3 text-xs leading-6 text-(--text)">
                    {fa(d.entitledWithoutSub)} کسب‌وکار پلن پولی فعال دارند بدون اشتراک Stripe پشتش — یعنی دستی اعطا شده‌اند و در MRR شمرده نمی‌شوند.
                  </p>
                )}
              </>
            )}
          </Load>
        </Panel>

        {/* Search */}
        <Panel title="جست‌وجوها" icon={<Search size={18} />}>
          <Load s={s.search}>
            {(d) => (
              <>
                <StatRow>
                  <Stat label="جست‌وجوی تایپ‌شده" value={fa(d.typed30d)} sub="۳۰ روز" />
                  <Stat
                    label="بی‌نتیجه"
                    value={fa(d.zeroResult30d)}
                    sub={d.typed30d ? `${fa(Math.round((d.zeroResult30d / d.typed30d) * 100))}٪ از کل` : undefined}
                    tone={d.typed30d && d.zeroResult30d / d.typed30d > 0.3 ? "warn" : undefined}
                  />
                </StatRow>
                <TrendChart title="جست‌وجوی روزانه" unit="جست‌وجو" points={d.trend} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-(--muted-text)">پرتکرارترین‌ها (۳۰ روز، فقط تایپ‌شده)</span>
                  {d.top === null ? (
                    <span className="text-xs text-(--annabi)">تابع top_searches در دسترس نبود.</span>
                  ) : d.top.length === 0 ? (
                    <span className="text-xs text-(--muted-text)">در ۳۰ روز گذشته جست‌وجوی تایپ‌شده‌ای ثبت نشده.</span>
                  ) : (
                    <ol className="m-0 flex list-none flex-col p-0 text-sm">
                      {d.top.map((t, i) => (
                        <li key={t.term} className="flex justify-between border-b border-(--line) py-1 last:border-0">
                          <span>
                            <span className="me-2 text-xs text-(--muted-text)">{fa(i + 1)}</span>
                            <Link href={`/search?q=${encodeURIComponent(t.term)}`} className="hover:text-(--lajvard)" prefetch={false}>
                              {t.term}
                            </Link>
                          </span>
                          <b>{fa(t.hits)}</b>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            )}
          </Load>
        </Panel>

        {/* Content */}
        <Panel title="وبلاگ و تلگرام" icon={<Newspaper size={18} />} href="/admin/blog" hrefLabel="میز وبلاگ" className="xl:col-span-2">
          <Load s={s.content}>
            {(d) => (
              <>
                <StatRow>
                  <Stat label="منتشرشده در ۷ روز" value={fa(d.published7d)} sub="برنامه: ۳ در هفته" />
                  <Stat label="۳۰ روز" value={fa(d.published30d)} />
                  <Stat label="کل مقاله‌ها" value={fa(d.publishedTotal)} />
                  <Stat label="پست تلگرام در ۷ روز" value={fa(d.snippetsSent7d)} sub={d.snippetsFailed ? `${fa(d.snippetsFailed)} ناموفق از ابتدا` : undefined} />
                </StatRow>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="flex flex-col gap-1 border-s-2 border-(--lajvard) ps-3">
                    <span className="text-xs font-semibold text-(--muted-text)">آخرین اجرای خودکار</span>
                    {d.lastRun ? (
                      <>
                        <span>
                          {when(d.lastRun.startedAt)} — {fa(d.lastRun.created ?? 0)} از {fa(d.lastRun.requested ?? 0)} مقاله
                          {d.lastRun.finishedAt ? "" : " (هنوز تمام نشده)"}
                        </span>
                        {d.lastRun.notes && <span className="text-xs text-(--muted-text)" dir="auto">{d.lastRun.notes}</span>}
                      </>
                    ) : (
                      <span className="text-(--muted-text)">هیچ اجرایی ثبت نشده.</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 border-s-2 border-(--annabi) ps-3">
                    <span className="text-xs font-semibold text-(--muted-text)">آخرین اجرای ناموفق (از ۶۰ اجرای اخیر)</span>
                    {d.lastFailedRun ? (
                      <>
                        <span>
                          {when(d.lastFailedRun.startedAt)} — {fa(d.lastFailedRun.created ?? 0)} از {fa(d.lastFailedRun.requested ?? 0)} مقاله
                        </span>
                        {d.lastFailedRun.error && (
                          <code className="text-xs text-(--annabi)" dir="ltr">{d.lastFailedRun.error}</code>
                        )}
                      </>
                    ) : (
                      <span className="text-(--muted-text)">در ۶۰ اجرای اخیر خطایی ثبت نشده.</span>
                    )}
                  </div>
                </div>
                {d.lastSnippetError && (
                  <p className="m-0 text-xs text-(--muted-text)">
                    آخرین خطای تلگرام: <code dir="ltr">{d.lastSnippetError.slice(0, 160)}</code>
                  </p>
                )}
              </>
            )}
          </Load>
        </Panel>

        {/* AI */}
        <Panel title="مصرف هوش مصنوعی" icon={<Bot size={18} />}>
          <Load s={s.ai}>
            {(d) => (
              <>
                <Stat label="درخواست‌های این ماه" value={fa(d.callsThisMonth)} />
                {d.byFeature.length > 0 && (
                  <ul className="m-0 flex list-none flex-col p-0 text-sm">
                    {d.byFeature.map((f) => (
                      <li key={f.feature} className="flex justify-between border-b border-(--line) py-1 last:border-0">
                        <span dir="ltr">{f.feature}</span>
                        <b>{fa(f.n)}</b>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="m-0 text-xs leading-6 text-(--muted-text)">
                  شمارش درخواست از جدول ai_usage، نه هزینهٔ دلاری: توکن در این جدول ثبت نمی‌شود و فراخوانی‌های خط تولید وبلاگ هم اینجا نیستند.
                </p>
              </>
            )}
          </Load>
        </Panel>
      </div>
    </div>
  );
}

function Kpi<T>({
  icon,
  label,
  s,
  value,
  sub,
  warn,
}: {
  icon: ReactNode;
  label: string;
  s: Section<T>;
  value: (d: T) => string;
  sub: (d: T) => string;
  warn?: (d: T) => boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-(--line) bg-white p-5">
      <span className="flex items-center justify-between text-xs font-semibold text-(--muted-text)">
        {label}
        <span className="text-(--lajvard)">{icon}</span>
      </span>
      {s.ok ? (
        <>
          <span className="text-3xl font-extrabold leading-tight text-(--text)">{value(s.data)}</span>
          <span className={`text-xs ${warn?.(s.data) ? "font-bold text-(--annabi)" : "text-(--muted-text)"}`}>{sub(s.data)}</span>
        </>
      ) : (
        <span className="text-sm font-bold text-(--annabi)">خواندن ناموفق</span>
      )}
    </div>
  );
}
