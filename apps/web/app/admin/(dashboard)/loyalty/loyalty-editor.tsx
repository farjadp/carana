// ============================================================================
// Source: app/admin/(dashboard)/loyalty/loyalty-editor.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The green knobs of «وفاداری مالک». Persian digits fold before parsing
//      — the RTL trap that has shipped twice on this project — and the
//      percentage field is capped client-side at the same 50 the API enforces,
//      so the two cannot drift.
// Env / Identity: Client. The API re-checks requireAdmin and re-validates.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Power } from "lucide-react";

import { toLatinDigits, type LoyaltyTier } from "@goplaza/core";

import type { LoyaltySettings } from "@/lib/loyalty/settings";

const num = (raw: string, fallback: number) => {
  const n = Number(toLatinDigits(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

export function LoyaltyEditor({ settings }: { settings: LoyaltySettings }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [graceDays, setGraceDays] = useState(settings.graceDays);
  const [tiers, setTiers] = useState<LoyaltyTier[]>(settings.tiers);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setTier = (i: number, patch: Partial<LoyaltyTier>) =>
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const save = () =>
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        const res = await fetch("/api/admin/loyalty", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled, graceDays, tiers }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || "ذخیره نشد.");
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  const cell = (
    i: number,
    key: "months" | "percentOff" | "bonusPhotos" | "bonusAnnouncements",
    max: number
  ) => (
    <input
      dir="ltr"
      inputMode="numeric"
      type="text"
      value={String(tiers[i][key])}
      onChange={(e) => setTier(i, { [key]: Math.min(max, Math.trunc(num(e.target.value, tiers[i][key]))) })}
      className="h-8 w-16 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center font-bold outline-none focus:border-[color:var(--lajvard)]"
    />
  );

  return (
    <div className="space-y-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-white transition ${
            enabled ? "bg-emerald-600" : "bg-[color:var(--muted-text)]"
          }`}
        >
          <Power size={15} /> {enabled ? "برنامه فعال است" : "برنامه خاموش است"}
        </button>
        <label className="flex items-center gap-2 text-xs text-[color:var(--text)]">
          مهلت وقفه بین دو دوره (روز)
          <input
            dir="ltr"
            inputMode="numeric"
            type="text"
            value={String(graceDays)}
            onChange={(e) => setGraceDays(Math.min(365, Math.trunc(num(e.target.value, graceDays))))}
            className="h-8 w-20 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center text-sm font-bold outline-none focus:border-[color:var(--lajvard)]"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="text-right text-xs text-[color:var(--muted-text)]">
              <th className="py-2 font-normal">عنوان</th>
              <th className="py-2 font-normal">از چند ماه</th>
              <th className="py-2 font-normal">٪ تخفیف</th>
              <th className="py-2 font-normal">عکس اضافه</th>
              <th className="py-2 font-normal">اطلاعیه اضافه</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={i} className="border-t border-[color:var(--line)]">
                <td className="py-2">
                  <input
                    value={t.labelFa}
                    onChange={(e) => setTier(i, { labelFa: e.target.value })}
                    className="h-8 w-44 rounded-lg border border-[color:var(--line)] bg-white px-2 outline-none focus:border-[color:var(--lajvard)]"
                  />
                </td>
                <td className="py-2">{cell(i, "months", 600)}</td>
                <td className="py-2">{cell(i, "percentOff", 50)}</td>
                <td className="py-2">{cell(i, "bonusPhotos", 100)}</td>
                <td className="py-2">{cell(i, "bonusAnnouncements", 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="h-10 rounded-full bg-[color:var(--text)] px-5 text-sm font-bold text-[#f6f1e8] transition disabled:opacity-40"
        >
          {pending ? "…" : "ذخیره"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Check size={15} /> ذخیره شد
          </span>
        )}
        {error && <span className="text-sm font-bold text-red-600">{error}</span>}
      </div>

      <p className="text-xs text-[color:var(--muted-text)]">
        عکس و اطلاعیه‌ی اضافه فقط روی «استارتر» اثر دارد — پریمیوم و پلاتینیوم از
        قبل نامحدودند، و کارت مالک روی آن پلن‌ها چیزی درباره‌ی ظرفیت نشان نمی‌دهد.
        ظرفیت اضافه به فهرست نگهداری بستگی دارد؛ تخفیف نه.
      </p>
    </div>
  );
}
