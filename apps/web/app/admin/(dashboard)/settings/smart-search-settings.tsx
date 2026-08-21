// ============================================================================
// Source: app/admin/(dashboard)/settings/smart-search-settings.tsx
// Version: 1.0.0 — 2026-08-19
// Why: The interactive half of the smart-search section: enable toggle +
//      daily cap, saved through /api/admin/settings (which validates the
//      shape and re-checks the admin role server-side — this form is a
//      convenience, not the gate).
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Power } from "lucide-react";

export function SmartSearchSettings({ initial }: { initial: { enabled: boolean; daily_cap: number } }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [cap, setCap] = useState(initial.daily_cap);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = enabled !== initial.enabled || cap !== initial.daily_cap;

  const save = () =>
    start(async () => {
      setError(null);
      setSaved(false);
      try {
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "smart_search", value: { enabled, daily_cap: cap } }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || "ذخیره نشد.");
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          enabled ? "bg-emerald-600 text-white" : "bg-[color:var(--muted-text)] text-white"
        }`}
      >
        <Power size={15} /> {enabled ? "فعال" : "خاموش"}
      </button>
      <label className="flex items-center gap-2 text-sm text-[color:var(--text)]">
        سقف کوئری جدید در روز:
        <input
          type="number"
          min={0}
          max={10000}
          value={cap}
          onChange={(e) => setCap(Math.max(0, Math.min(10000, Number(e.target.value) || 0)))}
          className="h-10 w-24 rounded-lg border border-[color:var(--line)] bg-white px-3 text-center font-bold outline-none focus:border-[color:var(--lajvard)]"
          dir="ltr"
        />
      </label>
      <button
        type="button"
        disabled={!dirty || pending}
        onClick={save}
        className="h-10 rounded-full bg-[color:var(--text)] px-5 text-sm font-bold text-[#f6f1e8] transition disabled:opacity-40"
      >
        {pending ? "…" : "ذخیره"}
      </button>
      {saved && !dirty ? (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
          <Check size={15} /> ذخیره شد
        </span>
      ) : null}
      {error ? <span className="text-sm font-bold text-red-600">{error}</span> : null}
    </div>
  );
}
