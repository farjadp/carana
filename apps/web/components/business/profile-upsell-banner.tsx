// ============================================================================
// Source: components/business/profile-upsell-banner.tsx
// Version: 1.1.0 — 2026-08-25
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
//
//      v1.1 (25 Aug): the copy was rewritten. It had been written in an
//      infomercial voice — «و اینجا هیچ‌کس دیگری نیست»، «کسب‌وکار من هم همین
//      را می‌خواهد» — and it was addressed to the wrong person: a visitor does
//      not care what this business bought. What a visitor needs is one plain
//      sentence explaining why the "similar businesses" list is missing, so
//      the gap does not read as a page that failed to load. That is the whole
//      job. The second button also went: both led to /pricing, and two calls
//      to action for one destination is noise dressed as choice. `businessName`
//      went with it — the name is already this page's own <h1>, and repeating
//      it in a banner underneath was the sentence's theatre, not its meaning.
// Env / Identity: Pure presentational Server Component. No IO.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Crown, ShieldCheck, Sparkles } from "lucide-react";

import { PLANS, PLATINUM_SEAT_CAP, type PlanId } from "@goplaza/core";

const fa = (n: number) => n.toLocaleString("fa-IR");

export function ProfileUpsellBanner({
  plan,
  isOwnerOrAdmin = false,
}: {
  /** The plan actually in force — from `entitlementsFor`, not the raw column. */
  plan: Extract<PlanId, "featured" | "platinum">;
  isOwnerOrAdmin?: boolean;
}) {
  const isPlatinum = plan === "platinum";
  const planName = PLANS[plan].name;

  // What is actually missing from this page, said plainly and once.
  const whatIsHidden = isPlatinum
    ? "در پایین این صفحه نه کسب‌وکار مشابهی نشان داده می‌شود، نه مقاله‌ای."
    : "در پایین این صفحه فهرست کسب‌وکارهای مشابه نشان داده نمی‌شود.";

  if (isOwnerOrAdmin) {
    return (
      <section className="border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-12" dir="rtl">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[color:var(--line)] bg-white p-6 text-center md:p-8">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--annabi)]/8 px-3 py-1 text-[11px] font-black text-[color:var(--annabi)]">
            {isPlatinum ? <Crown className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />} {planName}
          </span>
          <h2 className="text-lg font-black text-[color:var(--text)] md:text-xl">
            این بخش برای بازدیدکننده‌ها خالی است
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-[color:var(--muted-text)]">
            {whatIsHidden} این بخشی از پلن {planName} شماست. بازدیدکننده به‌جای آن یک یادداشت کوتاه می‌بیند.
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
            {planName}
          </span>

          <h2 className="text-xl font-black leading-snug md:text-2xl">
            صاحب این کسب‌وکار پلن {planName} دارد
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
            {whatIsHidden} این یکی از امکانات همان پلن است.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-[color:var(--lajvard)] transition hover:-translate-y-0.5 hover:bg-gray-100"
            >
              پلن‌ها و قیمت‌ها <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {/*
            The only scarcity claim on this page, and it is Platinum's alone —
            Premium is sold without a cap. It is also stated as a fact and left
            there: "یکی از آن‌ها همین کسب‌وکار است" was a nudge, not
            information, and under a Premium listing the old line volunteered
            that Premium has no cap, which is a strange thing to tell a visitor
            who never asked.
          */}
          {isPlatinum ? (
            <p className="mt-5 text-xs text-white/70">
              پلاتینیوم در کل کانادا {fa(PLATINUM_SEAT_CAP)} جایگاه دارد.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
