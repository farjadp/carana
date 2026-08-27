// ============================================================================
// Source: app/support/page.tsx
// Version: 4.0.0 — 2026-08-26
// Why: Support that answers before you have to ask. Required for the App
//      Store listing (a reachable support URL) and useful on its own. v3:
//      brand layout, quick-action tiles, grouped FAQ that reflects how the
//      product actually works today (verification window, website import,
//      the mobile app), and one honest response-time promise.
//
//      v4 gives the page a way to actually reach a human. Until now it
//      offered a mailto link and a suggestion box, so anyone who wanted to
//      DESCRIBE a problem had to leave the page to do it. It now carries a
//      working form (app/support/actions.ts, delivered by Resend), the full
//      set of mailboxes, the operating company, and a direct Telegram.
//
//      The Telegram block renders only when company.telegram.support is set. An
//      unset handle prints nothing rather than a dead link — a contact route
//      that does not answer is the same class of lie as a badge nothing
//      backs, and this page is where someone already stuck ends up.
// Env / Identity: Static page, public information only. The form posts to a
//      server action; no secrets reach the client.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { SuggestionBox } from "@/components/suggestion-box";
import { ArrowLeft, BadgeCheck, Building2, KeyRound, LifeBuoy, Mail, MapPin, Send, Store, UserRoundX } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { SupportHero } from "@/components/support-hero";
import { company } from "@/lib/data/company";
import { SupportForm } from "./support-form";

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
      { q: "پلازا رایگان است؟", a: <>بله — هم برای جستجو و استفاده، هم برای ثبت کسب‌وکار. پلازا واسطه‌ی هیچ معامله‌ای نیست و کمیسیونی نمی‌گیرد.</> },
      { q: "«ذخیره» و «یادداشت خصوصی» چیست؟", a: <>با حساب کاربری می‌توانید هر کسب‌وکاری را ذخیره کنید و برای خودتان یادداشت بگذارید («رفتم، خوب بود»، «قیمت گرفتم»). یادداشت خصوصی را فقط خودتان می‌بینید؛ نظر عمومی جداست و پس از بررسی منتشر می‌شود.</> },
      { q: "اپ موبایل دارید؟", a: <>بله، برای iOS و Android — با همان حساب سایت. انتشار در App Store و Google Play در راه است؛ فعلاً نسخه‌ی آزمایشی Android در دسترس تسترهاست. سؤال یا مشکل اپ را به همین ایمیل پشتیبانی بفرستید.</> },
      { q: "رمز عبورم را فراموش کرده‌ام.", a: <>از <Link href="/auth/forgot-password">صفحه‌ی بازیابی رمز</Link> استفاده کنید. ایمیل از <span dir="ltr">{company.email.noreply}</span> می‌آید — اگر نرسید، پوشه‌ی هرزنامه را ببینید.</> },
      { q: "چطور حسابم را حذف کنم؟", a: <>از صفحه‌ی <Link href="/account/delete">حذف حساب کاربری</Link>. آنی انجام می‌شود و نیازی به تماس با ما نیست.</> },
    ],
  },
];

export default function SupportPage() {
  // Counted, never typed by hand: the hero cannot claim more answers than the
  // FAQ below actually renders.
  const answers = GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <PageShell currentPath="/support" currentSection="brand">
      <SupportHero answers={answers} />

      <main className="page-main">
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

      {/* Form + contact details. The form brings its own white card, so the
          column around it must not add a second one — nested cards. */}
      <section id="form" className="mt-12 grid lg:grid-cols-12 gap-8 scroll-mt-24" dir="rtl">
        <div className="lg:col-span-7">
          <h2 className="text-xl font-black text-[color:var(--text)] flex items-center gap-2 mb-1">
            <Merlon /> جوابت را پیدا نکردی؟ بنویس
          </h2>
          <p className="text-sm text-[color:var(--muted-text)] mb-5">
            موضوع را انتخاب کن تا پیام سریع‌تر به دست آدم درستش برسد. پیام به{" "}
            <span dir="ltr" className="[font-family:var(--font-latin)]">{company.email.support}</span>{" "}
            می‌رسد و پاسخ به ایمیل خودت فرستاده می‌شود.
          </p>
          <SupportForm />
        </div>

        <aside className="lg:col-span-5 space-y-4">
          {/* Direct routes */}
          <div className="rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6">
            <div className="flex items-center gap-2 text-xs text-[#f6f1e8]/60 mb-3">
              <LifeBuoy size={14} /> تماس مستقیم
            </div>

            <a
              href={`mailto:${company.email.support}`}
              className="flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 transition p-3.5"
            >
              <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-[#f6f1e8]/60">ایمیل پشتیبانی</span>
                <span className="block font-bold text-sm truncate [font-family:var(--font-latin)]" dir="ltr">
                  {company.email.support}
                </span>
              </span>
            </a>

            {company.telegram.support ? (
              <a
                href={`https://t.me/${company.telegram.support}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 transition p-3.5"
              >
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Send size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[#f6f1e8]/60">تلگرام</span>
                  <span className="block font-bold text-sm truncate [font-family:var(--font-latin)]" dir="ltr">
                    @{company.telegram.support}
                  </span>
                </span>
              </a>
            ) : null}

            <p className="mt-4 pt-3.5 border-t border-white/10 text-xs text-[#f6f1e8]/60 leading-relaxed">
              پاسخ معمولاً ظرف یک تا دو روز کاری. اگر درباره‌ی یک کسب‌وکار خاص
              است، نامش را بنویس.
            </p>
          </div>

          {/* Every mailbox, so nobody has to guess which one */}
          <div className="rounded-3xl bg-white border border-[color:var(--line)] p-6">
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted-text)] mb-3">
              <Mail size={14} /> بقیه‌ی نشانی‌ها
            </div>
            <ul className="space-y-2.5 text-sm">
              {[
                ["عمومی", company.email.general],
                ["همکاری و تبلیغات", company.email.partners],
                ["حریم خصوصی", company.email.privacy],
              ].map(([label, address]) => (
                <li key={address} className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--muted-text)]">{label}</span>
                  <a
                    href={`mailto:${address}`}
                    className="font-bold text-[color:var(--lajvard)] [font-family:var(--font-latin)]"
                    dir="ltr"
                  >
                    {address}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Who is actually behind this */}
          <div className="rounded-3xl bg-white border border-[color:var(--line)] p-6">
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted-text)] mb-3">
              <Building2 size={14} /> شرکت
            </div>
            {/* dir=ltr, or RTL reorders the trailing period to the front. */}
            <div className="font-black text-[color:var(--text)]" dir="ltr">{company.legalName}</div>
            <div className="text-sm text-[color:var(--muted-text)] mt-1 flex items-center gap-1.5">
              <MapPin size={14} /> {company.address}
            </div>
            <a
              href={company.parentSite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm mt-3 underline underline-offset-4 text-[color:var(--lajvard)] font-bold"
              dir="ltr"
            >
              ashavid.ca
            </a>
            <p className="mt-4 pt-3.5 border-t border-[color:var(--line)] text-xs text-[color:var(--muted-text)] leading-relaxed">
              پیش از نوشتن، شاید{" "}
              <Link href="/terms" className="text-[color:var(--lajvard)] font-bold">قوانین و مقررات</Link>{" "}
              یا{" "}
              <Link href="/privacy" className="text-[color:var(--lajvard)] font-bold">حریم خصوصی</Link>{" "}
              جوابت را داشته باشد.
            </p>
          </div>
        </aside>
      </section>

      <section className="mt-12" dir="rtl">
        <SuggestionBox page="/support" title="پیشنهادی داری؟" hint="امکانی که کم است، چیزی که اذیت می‌کند، کسب‌وکاری که باید باشد — بنویس یا بگو." />
      </section>

      <p className="mt-10 text-xs text-[color:var(--muted-text)]" dir="rtl">
        دنبال ثبت کسب‌وکار یا همکاری هستی؟ <Link href="/contact" className="text-[color:var(--lajvard)] font-bold">صفحه‌ی تماس</Link>.
      </p>
      </main>
    </PageShell>
  );
}

function Merlon() {
  return <svg viewBox="0 0 18 18" width="12" height="12" aria-hidden><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg>;
}
