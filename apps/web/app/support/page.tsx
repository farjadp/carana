// ============================================================================
// Source: app/support/page.tsx
// Version: 3.0.0 — 2026-08-15
// Why: Support that answers before you have to ask. Required for the App
//      Store listing (a reachable support URL) and useful on its own. v3:
//      brand layout, quick-action tiles, grouped FAQ that reflects how the
//      product actually works today (verification window, website import,
//      the mobile app), and one honest response-time promise.
// Env / Identity: Static page, public information only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { SuggestionBox } from "@/components/suggestion-box";
import { ArrowLeft, BadgeCheck, KeyRound, LifeBuoy, Mail, Store, UserRoundX } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  alternates: { canonical: "/support" },
  title: "پشتیبانی",
  description: `پرسش‌های پرتکرار و راه‌های تماس با پشتیبانی ${company.brandFa}.`,
};

const QUICK = [
  { icon: Store, title: "ثبت کسب‌وکار", href: "/dashboard/business/new" },
  { icon: BadgeCheck, title: "احراز مالکیت", href: "/claim" },
  { icon: KeyRound, title: "بازیابی رمز", href: "/auth/forgot-password" },
  { icon: UserRoundX, title: "حذف حساب", href: "/account/delete" },
];

type Faq = { q: string; a: React.ReactNode };
const GROUPS: { title: string; items: Faq[] }[] = [
  {
    title: "برای صاحبان کسب‌وکار",
    items: [
      { q: "چطور کسب‌وکارم را ثبت کنم؟", a: <>یک حساب بسازید، ایمیل و موبایل را تایید کنید و از <Link href="/dashboard/business/new">فرم ثبت</Link> شروع کنید. اگر وب‌سایت دارید، آدرسش را بدهید — نام، توضیحات، راه‌های تماس، خدمات و ساعات کاری را از آن می‌خوانیم و شما فقط مرور و تایید می‌کنید. پس از ارسال، لیستینگ بررسی و معمولاً ظرف ۲ تا ۵ روز کاری منتشر می‌شود.</> },
      { q: "«مالکیت احرازشده» یعنی چه و چطور می‌گیرمش؟", a: <>یعنی صاحب کسب‌وکار ثابت کرده این پروفایل مال اوست: یا هنگام ثبت (با تایید ایمیل و موبایل)، یا بعداً از <Link href="/claim">صفحه‌ی احراز مالکیت</Link> با کد پیامکی به شماره‌ای که روی پروفایل است. نشان ۶ ماه اعتبار دارد و ۳۰ روز قبل از پایان، برای تمدید ایمیل می‌فرستیم. اگر شماره‌ی تلفن پروفایل عوض شود، نشان تا احراز دوباره برداشته می‌شود.</> },
      { q: "کسب‌وکارم بدون اجازه‌ی من در سایت هست.", a: <>بخشی از لیستینگ‌های اولیه از منابع عمومی گردآوری شده‌اند. برای در اختیار گرفتنش از <Link href="/claim">احراز مالکیت</Link> استفاده کنید؛ برای اصلاح یا حذف کامل به <a href={`mailto:${company.email.support}`}>{company.email.support}</a> بنویسید و نام کسب‌وکار را ذکر کنید.</> },
      { q: "اطلاعات لیستینگم اشتباه است.", a: <>اگر مالک آن هستید، از داشبورد ویرایشش کنید. تغییرات جزئی بلافاصله اعمال می‌شوند؛ تغییر نام، دسته‌بندی یا شهر پیش از انتشار بررسی می‌شود.</> },
      { q: "چرا لیستینگم هنوز منتشر نشده؟", a: <>هر لیستینگ پیش از انتشار بررسی می‌شود. اگر بیش از ۵ روز کاری طول کشید، به پشتیبانی بنویسید و نام کسب‌وکار را ذکر کنید.</> },
      { q: "نظری درباره‌ی کسب‌وکارم ثبت شده که نادرست است.", a: <>به <a href={`mailto:${company.email.support}`}>{company.email.support}</a> گزارش دهید. نظرها پیش از انتشار بررسی می‌شوند و موارد خلاف واقع یا توهین‌آمیز حذف می‌شوند.</> },
    ],
  },
  {
    title: "برای کاربران",
    items: [
      { q: "گوپلازا رایگان است؟", a: <>بله — هم برای جستجو و استفاده، هم برای ثبت کسب‌وکار. گوپلازا واسطه‌ی هیچ معامله‌ای نیست و کمیسیونی نمی‌گیرد.</> },
      { q: "«ذخیره» و «یادداشت خصوصی» چیست؟", a: <>با حساب کاربری می‌توانید هر کسب‌وکاری را ذخیره کنید و برای خودتان یادداشت بگذارید («رفتم، خوب بود»، «قیمت گرفتم»). یادداشت خصوصی را فقط خودتان می‌بینید؛ نظر عمومی جداست و پس از بررسی منتشر می‌شود.</> },
      { q: "اپ موبایل دارید؟", a: <>بله، برای iOS و Android — با همان حساب سایت. انتشار در App Store و Google Play در راه است؛ فعلاً نسخه‌ی آزمایشی Android در دسترس تسترهاست. سؤال یا مشکل اپ را به همین ایمیل پشتیبانی بفرستید.</> },
      { q: "رمز عبورم را فراموش کرده‌ام.", a: <>از <Link href="/auth/forgot-password">صفحه‌ی بازیابی رمز</Link> استفاده کنید. ایمیل از <span dir="ltr">{company.email.noreply}</span> می‌آید — اگر نرسید، پوشه‌ی هرزنامه را ببینید.</> },
      { q: "چطور حسابم را حذف کنم؟", a: <>از صفحه‌ی <Link href="/account/delete">حذف حساب کاربری</Link>. آنی انجام می‌شود و نیازی به تماس با ما نیست.</> },
    ],
  },
];

export default function SupportPage() {
  return (
    <InnerPage
      currentPath="/support"
      currentSection="brand"
      eyebrow="پشتیبانی"
      title="کمک می‌خواهی؟ اینجاییم."
      description="بیشتر سؤال‌ها همین پایین جواب دارند. اگر نه، ایمیل بزن — معمولاً ظرف یک تا دو روز کاری پاسخ می‌دهیم."
    >
      {/* Quick actions */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3" dir="rtl">
        {QUICK.map(({ icon: Icon, title, href }) => (
          <Link key={title} href={href} className="group rounded-2xl bg-white border border-[color:var(--line)] p-4 flex items-center gap-3 hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] transition">
            <span className="w-10 h-10 rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)] flex items-center justify-center shrink-0"><Icon size={18} /></span>
            <span className="font-bold text-sm text-[color:var(--text)] flex-1">{title}</span>
            <ArrowLeft size={14} className="text-[color:var(--muted-text)] group-hover:-translate-x-0.5 transition" />
          </Link>
        ))}
      </section>

      {/* Direct */}
      <section className="mt-8 rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-4" dir="rtl">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><LifeBuoy size={22} /></div>
        <div className="flex-1">
          <div className="font-black text-lg">تماس مستقیم با پشتیبانی</div>
          <div className="text-sm text-[#f6f1e8]/75 mt-0.5">پاسخ ظرف یک تا دو روز کاری. اگر درباره‌ی یک کسب‌وکار خاص است، نامش را بنویس.</div>
        </div>
        <a href={`mailto:${company.email.support}`} className="inline-flex items-center gap-2 bg-[#f6f1e8] font-bold px-4 py-2.5 rounded-xl hover:bg-white transition" style={{ color: "#14213d", fontFamily: "var(--font-latin)" }} dir="ltr">
          <Mail size={16} /> {company.email.support}
        </a>
      </section>

      {/* FAQ */}
      {GROUPS.map((g) => (
        <section key={g.title} className="mt-12" dir="rtl">
          <h2 className="text-xl font-black text-[color:var(--text)] flex items-center gap-2 mb-4">
            <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg>
            {g.title}
          </h2>
          <div className="rounded-3xl bg-white border border-[color:var(--line)] divide-y divide-[color:var(--line)]">
            {g.items.map((f) => (
              <details key={f.q} className="group px-5 md:px-6">
                <summary className="cursor-pointer list-none py-4 flex items-center justify-between gap-4 font-bold text-[color:var(--text)]">
                  <span>{f.q}</span>
                  <span className="w-7 h-7 rounded-full bg-[color:var(--bg)] text-[color:var(--muted-text)] flex items-center justify-center text-lg leading-none group-open:rotate-45 transition shrink-0">+</span>
                </summary>
                <div className="pb-5 -mt-1 text-sm text-[color:var(--text)]/80 leading-[1.9] [&_a]:text-[color:var(--lajvard)] [&_a]:font-bold">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12" dir="rtl">
        <SuggestionBox page="/support" title="پیشنهادی داری؟" hint="امکانی که کم است، چیزی که اذیت می‌کند، کسب‌وکاری که باید باشد — بنویس یا بگو." />
      </section>

      <p className="mt-10 text-xs text-[color:var(--muted-text)]" dir="rtl">
        سؤالت این‌جا نبود؟ <Link href="/contact" className="text-[color:var(--lajvard)] font-bold">صفحه‌ی تماس</Link> — یا مستقیم به <a href={`mailto:${company.email.support}`} className="text-[color:var(--lajvard)] font-bold" dir="ltr">{company.email.support}</a>.
      </p>
    </InnerPage>
  );
}
