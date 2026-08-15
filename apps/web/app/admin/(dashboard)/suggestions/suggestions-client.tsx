// ============================================================================
// Source: app/admin/(dashboard)/suggestions/suggestions-client.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Interactive list — filter by status, play voice, mark read/done, note.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Eye, Mic, Smartphone, Globe, RotateCcw } from "lucide-react";

import { updateSuggestion } from "./actions";

export type SuggestionRow = {
  id: string;
  user_id: string | null;
  body: string | null;
  voice_path: string | null;
  voice_seconds: number | null;
  contact: string | null;
  source: "web" | "mobile";
  page: string | null;
  status: "new" | "read" | "done";
  admin_note: string | null;
  created_at: string;
};

type Row = SuggestionRow & { voice_url: string | null; author: { email: string | null; full_name: string | null } | null };

const fa = (n: number) => n.toLocaleString("fa-IR");
const when = (iso: string) => new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" });

export function SuggestionsClient({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<"all" | "new" | "read" | "done">("new");
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const visible = rows.filter((r) => filter === "all" || r.status === filter);
  const counts = { new: rows.filter((r) => r.status === "new").length, read: rows.filter((r) => r.status === "read").length, done: rows.filter((r) => r.status === "done").length };

  const set = (id: string, status: SuggestionRow["status"], note?: string) =>
    start(async () => {
      await updateSuggestion(id, status, note);
    });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">پیشنهادها</h1>
        <p className="text-sm text-[color:var(--muted-text)] mt-1">آنچه مردم خواسته‌اند — نوشته یا گفته. {fa(rows.length)} مورد.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["new", "read", "done", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full font-bold border transition ${filter === f ? "bg-[color:var(--text)] text-[#f6f1e8] border-transparent" : "bg-white border-[color:var(--line)] text-[color:var(--text)]"}`}>
            {f === "new" ? `جدید (${fa(counts.new)})` : f === "read" ? `خوانده‌شده (${fa(counts.read)})` : f === "done" ? `انجام‌شده (${fa(counts.done)})` : "همه"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[color:var(--line)] p-10 text-center text-[color:var(--muted-text)]">چیزی این‌جا نیست.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <li key={r.id} className={`rounded-2xl bg-white border p-4 md:p-5 ${r.status === "new" ? "border-[color:var(--annabi)]/30" : "border-[color:var(--line)]"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-text)] mb-3">
                <span className="inline-flex items-center gap-1">{r.source === "mobile" ? <Smartphone size={13} /> : <Globe size={13} />} {r.source === "mobile" ? "اپ" : "وب"}</span>
                {r.page ? <span className="font-mono" dir="ltr">{r.page}</span> : null}
                <span>·</span>
                <span>{when(r.created_at)}</span>
                {r.author ? <span>· {r.author.full_name || r.author.email}</span> : <span>· ناشناس</span>}
                {r.contact ? <span dir="ltr">· {r.contact}</span> : null}
              </div>

              {r.body ? <p className="text-[15px] leading-8 text-[color:var(--text)] whitespace-pre-wrap">{r.body}</p> : null}

              {r.voice_url ? (
                <div className="mt-3 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--annabi)]"><Mic size={14} /> صدا {r.voice_seconds ? `· ${fa(r.voice_seconds)} ثانیه` : ""}</span>
                  <audio controls preload="none" src={r.voice_url} className="h-9 flex-1 max-w-md" />
                </div>
              ) : r.voice_path ? (
                <p className="mt-3 text-xs text-[color:var(--annabi)]">فایل صدا هست ولی لینک ساخته نشد.</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  defaultValue={r.admin_note ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="یادداشت داخلی…"
                  className="flex-1 min-w-[200px] h-9 px-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] text-sm outline-none focus:bg-white"
                />
                {r.status !== "read" ? (
                  <button type="button" disabled={pending} onClick={() => set(r.id, "read", notes[r.id] ?? r.admin_note ?? undefined)} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-[color:var(--line)] text-sm font-bold"><Eye size={14} /> خوانده شد</button>
                ) : null}
                {r.status !== "done" ? (
                  <button type="button" disabled={pending} onClick={() => set(r.id, "done", notes[r.id] ?? r.admin_note ?? undefined)} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-[color:var(--success,#0f7b4f)] text-white text-sm font-bold"><Check size={14} /> انجام شد</button>
                ) : (
                  <button type="button" disabled={pending} onClick={() => set(r.id, "new", notes[r.id] ?? r.admin_note ?? undefined)} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl bg-white border border-[color:var(--line)] text-sm font-bold"><RotateCcw size={14} /> برگردان</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
