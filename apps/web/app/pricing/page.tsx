// ============================================================================
// Source: app/pricing/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The public price list. Reads lib/billing/plans.ts, so a number here can
//      never disagree with what checkout charges.
//
//      Two sentences on this page exist because of the project's honesty rule
//      and should not be edited away: verification is free and never sold, and
//      a Featured listing is labelled wherever it appears.
// Env / Identity: Public, static.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Check, Sparkles } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { PLANS, formatCad } from "@/lib/billing/plans";
import { breadcrumbLd } from "@/lib/seo/local";

export const metadata: Metadata = {
  title: "تعرفه‌ها",
  description: "ثبت کسب‌وکار و نشان تأیید در گوپلازا همیشه رایگان است. پلن‌های حرفه‌ای و ویژه برای آمار کامل، اعلان‌ها و جایگاه برچسب‌دار.",
  alternates: { canonical: "/pricing" },
};

const order = [PLANS.free, PLANS.pro, PLANS.featured];

export default function PricingPage() {
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
              <strong className="font-black">«ویژه» همیشه برچسب دارد.</strong> آگهی پولی می‌تواند بالای فهرست بیاید،
              ولی با نشانه‌ی صریح — رتبه‌بندی پنهانی به نفع پرداخت‌کننده انجام نمی‌دهیم.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-12 md:grid-cols-3">
          {order.map((plan) => {
            const paid = plan.price.month !== null;
            const highlight = plan.id === "pro";
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
                <h2 className="text-xl font-black text-[color:var(--text)]">{plan.name}</h2>
                <p className="mt-1 min-h-[3rem] text-xs leading-6 text-[color:var(--muted-text)]">{plan.tagline}</p>

                <div className="mt-4 flex items-end gap-2">
                  {paid ? (
                    <>
                      <span className="text-3xl font-black text-[color:var(--text)]">{formatCad(plan.price.month!)}</span>
                      <span className="pb-1 text-xs text-[color:var(--muted-text)]">/ ماه</span>
                    </>
                  ) : (
                    <span className="text-3xl font-black text-[color:var(--text)]">رایگان</span>
                  )}
                </div>
                {paid ? (
                  <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                    سالانه {formatCad(plan.price.year!)} — دو ماه رایگان · مالیات هنگام پرداخت اضافه می‌شود
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-[color:var(--muted-text)]">بدون کارت، بدون انقضا</p>
                )}

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm leading-7 text-[color:var(--text)]">
                      <Check className="mt-1.5 h-3.5 w-3.5 flex-none text-[color:var(--success,#0f7b4f)]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

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
              </div>
            );
          })}
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16">
          <h2 className="mb-4 text-xl font-black text-[color:var(--text)]">پرسش‌های رایج</h2>
          <div className="divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-white">
            {[
              ["اگر پول ندهم، آگهی‌ام پایین‌تر می‌رود؟", "نه. ترتیب پیش‌فرض فهرست‌ها بر اساس تأییدشدن و تازگی است، نه پرداخت. آگهی ویژه بالای فهرست می‌آید ولی برچسب دارد و جای بقیه را حذف نمی‌کند."],
              ["نشان تأیید با پول می‌آید؟", "نه. تنها راهش اثبات شماره یا ایمیل ثبت‌شده است. این تنها سیگنال صادقانه‌ی دایرکتوری است و فروشی نیست."],
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
