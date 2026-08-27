// ============================================================================
// Source: app/dashboard/business/[id]/billing/loyalty-card.tsx
// Version: 1.0.0 — 2026-08-26
// Why: What the owner has earned by staying — «وفاداری مالک», docs/16 phase 4.
//
//      Every number here is backed: tenure is walked from the invoices this
//      owner actually paid, and the card renders NOTHING at all when the
//      programme is off or nothing has been earned. It must never say "you
//      are close to a discount" as a sales line while the switch is off —
//      that would be a benefit we are not offering, which is the exact class
//      of unbacked UI this project removes on sight.
//
//      The capacity bonus is shown only when it is non-zero, because on
//      Premium and Platinum it always IS zero: those plans are already
//      unlimited, and "+5 photos" on an unlimited gallery is a false reward.
// Env / Identity: Client component. The apply button is a convenience; the
//      API recomputes tenure and ownership server-side.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Gift } from "lucide-react";

import type { CapacityBonus, LoyaltyTier, UpkeepChecks } from "@goplaza/core";
import { UPKEEP_LABELS_FA } from "@goplaza/core";
import { faNumber as fa } from "@goplaza/core";


export function LoyaltyCard({
  businessId,
  enabled,
  tenureMonths,
  since,
  tier,
  next,
  upkeep,
  bonus,
  hasLiveSubscription,
}: {
  businessId: string;
  enabled: boolean;
  tenureMonths: number;
  since: string | null;
  tier: LoyaltyTier | null;
  next: LoyaltyTier | null;
  upkeep: UpkeepChecks;
  bonus: CapacityBonus;
  hasLiveSubscription: boolean;
}) {
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Off, or nothing paid for yet: render nothing. An empty section is honest;
  // a teaser for a programme that is switched off is not.
  if (!enabled || tenureMonths < 1) return null;

  const apply = () =>
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/loyalty/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; percentOff?: number };
        if (!res.ok) throw new Error(json.error || "اعمال تخفیف ناموفق بود.");
        setApplied(json.percentOff ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  const years = Math.floor(tenureMonths / 12);
  const months = tenureMonths % 12;
  const tenureFa =
    years > 0
      ? months > 0
        ? `${fa(years)} سال و ${fa(months)} ماه`
        : `${fa(years)} سال`
      : `${fa(months)} ماه`;

  return (
    <section className="mt-8 rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-5">
      <h2 className="flex items-center gap-2 text-base font-black text-[color:var(--text)]">
        <Gift size={18} /> وفاداری
      </h2>

      <p className="mt-2 text-sm text-[color:var(--text)]">
        {tenureFa} اشتراک پیوسته
        {since ? ` — از ${new Date(since).toLocaleDateString("fa-IR", { dateStyle: "long" })}` : ""}.
      </p>

      {tier ? (
        <div className="mt-3 rounded-xl border border-[color:var(--line)] p-4">
          <div className="text-sm font-black text-[color:var(--text)]">
            {tier.labelFa} — {fa(tier.percentOff)}٪ تخفیف تمدید
          </div>
          {bonus.photos > 0 || bonus.announcements > 0 ? (
            <p className="mt-1 text-xs text-[color:var(--muted-text)]">
              {bonus.photos > 0 ? `${fa(bonus.photos)} عکس بیشتر` : ""}
              {bonus.photos > 0 && bonus.announcements > 0 ? " · " : ""}
              {bonus.announcements > 0 ? `${fa(bonus.announcements)} اطلاعیه‌ی بیشتر` : ""}
            </p>
          ) : null}

          {hasLiveSubscription ? (
            applied != null ? (
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                <Check size={15} /> روی تمدید بعدی اعمال شد ({fa(applied)}٪)
              </span>
            ) : (
              <button
                type="button"
                onClick={apply}
                disabled={pending}
                className="mt-3 h-10 rounded-full bg-[color:var(--text)] px-5 text-sm font-bold text-[#f6f1e8] transition disabled:opacity-40"
              >
                {pending ? "…" : "اعمال روی تمدید بعدی"}
              </button>
            )
          ) : (
            <p className="mt-2 text-xs text-[color:var(--muted-text)]">
              هنگام خرید یا تمدید، این تخفیف خودکار اعمال می‌شود.
            </p>
          )}
          {error ? <p className="mt-2 text-sm font-bold text-red-600">{error}</p> : null}
        </div>
      ) : next ? (
        <p className="mt-3 text-sm text-[color:var(--muted-text)]">
          {fa(next.months - tenureMonths)} ماه دیگر تا {next.labelFa} و {fa(next.percentOff)}٪ تخفیف تمدید.
        </p>
      ) : null}

      {/* Upkeep — shown only when it is actually gating something, i.e. when
          this plan HAS a ceiling the bonus could raise. On an already
          unlimited plan the checklist would be a demand with no reward. */}
      {tier && (bonus.photos > 0 || bonus.announcements > 0 || !allOk(upkeep)) ? (
        <div className="mt-4">
          <div className="text-xs font-black text-[color:var(--text)]">
            برای ظرفیت اضافه، این‌ها باید برقرار باشند:
          </div>
          <ul className="mt-2 space-y-1">
            {(Object.keys(UPKEEP_LABELS_FA) as (keyof UpkeepChecks)[]).map((k) => (
              <li key={k} className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${upkeep[k] ? "bg-emerald-500" : "bg-[color:var(--muted-text)]"}`}
                />
                <span className={upkeep[k] ? "text-[color:var(--text)]" : "text-[color:var(--muted-text)]"}>
                  {UPKEEP_LABELS_FA[k]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[color:var(--muted-text)]">
            تخفیف تمدید به این فهرست بستگی ندارد — فقط ظرفیت اضافه.
          </p>
        </div>
      ) : null}
    </section>
  );
}

const allOk = (u: UpkeepChecks) => Object.values(u).every(Boolean);
