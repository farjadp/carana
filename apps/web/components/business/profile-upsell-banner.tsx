// ============================================================================
// Source: components/business/profile-upsell-banner.tsx
// Version: 1.0.0 — 2026-08-24
// Why: What a paid profile shows in the space where the free ones list rival
//      businesses. Two jobs at once, and the second is the point: it tells the
//      visitor *why* the space is empty, so the absence reads as something the
//      owner bought rather than as a page that failed to load.
//
//      Every sentence here has to be true of the listing it sits under, so the
//      copy is driven by the entitlements, never by the caller's optimism:
//        · Premium (`clean_profile`)     — rivals gone, articles stay.
//        · Platinum (`exclusive_profile`) — rivals and articles both gone.
//      The scarcity line is the trap. **Premium has no seat cap**; Platinum is
//      capped at PLATINUM_SEAT_CAP nationwide. So the cap is only ever named
//      next to Platinum, and the number is read from the plan module rather
//      than typed here, because a hard-coded 21 is a promise that drifts.
//
//      The owner of the listing sees a different version with no "buy" button
//      — selling Premium to the person who already bought it is the same
//      unbacked sentence in the other direction.
// Env / Identity: Pure presentational Server Component. No IO.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Crown, ShieldCheck, Sparkles } from "lucide-react";

import { PLANS, PLATINUM_SEAT_CAP, type PlanId } from "@goplaza/core";

const fa = (n: number) => n.toLocaleString("fa-IR");

export function ProfileUpsellBanner({
  plan,
  businessName,
  isOwnerOrAdmin = false,
}: {
  /** The plan actually in force — from `entitlementsFor`, not the raw column. */
  plan: Extract<PlanId, "featured" | "platinum">;
  businessName: string;
  isOwnerOrAdmin?: boolean;
}) {
  const isPlatinum = plan === "platinum";
  const planName = PLANS[plan].name;

  // What is actually missing from this page, said plainly.
  const whatIsHidden = isPlatinum
    ? "به همین دلیل پایین این صفحه نه کسب‌وکار دیگری می‌بینید، نه مقاله‌ای. تا انتهای صفحه فقط همین کسب‌وکار است."
    : "به همین دلیل پایین این صفحه فهرست کسب‌وکارهای مشابه نشان داده نمی‌شود — بازدیدکننده از این پروفایل به رقیب نمی‌رسد.";

  if (isOwnerOrAdmin) {
    return (
      <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-12" dir="rtl">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[color:var(--line)] bg-white p-6 text-center md:p-8">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--annabi)]/8 px-3 py-1 text-[11px] font-black text-[color:var(--annabi)]">
            {isPlatinum ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />} {planName}
          </span>
          <h2 className="text-lg font-black text-[color:var(--text)] md:text-xl">
            این بخش برای بازدیدکننده‌ها خالی است — عمداً
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[color:var(--muted-text)]">
            {whatIsHidden} این چیزی است که با {planName} خریدید؛ جای این بخش، دعوت به {planName} شدن دیده می‌شود.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-12" dir="rtl">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-[color:var(--lajvard)] p-7 text-white md:p-10">
        {/* One wash, no wallpaper — the same restraint as the home band. */}
        <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-[90px]" />
        <div className="relative text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-black">
            {isPlatinum ? <Crown className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            این کسب‌وکار {planName} است
          </span>

          <h2 className="text-xl font-black leading-snug md:text-2xl">
            «{businessName}» {planName} شده — و اینجا هیچ‌کس دیگری نیست.
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
            {whatIsHidden}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-[color:var(--lajvard)] transition hover:-translate-y-0.5 hover:bg-gray-100"
            >
              کسب‌وکار من هم همین را می‌خواهد <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing#plans"
              className="inline-flex h-12 items-center rounded-full border border-white/35 px-6 text-sm font-bold text-white transition hover:bg-white/10"
            >
              مقایسه‌ی پلن‌ها
            </Link>
          </div>

          {/*
            The only scarcity claim on this page, and it is Platinum's alone.
            Premium is sold without a cap; saying "limited" under a Premium
            listing would be a number nothing backs.
          */}
          <p className="mt-5 text-xs text-white/70">
            پلاتینیوم فقط {fa(PLATINUM_SEAT_CAP)} جایگاه در کل کانادا دارد
            {isPlatinum ? " — یکی از آن‌ها همین کسب‌وکار است." : "؛ پریمیوم سقف تعداد ندارد."}
          </p>
        </div>
      </div>
    </section>
  );
}
