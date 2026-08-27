// ============================================================================
// Source: app/trust/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: Explain trust, moderation, and verification principles for the
//      directory.
//
//      v2 is a redesign AND a correction, and this page needed the correction
//      more than any other. It was written before the mechanisms existed and
//      still described them in the future tense: verification «باید به مرور
//      اضافه شود», reporting as something «کاربر باید بتواند», and the badge
//      and reviews filed under «فازهای بعد». All of it ships today, and
//      /features links here as «چطور تأیید می‌کنیم» — so the one page a
//      visitor opens to ask "can I trust this" was telling them the trust
//      machinery had not been built.
//
//      Every claim below is checked against code, not memory:
//      verification (lib/verification/actions.ts, six-month window, voided by
//      a contact change, refused by plans.ts as a paid feature), reporting
//      (components/business/report-dialog.tsx → business_reports →
//      /admin/reports), reviews (pending_moderation → published, owner reply,
//      server-side caps), and the «ویژه» label on every paid placement.
// Env / Identity: Static trust-and-safety page for GOPLAZA.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Flag, MessageSquare, Sparkles } from "lucide-react";

import { InnerPage } from "@/components/inner-page";

export const metadata: Metadata = {
  alternates: { canonical: "/trust" },
  title: "اعتماد و امنیت",
  description:
    "نشان تأیید چه چیزی را ثابت می‌کند، چطور می‌شود یک آگهی را گزارش کرد، نظرها چطور بررسی می‌شوند، و چه چیزی را نمی‌فروشیم.",
};

/** Each of these describes a mechanism that exists, in the present tense. */
const MECHANISMS = [
  {
    icon: <BadgeCheck size={20} />,
    title: "نشان تأیید، و دقیقاً چه چیزی را ثابت می‌کند",
    body: "یعنی صاحب کسب‌وکار شماره یا ایمیلِ منتشرشده‌ی همان آگهی را با کد اثبات کرده — نه اینکه ما کیفیت کارش را تأیید کرده باشیم. شش ماه اعتبار دارد و بعد باید دوباره اثبات شود. اگر شماره یا ایمیل عوض شود نشان خودبه‌خود برداشته می‌شود، چون تأیید یک راه تماس را ثابت می‌کند نه یک ردیف را.",
  },
  {
    icon: <Flag size={20} />,
    title: "گزارش تخلف، روی هر آگهی",
    body: "روی هر پروفایل دکمه‌ی گزارش هست: اطلاعات غلط، تعطیل‌شده، تکراری، جعل هویت یا محتوای نامناسب. گزارش وارد صف مدیریت می‌شود، وضعیت می‌گیرد و بسته می‌شود — به یک صندوق بی‌صاحب نمی‌رود.",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "نظرها پیش از انتشار خوانده می‌شوند",
    body: "هر نظر اول به صف بررسی می‌رود و بعد منتشر می‌شود؛ نتیجه — با دلیل — به نویسنده‌اش ایمیل می‌شود. صاحب کسب‌وکار می‌تواند زیرش پاسخ عمومی بگذارد. سقف‌ها سمت سرور اعمال می‌شوند: پنج نظر در ۲۴ ساعت، و کسی نمی‌تواند برای کسب‌وکار خودش نظر بنویسد.",
  },
  {
    icon: <Sparkles size={20} />,
    title: "شفافیت در اطلاعات",
    body: "حوزه خدمات، شهر، نحوه تماس، ساعات کاری و محدوده سرویس نباید مبهم یا پنهان باشند. «الان باز است» هم از ساعت کاری اعلام‌شده محاسبه می‌شود، نه برچسبی که کسی دستی گذاشته باشد.",
  },
];

/** The two rules that constrain the business model itself. */
const REFUSALS = [
  {
    title: "نشان تأیید فروشی نیست",
    body: "در هیچ پلنی — حتی گران‌ترینشان — نمی‌شود خریدش. اگر اعتماد را می‌فروختیم دیگر معنایی نداشت.",
  },
  {
    title: "جایگاه پولی همیشه برچسب دارد",
    body: "آگهی ویژه بالای فهرست می‌آید، ولی همیشه با نشان «ویژه». رتبه‌بندی پنهانی به نفع پرداخت‌کننده انجام نمی‌دهیم.",
  },
];

export default function TrustPage() {
  return (
    <InnerPage
      currentPath="/trust"
      currentSection="business"
      hero="wash"
      eyebrow="اعتماد و امنیت"
      title="اعتماد باید در خود معرفی کسب‌وکارها دیده شود"
      description="کاربر وقتی دنبال یک وکیل، پزشک، حسابدار یا رستوران می‌گردد، پیش از هر چیز می‌پرسد: «می‌توانم به این کسب‌وکار و این پلتفرم اعتماد کنم؟» این صفحه سازوکارهایی را می‌نویسد که همین حالا پشت آن جواب هستند."
    >
      <section dir="rtl">
        <div className="grid gap-x-10 md:grid-cols-2">
          {MECHANISMS.map((m) => (
            <div key={m.title} className="flex items-start gap-4 border-t border-[color:var(--line)] py-6">
              <span className="mt-0.5 inline-flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)]">
                {m.icon}
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-black leading-6 text-[color:var(--text)]">{m.title}</h2>
                <p className="mt-1.5 text-[13px] leading-8 text-[color:var(--muted-text)]">{m.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The refusals are the strongest thing this page has to say, so they
          are the loudest thing on it. */}
      <section className="mt-14" dir="rtl">
        <div className="relative overflow-hidden rounded-[28px] bg-[#14213d] p-7 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_10%_0%,rgba(122,24,49,0.55)_0%,transparent_55%)]" aria-hidden />
          <div className="relative">
            <h2 className="text-xl font-black text-[#f6f1e8] md:text-2xl">دو چیزی که نمی‌فروشیم</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {REFUSALS.map((r) => (
                <div key={r.title} className="border-t border-white/15 pt-5">
                  <strong className="block font-black text-[#f6f1e8]">{r.title}</strong>
                  <p className="mt-1.5 text-sm leading-8 text-[#f6f1e8]/80">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14" dir="rtl">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">و آنچه هنوز نداریم</h2>
        <p className="mt-2 max-w-2xl text-sm leading-8 text-[color:var(--muted-text)]">
          هر چیزی که ساخته نشده، در صفحه‌ی امکانات فهرست شده — نه پنهان‌شده تا بقیه‌ی فهرست
          بهتر خوانده شود. لحن محصول هم بخشی از همین است: وقتی متن اغراق نمی‌کند، اعتماد
          راحت‌تر ساخته می‌شود.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link
            href="/features"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-6 font-black text-[#f6f1e8] transition hover:bg-[#5A1124]"
          >
            فهرست کامل امکانات <ArrowLeft size={15} />
          </Link>
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 font-bold text-[color:var(--text)] underline decoration-[color:var(--line)] decoration-2 underline-offset-8 transition hover:decoration-[color:var(--annabi)]"
          >
            چطور کار می‌کند <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
          </Link>
        </div>
      </section>
    </InnerPage>
  );
}
