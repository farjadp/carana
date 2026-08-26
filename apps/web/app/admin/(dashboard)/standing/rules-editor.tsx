// ============================================================================
// Source: app/admin/(dashboard)/standing/rules-editor.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The green knobs (docs/16): master switch, public display, per-kind
//      points/caps, level thresholds, maintenance window. Freely editable
//      BECAUSE settlement freezes points into each event — the sentence to
//      that effect renders beside the fields, since the natural fear when
//      editing a live economy is "did I just rewrite everyone's history".
//      Adding a kind is deliberately impossible here (red list).
// Env / Identity: Client. Convenience, not the gate — both API routes
//      re-check requireAdmin and re-validate shapes.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Power } from "lucide-react";

import { toLatinDigits } from "@goplaza/core";

import type { StandingRule, StandingSettings } from "@/lib/standing/rules";

/** Persian digits fold before parsing — the RTL gotcha that has shipped twice. */
const num = (raw: string, fallback: number) => {
  const n = Number(toLatinDigits(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

export function RulesEditor({
  settings,
  rules,
}: {
  settings: StandingSettings;
  rules: StandingRule[];
}) {
  const [cfg, setCfg] = useState(settings);
  const [rows, setRows] = useState(rules);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        // Settings first, then only the rules that changed.
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "standing", value: cfg }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || "ذخیره‌ی تنظیمات ناموفق بود.");

        for (const row of rows) {
          const before = rules.find((r) => r.kind === row.kind);
          if (!before) continue;
          const patch: Record<string, unknown> = {};
          if (row.points !== before.points) patch.points = row.points;
          if (row.daily_cap !== before.daily_cap) patch.daily_cap = row.daily_cap;
          if (row.enabled !== before.enabled) patch.enabled = row.enabled;
          if (Object.keys(patch).length === 0) continue;
          const r2 = await fetch("/api/admin/standing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: row.kind, patch }),
          });
          const j2 = (await r2.json().catch(() => ({}))) as { error?: string };
          if (!r2.ok) throw new Error(j2.error || `ذخیره‌ی ${row.kind} ناموفق بود.`);
        }
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  const setRow = (kind: string, patch: Partial<StandingRule>) =>
    setRows((rs) => rs.map((r) => (r.kind === kind ? { ...r, ...patch } : r)));

  const threshold = (
    lv: "level1" | "level2",
    key: "xp" | "confirmed" | "accuracy" | "kinds",
    label: string,
    step?: string
  ) => (
    <label className="flex items-center justify-between gap-2 text-xs text-[color:var(--text)]">
      {label}
      <input
        dir="ltr"
        inputMode="decimal"
        step={step}
        type="text"
        value={String(cfg.thresholds[lv][key])}
        onChange={(e) =>
          setCfg((c) => ({
            ...c,
            thresholds: {
              ...c.thresholds,
              [lv]: { ...c.thresholds[lv], [key]: num(e.target.value, c.thresholds[lv][key]) },
            },
          }))
        }
        className="h-8 w-20 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center text-sm font-bold outline-none focus:border-[color:var(--lajvard)]"
      />
    </label>
  );

  return (
    <div className="space-y-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
      {/* Switches */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setCfg((c) => ({ ...c, enabled: !c.enabled }))}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-white transition ${
            cfg.enabled ? "bg-emerald-600" : "bg-[color:var(--muted-text)]"
          }`}
        >
          <Power size={15} /> {cfg.enabled ? "برنامه فعال است" : "برنامه خاموش است"}
        </button>
        <button
          type="button"
          onClick={() => setCfg((c) => ({ ...c, public_display: !c.public_display }))}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-white transition ${
            cfg.public_display ? "bg-emerald-600" : "bg-[color:var(--muted-text)]"
          }`}
        >
          {cfg.public_display ? "نمایش عمومی روشن" : "نمایش عمومی خاموش"}
        </button>
        <span className="text-xs text-[color:var(--muted-text)]">
          خاموش یعنی ثبتِ در انتظار ادامه دارد ولی هیچ‌چیز تسویه یا نمایش داده
          نمی‌شود — روشن کردنِ دوباره چیزی را از دست نمی‌دهد.
        </span>
      </div>

      {/* Per-kind rules */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="text-right text-xs text-[color:var(--muted-text)]">
              <th className="py-2 font-normal">نوع مشارکت</th>
              <th className="py-2 font-normal">امتیاز</th>
              <th className="py-2 font-normal">سقف روزانه</th>
              <th className="py-2 font-normal">فعال</th>
              <th className="py-2 font-normal">نسخه</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kind} className="border-t border-[color:var(--line)]">
                <td className="py-2">
                  <div className="font-bold text-[color:var(--text)]">{r.label_fa}</div>
                  <div className="text-xs text-[color:var(--muted-text)]" dir="ltr">{r.kind}</div>
                </td>
                <td className="py-2">
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    type="text"
                    value={String(r.points)}
                    onChange={(e) => setRow(r.kind, { points: Math.trunc(num(e.target.value, r.points)) })}
                    className="h-8 w-16 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center font-bold outline-none focus:border-[color:var(--lajvard)]"
                  />
                </td>
                <td className="py-2">
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    type="text"
                    value={String(r.daily_cap)}
                    onChange={(e) => setRow(r.kind, { daily_cap: Math.trunc(num(e.target.value, r.daily_cap)) })}
                    className="h-8 w-16 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center font-bold outline-none focus:border-[color:var(--lajvard)]"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => setRow(r.kind, { enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                </td>
                <td className="py-2 text-xs text-[color:var(--muted-text)]" dir="ltr">v{r.version}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-xs text-[color:var(--muted-text)]">
                  قاعده‌ای پیدا نشد — مایگریشن هنوز اجرا نشده.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Thresholds */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 rounded-lg border border-[color:var(--line)] p-3">
          <div className="text-xs font-black text-[color:var(--text)]">سطح ۱ — مشارکت‌کننده</div>
          {threshold("level1", "xp", "XP")}
          {threshold("level1", "confirmed", "حداقل تأییدشده")}
          {threshold("level1", "accuracy", "کف دقت (۰ تا ۱)", "0.01")}
          {threshold("level1", "kinds", "تنوع (نوع متفاوت)")}
        </div>
        <div className="space-y-2 rounded-lg border border-[color:var(--line)] p-3">
          <div className="text-xs font-black text-[color:var(--text)]">سطح ۲ — معتمد</div>
          {threshold("level2", "xp", "XP")}
          {threshold("level2", "confirmed", "حداقل تأییدشده")}
          {threshold("level2", "accuracy", "کف دقت (۰ تا ۱)", "0.01")}
          {threshold("level2", "kinds", "تنوع (نوع متفاوت)")}
        </div>
        <div className="space-y-2 rounded-lg border border-[color:var(--line)] p-3">
          <div className="text-xs font-black text-[color:var(--text)]">نگهداری</div>
          <label className="flex items-center justify-between gap-2 text-xs text-[color:var(--text)]">
            پنجره‌ی فعالیت (روز)
            <input
              dir="ltr"
              inputMode="numeric"
              type="text"
              value={String(cfg.maintenance_window_days)}
              onChange={(e) =>
                setCfg((c) => ({
                  ...c,
                  maintenance_window_days: Math.trunc(num(e.target.value, c.maintenance_window_days)),
                }))
              }
              className="h-8 w-20 rounded-lg border border-[color:var(--line)] bg-white px-2 text-center text-sm font-bold outline-none focus:border-[color:var(--lajvard)]"
            />
          </label>
          <p className="text-xs text-[color:var(--muted-text)]">
            سطح ۳ (نگهبان) آستانه ندارد — فقط با اعطای دستی از بخش پایین.
          </p>
        </div>
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
        تغییر امتیازها فقط تسویه‌های آینده را عوض می‌کند؛ رویدادهای تسویه‌شده
        امتیاز و نسخه‌ی قاعده‌ی زمان خودشان را نگه می‌دارند. افزودن نوعِ جدید از
        اینجا ممکن نیست — نوع جدید همراه کدی که آن را تولید می‌کند اضافه می‌شود.
      </p>
    </div>
  );
}
