// ============================================================================
// Source: app/admin/(dashboard)/blog/snippet-queue.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The daily Telegram cards — what is queued, what went out, and what the
//      writer refused to send.
//
//      The refused ones are shown on purpose. A card is thrown away when it
//      invents a number that is not in its source article, and "the writer
//      keeps making up figures about this post" is something an admin should
//      be able to read rather than infer from an empty channel.
//
//      A sent card is not editable. Editing the row would not change the
//      message in Telegram; it would only make the record disagree with what
//      subscribers actually saw.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Archive, Pencil, Send, Sparkles } from "lucide-react";

import { archiveSnippet, runSnippets, saveSnippet, sendSnippetNow } from "./actions";

export type DeskSnippet = {
  id: string;
  kind: string;
  hook: string;
  body: string;
  tags: string[];
  status: "ready" | "sent" | "failed" | "skipped" | "archived";
  url: string | null;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  blog_posts: { slug: string; title: string } | null;
};

const KIND_FA: Record<string, string> = {
  stat: "📊 آمار جالب",
  fun_fact: "💡 دانستنی",
  tip: "🧭 نکتهٔ عملی",
  comparison: "⚖️ مقایسه",
  mistake: "⚠️ اشتباه رایج",
  question: "❓ پرسش و پاسخ",
  news: "📰 خبر",
};

const fa = (n: number) => n.toLocaleString("fa-IR");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function SnippetQueue({ snippets, telegramOn }: { snippets: DeskSnippet[]; telegramOn: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ hook: "", body: "" });
  const [tab, setTab] = useState<"ready" | "sent" | "skipped">("ready");

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      setMsg(null);
      const r = (await fn()) as {
        success?: boolean;
        error?: string;
        outcomes?: { status: string; error?: string; url?: string }[];
        snippets?: { created: unknown[]; sent: unknown[]; skipped: { reason: string }[]; errors: string[] };
      };
      if (r?.success === false) return setMsg(r.error ?? "خطا");
      if (r?.outcomes) {
        const o = r.outcomes[0];
        return setMsg(o.status === "sent" ? "در کانال منتشر شد." : `${o.status}: ${o.error ?? ""}`);
      }
      if (r?.snippets) {
        const s = r.snippets;
        const bits = [`${fa(s.created.length)} کارت نوشته شد`];
        if (s.sent.length) bits.push(`${fa(s.sent.length)} منتشر شد`);
        if (s.skipped.length) bits.push(`${fa(s.skipped.length)} رد شد (${s.skipped[0].reason})`);
        if (s.errors.length) bits.push(s.errors[0]);
        setMsg(`${bits.join("، ")}.`);
      }
    });

  const visible = snippets.filter((s) => (tab === "ready" ? s.status === "ready" : tab === "sent" ? s.status === "sent" : s.status === "skipped" || s.status === "failed"));
  const counts = {
    ready: snippets.filter((s) => s.status === "ready").length,
    sent: snippets.filter((s) => s.status === "sent").length,
    skipped: snippets.filter((s) => s.status === "skipped" || s.status === "failed").length,
  };

  return (
    <section dir="rtl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[color:var(--text)]">کارت‌های روزانهٔ تلگرام</h2>
          <p className="text-xs text-[color:var(--muted-text)]">
            هر کارت از دل یک مقالهٔ منتشرشده در می‌آید. کارتی که عددی بیاورد که در آن مقاله نیست، فرستاده نمی‌شود.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={() => act(() => runSnippets(1, false))}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold disabled:opacity-50">
            <Sparkles size={14} /> بنویس (بدون ارسال)
          </button>
          <button type="button" disabled={pending || !telegramOn} onClick={() => act(() => runSnippets(1, true))}
            title={telegramOn ? undefined : "تلگرام تنظیم نشده"}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--lajvard)] px-4 text-sm font-bold text-[#f6f1e8] disabled:opacity-50">
            <Send size={14} /> بنویس و بفرست
          </button>
        </div>
      </div>
      {msg ? <p className="mb-3 rounded-xl bg-[color:var(--gold)]/15 px-4 py-2 text-sm font-bold text-[color:var(--text)]">{msg}</p> : null}

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {([["ready", `در صف (${fa(counts.ready)})`], ["sent", `منتشرشده (${fa(counts.sent)})`], ["skipped", `ردشده (${fa(counts.skipped)})`]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`rounded-full border px-3 py-1.5 font-bold ${tab === k ? "border-transparent bg-[color:var(--text)] text-[#f6f1e8]" : "border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-8 text-center text-sm text-[color:var(--muted-text)]">چیزی این‌جا نیست.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((s) => (
            <li key={s.id} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--muted-text)]">
                <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 font-bold text-[color:var(--text)]">{KIND_FA[s.kind] ?? s.kind}</span>
                <span>{when(s.sent_at ?? s.created_at)}</span>
                {s.blog_posts ? <span className="truncate">· از «{s.blog_posts.title}»</span> : null}
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="font-bold text-[color:var(--lajvard)]">در کانال</a> : null}
              </div>

              {editing === s.id ? (
                <div className="space-y-2">
                  <input value={draft.hook} onChange={(e) => setDraft((d) => ({ ...d, hook: e.target.value }))}
                    className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm font-bold" placeholder="خط اول" />
                  <textarea value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={4}
                    className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm leading-7" placeholder="متن" />
                  <div className="flex gap-2">
                    <button type="button" disabled={pending} onClick={() => act(async () => { const r = await saveSnippet(s.id, draft); setEditing(null); return r; })}
                      className="h-9 rounded-xl bg-[color:var(--annabi)] px-4 text-sm font-bold text-[#f6f1e8]">ذخیره</button>
                    <button type="button" onClick={() => setEditing(null)} className="h-9 rounded-xl border border-[color:var(--line)] px-4 text-sm font-bold">انصراف</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-black text-[color:var(--text)]">{s.hook}</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-7 text-[color:var(--text)]/85">{s.body}</p>
                  {s.tags?.length ? <p className="mt-2 text-xs text-[color:var(--muted-text)]">{s.tags.map((t) => `#${t.replace(/\s+/g, "_")}`).join(" ")}</p> : null}
                  {s.error ? <p className="mt-2 rounded-lg bg-[color:var(--annabi)]/10 px-3 py-1.5 text-xs text-[color:var(--annabi)]">{s.error}</p> : null}
                </>
              )}

              {s.status === "ready" && editing !== s.id ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" disabled={pending || !telegramOn} onClick={() => act(() => sendSnippetNow(s.id))}
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-[color:var(--lajvard)] px-3 text-sm font-bold text-[#f6f1e8] disabled:opacity-50"><Send size={14} /> انتشار</button>
                  <button type="button" onClick={() => { setEditing(s.id); setDraft({ hook: s.hook, body: s.body }); }}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] px-3 text-sm font-bold"><Pencil size={14} /> ویرایش</button>
                  <button type="button" disabled={pending} onClick={() => act(() => archiveSnippet(s.id))}
                    className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] px-3 text-sm font-bold"><Archive size={14} /> بایگانی</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
