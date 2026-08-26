// ============================================================================
// Source: app/admin/(dashboard)/standing/user-actions.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The amber actions' form. The reason field is required by the API, not
//      here — this form is a convenience over /api/admin/standing/actions,
//      which re-validates everything and refuses an empty reason on its own.
// Env / Identity: Client, admin section.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";

type Action = "settle_event" | "reverse_event" | "grant_level" | "freeze" | "recompute";

const ACTIONS: { id: Action; label: string; target: "event" | "user" }[] = [
  { id: "settle_event", label: "تسویه‌ی دستی رویداد", target: "event" },
  { id: "reverse_event", label: "بازپس‌گیری رویداد", target: "event" },
  { id: "grant_level", label: "اعطا / سلب نگهبان", target: "user" },
  { id: "freeze", label: "فریز / آزادسازی کاربر", target: "user" },
  { id: "recompute", label: "بازمحاسبه‌ی کاربر", target: "user" },
];

export function UserActions() {
  const [action, setAction] = useState<Action>("recompute");
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  const [grant, setGrant] = useState<"3" | "revoke">("3");
  const [freeze, setFreeze] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const meta = ACTIONS.find((a) => a.id === action)!;

  const run = () =>
    start(async () => {
      setError(null);
      setResult(null);
      try {
        const body: Record<string, unknown> = { action, reason };
        if (meta.target === "event") body.eventId = id.trim();
        else body.userId = id.trim();
        if (action === "grant_level") body.level = grant === "revoke" ? null : 3;
        if (action === "freeze") body.frozen = freeze;
        const res = await fetch("/api/admin/standing/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string; outcome?: string };
        if (!res.ok) throw new Error(json.error || "اقدام ناموفق بود.");
        setResult(json.outcome ?? "انجام شد");
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا");
      }
    });

  return (
    <div className="space-y-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)]/60 p-4">
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => { setAction(a.id); setResult(null); setError(null); }}
            className={`h-9 rounded-full px-4 text-xs font-bold transition ${
              action === a.id
                ? "bg-[color:var(--text)] text-[#f6f1e8]"
                : "border border-[color:var(--line)] text-[color:var(--text)]"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          dir="ltr"
          placeholder={meta.target === "event" ? "event id (uuid)" : "user id (uuid)"}
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="h-10 w-80 max-w-full rounded-lg border border-[color:var(--line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
        />
        {action === "grant_level" && (
          <select
            value={grant}
            onChange={(e) => setGrant(e.target.value as "3" | "revoke")}
            className="h-10 rounded-lg border border-[color:var(--line)] bg-white px-2 text-sm"
          >
            <option value="3">اعطای نگهبان (سطح ۳)</option>
            <option value="revoke">سلب اعطا</option>
          </select>
        )}
        {action === "freeze" && (
          <select
            value={freeze ? "1" : "0"}
            onChange={(e) => setFreeze(e.target.value === "1")}
            className="h-10 rounded-lg border border-[color:var(--line)] bg-white px-2 text-sm"
          >
            <option value="1">فریز</option>
            <option value="0">آزادسازی</option>
          </select>
        )}
      </div>

      <textarea
        placeholder="دلیل — اجباری، در لاگ فعالیت ثبت می‌شود"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full rounded-lg border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--lajvard)]"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !id.trim() || reason.trim().length < 3}
          onClick={run}
          className="h-10 rounded-full bg-[color:var(--text)] px-5 text-sm font-bold text-[#f6f1e8] transition disabled:opacity-40"
        >
          {pending ? "…" : "اجرا"}
        </button>
        {result && (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
            <Check size={15} /> <span dir="ltr">{result}</span>
          </span>
        )}
        {error && <span className="text-sm font-bold text-red-600">{error}</span>}
      </div>
    </div>
  );
}
