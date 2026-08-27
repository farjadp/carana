// ============================================================================
// Source: app/complaint/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: A real complaints route. Until now "شکایت" meant emailing support and
//      hoping, which is the arrangement that turns a fixable annoyance into a
//      regulator's letter. The page states the four things a complaints
//      process has to state to be one at all: who reads it, how long we take,
//      what we can actually do, and where to go when our answer is not good
//      enough.
//
//      THE ESCALATION SECTION IS THE POINT. Naming the OPC and the Ontario
//      consumer route costs nothing and is already promised in /privacy §۲۱;
//      a complaints page that quietly omits them reads as a dead end, and a
//      dead end is what makes people escalate angrily instead of calmly.
//
//      No case numbers, no "resolved in 48h" — see actions.ts. The 30-day
//      window is the same one /privacy commits to, written once.
// Env / Identity: Static page; the form posts to a server action.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Scale, Send, ShieldCheck } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { LegalList, LegalSection } from "@/components/legal-doc";
import { brand } from "@goplaza/core";
import { company } from "@/lib/data/company";

import { ComplaintForm } from "./complaint-form";

export const metadata: Metadata = {
  alternates: { canonical: "/complaint" },
  title: "ثبت شکایت",
  description: `فرم رسمی ثبت شکایت ${brand.nameFa}: چه کسی آن را می‌خواند، چقدر طول می‌کشد، و اگر از پاسخ راضی نبودید کجا می‌توانید شکایت کنید.`,
};

export default function ComplaintPage() {
  return (
    <PageShell currentPath="/complaint" currentSection="brand">
      {/* Header — deliberately calmer than the support hero. Someone arriving
          here is not looking to be sold anything. */}
      <section className="relative overflow-hidden bg-[#14213d]" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_80%_0%,#1e2f52_0%,#14213d_60%,#0e1729_100%)]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-14 text-center sm:px-6 md:pb-16 md:pt-[4.5rem]">
          <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#f6f1e8]/80 backdrop-blur md:text-sm">
            <Scale size={14} />
            <span>ثبت شکایت</span>
          </div>
          <h1 className="text-[2rem] font-black leading-[1.3] tracking-tight text-[#f6f1e8] sm:text-4xl md:text-[3rem]">
            حرفت را می‌شنویم و کتبی جواب می‌دهیم.
            <span className="mt-3 block text-lg font-bold leading-snug text-[#f6f1e8]/70 sm:text-xl md:text-2xl">
              شکایتت را ثبت کن؛ بررسی می‌شود و نتیجه‌اش را برایت می‌نویسیم.
            </span>
          </h1>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-3.5" aria-hidden>
          <svg viewBox="0 0 48 12" preserveAspectRatio="none" className="h-full w-full">
            <pattern id="complaint-merlon" width="48" height="12" patternUnits="userSpaceOnUse">
              <path d="M0,12 V8 H6 V4 H12 V0 H24 V4 H30 V8 H36 V12 Z" fill="#f6f1e8" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#complaint-merlon)" />
          </svg>
        </div>
      </section>

      <main className="page-main">
        <section className="grid lg:grid-cols-12 gap-8" dir="rtl">
          {/* The form brings its own card — no wrapper card around it. */}
          <div className="lg:col-span-7">
            <h2 className="text-xl font-black text-[color:var(--text)] mb-1">فرم ثبت شکایت</h2>
            <p className="text-sm text-[color:var(--muted-text)] mb-5">
              شرح، نام و ایمیل لازم‌اند؛ بقیه اختیاری. برای ثبت شکایت نیازی به
              حساب کاربری نیست.
            </p>
            <ComplaintForm />
          </div>

          <aside className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl bg-[color:var(--text)] text-[#f6f1e8] p-6">
              <div className="flex items-center gap-2 text-xs text-[#f6f1e8]/60 mb-3">
                <ShieldCheck size={14} /> ترجیح می‌دهی مستقیم بگویی؟
              </div>

              <a
                href={`tel:${company.phone.management}`}
                className="flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 transition p-3.5"
              >
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Phone size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[#f6f1e8]/60">تلفن مدیریت</span>
                  <span className="block font-bold text-sm [font-family:var(--font-latin)]" dir="ltr">
                    {company.phone.management}
                  </span>
                </span>
              </a>

              <a
                href={`mailto:${company.email.management}`}
                className="mt-2.5 flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 transition p-3.5"
              >
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Mail size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-[#f6f1e8]/60">ایمیل مدیریت</span>
                  <span className="block font-bold text-sm truncate [font-family:var(--font-latin)]" dir="ltr">
                    {company.email.management}
                  </span>
                </span>
              </a>

              {company.telegram.personal ? (
                <a
                  href={`https://t.me/${company.telegram.personal}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/20 transition p-3.5"
                >
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Send size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-[#f6f1e8]/60">تلگرام مستقیم</span>
                    <span className="block font-bold text-sm [font-family:var(--font-latin)]" dir="ltr">
                      @{company.telegram.personal}
                    </span>
                  </span>
                </a>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white border border-[color:var(--line)] p-6">
              <div className="text-xs text-[color:var(--muted-text)] mb-3">مسیرهای دیگر</div>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--muted-text)]">پشتیبانی روزمره</span>
                  <Link href="/support" className="font-bold text-[color:var(--lajvard)]">
                    صفحه‌ی پشتیبانی
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--muted-text)]">همکاری و رسانه</span>
                  <Link href="/contact" className="font-bold text-[color:var(--lajvard)]">
                    تماس با ما
                  </Link>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-[color:var(--muted-text)]">گزارش سریع یک صفحه</span>
                  <span className="text-[color:var(--muted-text)] text-xs">
                    دکمه‌ی گزارش روی همان صفحه
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </section>

        {/* What actually happens next */}
        <div className="legal-doc mt-14" dir="rtl">
          <LegalSection id="process" title="بعد از ثبت، چه اتفاقی می‌افتد">
            <LegalList
              items={[
                "شکایت شما مستقیم به مدیریت می‌رسد — نه به صف عمومی پشتیبانی. شکایت‌های مربوط به حریم خصوصی به مسئول حریم خصوصی می‌رسد.",
                "بررسی می‌کنیم و در صورت نیاز برای جزئیات بیشتر با شما تماس می‌گیریم.",
                "پاسخ کتبی حداکثر ظرف ۳۰ روز به ایمیل شما فرستاده می‌شود. اگر بررسی طولانی‌تر شد، پیش از پایان این مهلت به شما خبر می‌دهیم.",
                "اگر شکایت درباره‌ی یک کسب‌وکار باشد، ممکن است لازم باشد نظر آن کسب‌وکار را هم بپرسیم. هویت شما بدون اجازه‌تان به او اعلام نمی‌شود.",
              ]}
            />
          </LegalSection>

          <LegalSection id="limits" title="از ما چه کاری برمی‌آید و چه کاری برنمی‌آید">
            <p>
              {brand.nameFa} یک دایرکتوری است، نه داور میان شما و یک کسب‌وکار.
              می‌توانیم اطلاعات نادرست را اصلاح کنیم، محتوای متخلف را برداریم،
              نشان تایید را پس بگیریم، لیستینگ را از انتشار خارج کنیم و
              دسترسی یک حساب را ببندیم.
            </p>
            <p>
              آنچه از ما برنمی‌آید: بازگرداندن پولی که به یک کسب‌وکار
              پرداخته‌اید، اجبار او به انجام کاری، یا داوری درباره‌ی کیفیت کار
              انجام‌شده. برای این موارد باید مستقیم با خود کسب‌وکار یا با مراجع
              قانونی پیگیری کنید. حدود مسئولیت ما در{" "}
              <Link href="/disclaimer">سلب مسئولیت</Link> آمده است.
            </p>
          </LegalSection>

          <LegalSection id="escalation" title="اگر از پاسخ ما راضی نبودید">
            <p>
              حق دارید موضوع را بیرون از {brand.nameFa} پیگیری کنید و ما این را
              پنهان نمی‌کنیم:
            </p>
            <LegalList
              items={[
                <>
                  <strong>حریم خصوصی:</strong> دفتر کمیسر حریم خصوصی کانادا —{" "}
                  <a
                    href="https://www.priv.gc.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                  >
                    priv.gc.ca
                  </a>
                </>,
                <>
                  <strong>مصرف‌کننده و پرداخت:</strong> اداره‌ی حمایت از
                  مصرف‌کننده‌ی انتاریو، بر اساس قانون حمایت از مصرف‌کننده‌ی
                  انتاریو (Consumer Protection Act).
                </>,
                <>
                  <strong>کسب‌وکار متخلف:</strong> شکایت از خود کسب‌وکار به
                  نهاد صنفی یا مرجع صدور پروانه‌ی همان حرفه.
                </>,
              ]}
            />
            <p>
              شرایط کامل در <Link href="/terms">قوانین و مقررات</Link> و{" "}
              <Link href="/privacy#s21">حریم خصوصی</Link> آمده است.
            </p>
          </LegalSection>
        </div>

        <p className="mt-10 text-xs text-[color:var(--muted-text)]" dir="rtl">
          سؤال ساده داری، نه شکایت؟{" "}
          <Link href="/support" className="text-[color:var(--lajvard)] font-bold">
            صفحه‌ی پشتیبانی
          </Link>{" "}
          سریع‌تر جواب می‌دهد. <ArrowLeft size={12} className="inline" />
        </p>
      </main>
    </PageShell>
  );
}
