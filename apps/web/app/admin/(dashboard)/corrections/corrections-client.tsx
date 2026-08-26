// ============================================================================
// Source: app/admin/(dashboard)/corrections/corrections-client.tsx
// Version: 1.0.0 — 2026-08-26
// Why: Apply/reject buttons for the correction queue. A rejection's reason box
//      is required by the API, not by this form — the reason reverses someone's
//      ledger entry, so it must not be skippable by a request that never
//      touches this component.
// Env / Identity: Client, admin section.
// ============================================================================
"use client";

import { useState, useTransition } from "react";

export type CorrectionRow = {
  id: string;
  businessName: string;
  businessSlug: string;
  fieldLabel: string;
  previous: string;
  proposed: string;
  note: string | null;
  createdAt: string;
  level: number;
  levelLabel: string;
};

export function CorrectionsClient({ rows }: { rows: CorrectionRow[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const act = (id: string, action: "apply" | "reject") =>
    start(async () => {
      setError(null);
      try {
        const res = await fetch("/api/admin/corrections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, id, note: reason[id] ?? undefined }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error || "ناموفق بود.");
        setDone((d) => ({ ...d, [id]: action === "apply" ? "اعمال شد" : "رد شد" }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--muted-text)]">صف خالی است.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[color:var(--text)]">{r.businessName}</span>
            <span className="text-xs text-[color:var(--muted-text)]">·</span>
            <span className="text-sm">{r.fieldLabel}</span>
            <span className="rounded-full border border-[color:var(--line)] px-2 py-0.5 text-xs">
              {r.levelLabel}
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--line)] p-2">
              <div className="text-xs text-[color:var(--muted-text)]">اکنون</div>
              <div className="break-all text-sm" dir="ltr">{r.previous}</div>
            </div>
            <div className="rounded-lg border border-emerald-300 p-2">
              <div className="text-xs text-[color:var(--muted-text)]">پیشنهاد</div>
              <div className="break-all text-sm font-bold" dir="ltr">{r.proposed}</div>
            </div>
          </div>
          {r.note && <p className="mt-2 text-xs text-[color:var(--muted-text)]">توضیح: {r.note}</p>}

          {done[r.id] ? (
            <p className="mt-3 text-sm font-bold text-emerald-700">{done[r.id]}</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => act(r.id, "apply")}
                className="h-9 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-40"
              >
                اعمال
              </button>
              <input
                placeholder="دلیل رد کردن — اجباری"
                value={reason[r.id] ?? ""}
                onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                className="h-9 flex-1 min-w-[180px] rounded-lg border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
              />
              <button
                type="button"
                disabled={pending || (reason[r.id] ?? "").trim().length < 3}
                onClick={() => act(r.id, "reject")}
                className="h-9 rounded-full border border-[color:var(--line)] px-4 text-xs font-bold text-[color:var(--text)] disabled:opacity-40"
              >
                رد
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
