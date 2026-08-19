// ============================================================================
// Source: app/pricing/page.tsx
// Version: 2.0.0 — 2026-08-19
// Why: The public price list. Reads lib/billing/plans.ts, so a number here can
//      never disagree with what checkout charges.
//
//      Two sentences on this page exist because of the project's honesty rule
//      and should not be edited away: verification is free and never sold, and
//      a Featured listing is labelled wherever it appears — including in the
//      new default-random listing order (see the FAQ answer about ordering,
//      rewritten 19 Aug when that boost shipped; it used to say payment never
//      affects order, which stopped being true that day).
//
//      v2 (19 Aug): four tiers now, not three. Platinum is capped at
//      PLATINUM_SEAT_CAP nationwide and sells quarterly only, so its card
//      needs a real seat count — this page became a server component to
//      fetch it — and cannot use the shared month/year toggle the way
//      Starter/Premium do.
// Env / Identity: Public. Reads only an aggregate count, no listing data.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, Sparkles } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { PLANS, PLATINUM_SEAT_CAP, INTERVAL_LABEL_FA, intervalsFor, formatCad } from "@/lib/billing/plans";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "تعرفه‌ها",
  description: "ثبت کسب‌وکار و نشان تأیید در گوپلازا همیشه رایگان است. پلن‌های حرفه‌ای، ویژه و پلاتینیوم برای آمار کامل، اعلان‌ها و جایگاه برچسب‌دار.",
  alternates: { canonical: "/pricing" },
};

const order = [PLANS.free, PLANS.pro, PLANS.featured, PLANS.platinum];

export const revalidate = 300;

export default async function PricingPage() {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { count: platinumTaken } = await supabase
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("plan", "platinum")
    .or(`plan_until.is.null,plan_until.gte.${nowIso}`);
  const platinumLeft = Math.max(0, PLATINUM_SEAT_CAP - (platinumTaken ?? 0));

  return (
    <PageShell currentPath="/pricing" currentSection="business">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "تعرفه‌ها", url: "/pricing" }])} />
      <main className="min-h-screen bg-[color:var(--bg)]">
        <section className="mx-auto max-w-6xl px-4 pt-12 text-center md:pt-16">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">تعرفه‌ها</p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">
            ثبت رایگان است. همیشه.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[color:var(--muted-text)] md:text-base">
            پیدا شدن در گوپلازا پول نمی‌خواهد. پلن‌های پولی برای وقتی است که می‌خواهی بدانی پروفایلت چه می‌کند،
            بیشتر درباره‌ی کسب‌وکارت بگویی، یا بالاتر دیده شوی.
          </p>
        </section>

        {/* The two promises */}
        <section className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 px-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <BadgeCheck className="mt-0.5 h-5 w-5 flex-none text-[color:var(--success,#0f7b4f)]" />
            <p className="text-sm leading-7 text-[color:var(--text)]">
              <strong className="font-black">نشان تأیید فروشی نیست.</strong> با اثبات شماره یا ایمیل به دست می‌آید،
              در هر پلنی، حتی رایگان. اگر اعتماد را می‌فروختیم، دیگر معنایی نداشت.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <Sparkles className="mt-0.5 h-5 w-5 flex-none text-[color:var(--gold)]" />
            <p className="text-sm leading-7 text-[color:var(--text)]">
              <strong className="font-black">«ویژه» همیشه برچسب دارد.</strong> آگهی پولی می‌تواند بالای فهرست بیاید
              یا در چیدمان تصادفی شانس بیشتری داشته باشد، ولی همیشه با نشانه‌ی صریح — رتبه‌بندی پنهانی به نفع
              پرداخت‌کننده انجام نمی‌دهیم.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
          {order.map((plan) => {
            const paid = plan.id !== "free";
            const highlight = plan.id === "pro";
            const intervals = intervalsFor(plan.id);
            const isPlatinum = plan.id === "platinum";
            const platinumFull = isPlatinum && platinumLeft === 0;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border bg-white p-6 ${highlight ? "border-[color:var(--annabi)]/40 shadow-[0_20px_50px_rgba(122,24,49,0.10)]" : "border-[color:var(--line)]"}`}
              >
                {highlight ? (
                  <span className="absolute -top-3 right-6 rounded-full bg-[color:var(--annabi)] px-3 py-1 text-[11px] font-black text-[#f6f1e8]">
                    پیشنهاد ما
                  </span>
                ) : null}
                {isPlatinum ? (
                  <span
                    className={`absolute -top-3 right-6 rounded-full px-3 py-1 text-[11px] font-black text-white ${platinumFull ? "bg-[color:var(--muted-text)]" : "bg-[color:var(--gold)] text-[color:var(--text)]"}`}
                  >
                    {platinumFull ? "ظرفیت تکمیل" : `${platinumLeft.toLocaleString("fa-IR")} از ${PLATINUM_SEAT_CAP.toLocaleString("fa-IR")} جای باقی‌مانده`}
                  </span>
                ) : null}

                <h2 className="text-xl font-black text-[color:var(--text)]">{plan.name}</h2>
                <p className="mt-1 min-h-[3rem] text-xs leading-6 text-[color:var(--muted-text)]">{plan.tagline}</p>

                <div className="mt-4 flex items-end gap-2">
                  {paid ? (
                    <>
                      <span className="text-3xl font-black text-[color:var(--text)]">{formatCad(plan.price[intervals[0]]!)}</span>
                      <span className="pb-1 text-xs text-[color:var(--muted-text)]">/ {INTERVAL_LABEL_FA[intervals[0]]}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-black text-[color:var(--text)]">رایگان</span>
                  )}
                </div>

                {paid && !isPlatinum ? (
                  <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                    {intervals.slice(1).map((i) => `${INTERVAL_LABEL_FA[i]} ${formatCad(plan.price[i]!)}`).join(" · ")}
                    {" · "}مالیات هنگام پرداخت اضافه می‌شود
                  </p>
                ) : null}
                {isPlatinum ? (
                  <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                    معادل {formatCad(Math.round(plan.price.quarter! / 3))} در ماه — فقط صورتحساب سه‌ماهه، بدون گزینه‌ی ماهانه یا سالانه.
                    مالیات هنگام پرداخت اضافه می‌شود
                  </p>
                ) : null}
                {!paid ? <p className="mt-1 text-xs text-[color:var(--muted-text)]">بدون کارت، بدون انقضا</p> : null}

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm leading-7 text-[color:var(--text)]">
                      <Check className="mt-1.5 h-3.5 w-3.5 flex-none text-[color:var(--success,#0f7b4f)]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {platinumFull ? (
                  <p className="mt-6 rounded-full border border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-3 text-center text-xs font-bold text-[color:var(--muted-text)]">
                    همه‌ی {PLATINUM_SEAT_CAP.toLocaleString("fa-IR")} جایگاه پر است — تا خالی شدن یکی، خرید ممکن نیست.
                  </p>
                ) : (
                  <Link
                    href={paid ? "/dashboard/business" : "/dashboard/business/new"}
                    className={`mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full font-black transition ${
                      highlight
                        ? "bg-[color:var(--annabi)] text-[#f6f1e8] hover:bg-[#5A1124]"
                        : "border border-[color:var(--line)] bg-white text-[color:var(--text)] hover:border-[color:var(--annabi)]/40"
                    }`}
                  >
                    {paid ? "ارتقا از پنل کسب‌وکار" : "ثبت رایگان کسب‌وکار"} <ArrowLeft size={16} />
                  </Link>
                )}
              </div>
            );
          })}
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="mb-4 text-xl font-black text-[color:var(--text)]">پرسش‌های رایج</h2>
          <div className="divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-white">
            {[
              [
                "اگر پول ندهم، آگهی‌ام پایین‌تر می‌رود؟",
                "نه چیزی که «پایین‌تر» معنا بدهد. ترتیب پیش‌فرض فهرست‌ها اصلاً ثابت نیست — تصادفی است و هر بار که صفحه را باز می‌کنی عوض می‌شود. آگهی‌های ویژه (پریمیوم و پلاتینیوم) در همان چیدمان تصادفی شانس بیشتری برای دیده‌شدن زودتر دارند، ولی همیشه با برچسب «ویژه» — و همچنان تصادفی‌اند، نه تضمینی. آگهی رایگان هیچ‌وقت حذف یا واقعاً ته لیست نمی‌رود.",
              ],
              ["نشان تأیید با پول می‌آید؟", "نه. تنها راهش اثبات شماره یا ایمیل ثبت‌شده است. این تنها سیگنال صادقانه‌ی دایرکتوری است و فروشی نیست."],
              [
                "پلاتینیوم چیست؟",
                `یک لایه‌ی محدود به ${PLATINUM_SEAT_CAP.toLocaleString("fa-IR")} کسب‌وکار در کل کانادا — وقتی پر شد، تا خالی نشدن یک جایگاه نمی‌توانی بخری. فقط با صورتحساب سه‌ماهه. امروز همه‌ی امکانات پریمیوم را دارد؛ فهرست کامل امکانات اختصاصی‌اش به‌زودی نهایی می‌شود.`,
              ],
              ["هر وقت بخواهم می‌توانم لغو کنم؟", "بله. از همان پنل، در پورتال Stripe. تا پایان دوره‌ای که پرداخت کرده‌ای امکانات باقی می‌ماند و بعد به رایگان برمی‌گردد."],
              ["مالیات چطور حساب می‌شود؟", "قیمت‌ها بدون مالیات است. GST/HST بر اساس استان تو هنگام پرداخت محاسبه و روی فاکتور نوشته می‌شود."],
              ["فاکتور رسمی می‌گیرم؟", "بله. هر پرداخت یک فاکتور با شماره دارد که از پنل قابل دانلود است."],
            ].map(([q, a]) => (
              <details key={q} className="group px-5">
                <summary className="cursor-pointer list-none py-4 font-bold text-[color:var(--text)]">{q}</summary>
                <p className="-mt-1 pb-5 text-sm leading-8 text-[color:var(--text)]/80">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
