// ============================================================================
// Source: components/support-hero.tsx
// Version: 1.0.0 — 2026-08-26
// Why: /support used the generic InnerPage header — an eyebrow, an h1 and a
//      line of grey text, the same shell the legal pages wear. That is the
//      right furniture for a document and the wrong furniture for the page
//      someone opens when they are already stuck and slightly annoyed.
//
//      Same visual language as components/home-hero.tsx on purpose — annabi →
//      navy wash, the mark bleeding off the corner, faint geometry, and the
//      Persepolis merlon parapet in cream so the band hands off to the page
//      ground. A support page that invented its own look would read as a
//      different site at the exact moment trust matters most.
//
//      EVERY NUMBER IS DERIVED, NOT DECLARED. `answers` is counted from the
//      FAQ actually rendered below, so it cannot drift from the page. There
//      is no satisfaction score and no "average response 2h" — we do not
//      measure either, and this is the last page on the site that should
//      round up. The response time is the same one the form and the aside
//      promise, written once here and repeated nowhere as a different figure.
//
//      Telegram appears only when company.telegram is set; with it unset the
//      grid falls back to two routes rather than printing a dead one.
// Env / Identity: Server component. Public information only.
// ============================================================================
import { ArrowLeft, Clock, Mail, MessageSquareText, Send, UserRoundCheck } from "lucide-react";

import { faDigits } from "@goplaza/core";

import { BrandMark } from "@/components/brand-mark";
import { company } from "@/lib/data/company";

export function SupportHero({ answers }: { answers: number }) {
  const telegram = company.telegram;

  return (
    <section className="relative overflow-hidden bg-[#5A1124]" dir="rtl">
      {/* Wash: annabi → deep navy, warm and calm */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_10%,#7A1831_0%,#5A1124_35%,#14213d_100%)]" />
      {/* Watermark mark, bleeding off the corner */}
      <div className="pointer-events-none absolute -left-24 -top-28 select-none opacity-[0.06]" aria-hidden>
        <BrandMark size={480} color="#f6f1e8" simple />
      </div>
      {/* Faint rings for depth (geometry only, no ornament) */}
      <div className="pointer-events-none absolute bottom-[-46%] right-[-12%] h-[56vw] max-h-[760px] w-[56vw] max-w-[760px] rounded-full border border-white/5" aria-hidden />
      <div className="pointer-events-none absolute bottom-[-38%] right-[-5%] h-[44vw] max-h-[600px] w-[44vw] max-w-[600px] rounded-full border border-white/5" aria-hidden />

      <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:px-6 md:pb-20 md:pt-[4.5rem]">
        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#f6f1e8]/80 backdrop-blur md:text-sm">
          <BrandMark size={14} color="#f6f1e8" simple />
          <span>پشتیبانی گوپلازا</span>
        </div>

        <h1 className="text-[2.1rem] font-black leading-[1.25] tracking-tight text-[#f6f1e8] sm:text-5xl md:text-[3.4rem]">
          گیر کردی؟ بیا درستش کنیم.
          <span className="mt-3 block text-xl font-bold leading-snug text-[#f6f1e8]/70 sm:text-2xl md:text-3xl">
            بیشتر سؤال‌ها همین پایین جواب دارند. بقیه را برای ما بنویس.
          </span>
        </h1>

        {/* Routes to a human. Order is deliberate: the form first, because it
            is the one that arrives with enough context to answer in one go. */}
        <div className="mx-auto mt-9 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:flex-wrap">
          <a
            href="#form"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6f1e8] px-6 py-3.5 font-bold text-[color:var(--text)] shadow-[0_18px_44px_rgba(0,0,0,0.3)] transition hover:bg-white"
          >
            <MessageSquareText size={17} />
            نوشتن به پشتیبانی
            <ArrowLeft size={15} />
          </a>

          <a
            href={`mailto:${company.email.support}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3.5 font-bold text-[#f6f1e8] backdrop-blur transition hover:bg-white/20"
          >
            <Mail size={17} />
            <span dir="ltr" className="[font-family:var(--font-latin)] text-sm">
              {company.email.support}
            </span>
          </a>

          {telegram ? (
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3.5 font-bold text-[#f6f1e8] backdrop-blur transition hover:bg-white/20"
            >
              <Send size={17} />
              <span dir="ltr" className="[font-family:var(--font-latin)] text-sm">@{telegram}</span>
            </a>
          ) : null}
        </div>

        {/* Facts, not claims. Each one is either counted from this page or is
            a promise the rest of the page keeps in the same words. */}
        <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-x-4 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-3">
          <Fact
            icon={<MessageSquareText size={14} />}
            value={faDigits(answers)}
            label="پاسخ آماده، همین پایین"
          />
          <Fact
            icon={<Clock size={14} />}
            value="۱ تا ۲ روز کاری"
            label="پاسخ معمول به پیام‌ها"
            gold
          />
          <Fact
            icon={<UserRoundCheck size={14} />}
            value="بدون حساب"
            label="فرم برای همه باز است"
          />
        </dl>

        <p className="mt-4 text-[11px] text-[#f6f1e8]/50">
          اگر سؤالت درباره‌ی یک کسب‌وکار مشخص است، نامش را بنویس تا سریع‌تر پیدایش کنیم.
        </p>
      </div>

      {/* Merlon parapet — cream, so it hands off to the page ground */}
      <div className="absolute inset-x-0 bottom-0 h-3.5" aria-hidden>
        <svg viewBox="0 0 48 12" preserveAspectRatio="none" className="h-full w-full">
          <pattern id="support-merlon" width="48" height="12" patternUnits="userSpaceOnUse">
            <path d="M0,12 V8 H6 V4 H12 V0 H24 V4 H30 V8 H36 V12 Z" fill="#f6f1e8" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#support-merlon)" />
        </svg>
      </div>
    </section>
  );
}

function Fact({
  icon,
  value,
  label,
  gold,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  gold?: boolean;
}) {
  return (
    <div>
      <dd className={`text-xl font-black md:text-2xl ${gold ? "text-[#e6c877]" : "text-[#f6f1e8]"}`}>
        {value}
      </dd>
      <dt className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#f6f1e8]/60">
        {icon}
        {label}
      </dt>
    </div>
  );
}
