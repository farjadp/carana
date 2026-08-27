// ============================================================================
// Source: app/how-it-works/page.tsx
// Version: 2.0.0 — 2026-08-27
// Why: Explain the discovery and conversion flow for directory users.
//
//      v2 is a redesign AND a correction. The page was written before the
//      product existed and still said so: its third panel listed «ریویو،
//      ذخیره کسب‌وکار، badgeهای اعتبار و انتشار همزمان در وب و موبایل» as
//      "برای فازهای بعد". All four have shipped — reviews with moderation,
//      saving, the verification badge, and an Android build — so the page was
//      describing the product as less finished than it is. The house rule
//      cuts both ways: a sentence real state does not back is a defect
//      whether it over-claims or under-claims.
// Env / Identity: Static product-explainer page for GOPLAZA.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Phone, Search } from "lucide-react";

import { InnerPage } from "@/components/inner-page";

export const metadata: Metadata = {
  alternates: { canonical: "/how-it-works" },
  title: "چطور کار می‌کند",
  description: "چهار قدم: نیازت را مشخص کن، شهر را فیلتر کن، پروفایل‌ها را مقایسه کن، تماس بگیر.",
};

const STEPS = [
  {
    icon: <Search size={20} />,
    title: "نیازت را مشخص می‌کنی",
    body: "از دسته‌ها یا جست‌وجوی مستقیم، کاربر وارد مسیر خدمات پزشکی، حقوقی، مالی، غذایی یا سایر حوزه‌ها می‌شود.",
  },
  {
    icon: <MapPin size={20} />,
    title: "شهر و محدوده را فیلتر می‌کنی",
    body: "شهر و محله از همان ابتدا مهم‌اند، چون انتخاب بیزینس محلی بدون context کامل نیست.",
  },
  {
    icon: <Building2 size={20} />,
    title: "پروفایل‌ها را مقایسه می‌کنی",
    body: "توضیح خدمات، محدوده سرویس، اعتبار، امتیاز و اطلاعات تماس باید سریع قابل‌فهم باشند.",
  },
  {
    icon: <Phone size={20} />,
    title: "تماس یا ثبت کسب‌وکار انجام می‌شود",
    body: "کاربر یا با بیزینس تماس می‌گیرد یا برند خودش را با حداقل اصطکاک در دایرکتوری ثبت می‌کند.",
  },
];

const AUDIENCES = [
  {
    title: "برای کاربری که دنبال سرویس است",
    body: "جست‌وجوی سریع، فیلترهای معنادار، محتوای فارسی و نشانه‌های اعتماد اهمیت دارند.",
  },
  {
    title: "برای صاحب کسب‌وکار",
    body: "ثبت ساده، دیده‌شدن محلی، معرفی حرفه‌ای و امکان ساخت اعتبار به مرور زمان حیاتی است.",
  },
  {
    // Was "برای فازهای بعد" and listed four things that have all shipped.
    title: "چیزهایی که دیگر «فاز بعد» نیستند",
    body: "ریویو با بازبینی مدیر، ذخیره‌ی کسب‌وکار، نشان احراز مالکیت و اپ اندروید ساخته شده‌اند و همین حالا کار می‌کنند. فهرست کامل — با آنچه هنوز نداریم — در صفحه‌ی امکانات است.",
  },
];

export default function HowItWorksPage() {
  return (
    <InnerPage
      currentPath="/how-it-works"
      currentSection="business"
      hero="wash"
      eyebrow="جریان محصول"
      title="جست‌وجو کن، پیدا کن، ارزیابی کن، تماس بگیر"
      description="در پلازا کاربر نباید در پیچیدگی گم شود. منطق کلی محصول باید به اندازه کافی روشن باشد که هم کسی که دنبال سرویس است و هم صاحب کسب‌وکاری که می‌خواهد دیده شود، سریع از آن استفاده کند."
    >
      {/* The four steps are a sequence, so they are drawn as one — a single
          rail with four stops, not four identical boxes that happen to carry
          numbers. On mobile the rail runs vertically. */}
      <section dir="rtl">
        <ol className="relative grid gap-8 md:grid-cols-4 md:gap-5">
          <span
            className="absolute bottom-2 right-[19px] top-2 w-px bg-[color:var(--line)] md:bottom-auto md:left-[12.5%] md:right-[12.5%] md:top-[19px] md:h-px md:w-auto"
            aria-hidden
          />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4 md:block">
              <span className="relative z-10 inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-[color:var(--lajvard)]">
                {s.icon}
              </span>
              <div className="min-w-0 md:mt-4">
                <div className="text-xs font-black text-[color:var(--lajvard)]">
                  قدم {["۱", "۲", "۳", "۴"][i]}
                </div>
                <h2 className="mt-1 text-[15px] font-black leading-6 text-[color:var(--text)]">{s.title}</h2>
                <p className="mt-1.5 text-[13px] leading-7 text-[color:var(--muted-text)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14" dir="rtl">
        <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">
          همین مسیر، از سه زاویه
        </h2>
        <div className="mt-6 grid gap-x-10 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="border-t border-[color:var(--line)] py-5">
              <h3 className="text-[15px] font-black leading-6 text-[color:var(--text)]">{a.title}</h3>
              <p className="mt-1.5 text-[13px] leading-7 text-[color:var(--muted-text)]">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm" dir="rtl">
        <Link
          href="/features"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--annabi)] px-6 font-black text-[#f6f1e8] transition hover:bg-[#5A1124]"
        >
          دقیقاً چه چیزی می‌گیری <ArrowLeft size={15} />
        </Link>
        <Link
          href="/trust"
          className="inline-flex items-center gap-1.5 font-bold text-[color:var(--text)] underline decoration-[color:var(--line)] decoration-2 underline-offset-8 transition hover:decoration-[color:var(--annabi)]"
        >
          چطور تأیید می‌کنیم <ArrowLeft size={14} className="text-[color:var(--muted-text)]" />
        </Link>
      </section>
    </InnerPage>
  );
}
