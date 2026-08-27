// ============================================================================
// Source: app/admin/(dashboard)/blog/blog-desk.tsx
// Version: 1.2.0 — 2026-08-24
// Why: Interactive desk: filter by status, publish / archive / delete, open
//      the editor, run either generator with a count, and share a published
//      post to the channels that are actually configured.
//
//      The share buttons only render for channels `configuredChannels()`
//      reported from the server, and each one shows the state stored in
//      `blog_syndications` rather than a hopeful label — a button that says
//      "منتشر شد در تلگرام" when nothing was sent is exactly the class of lie
//      the house rules forbid.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
// lucide 1.x dropped brand glyphs, so LinkedIn gets Share2 rather than a
// look-alike: a wrong logo is worse than an honest generic one.
import { Archive, Check, ExternalLink, Newspaper, Pencil, Send, Share2, Sparkles, Trash2, Undo2 } from "lucide-react";

import type { Channel } from "@/lib/blog/syndicate";
import { deletePost, runBacklog, runGenerator, runSourceGenerator, setPostStatus, sharePost } from "./actions";

export type DeskPost = {
  id: string; slug: string; title: string; title_en: string | null; status: "draft" | "review" | "published" | "archived";
  category_slug: string | null; cover_url: string | null; published_at: string | null; created_at: string;
  reading_minutes: number | null; internal_links: string[]; topic_seed: string | null; ai_model: string | null;
  source_article_id: string | null; sources: { title: string; url: string }[] | null;
};
export type DeskShare = { post_id: string; channel: Channel; status: "pending" | "sent" | "failed" | "skipped"; url: string | null; error: string | null };
export type DeskRun = { id: string; started_at: string; finished_at: string | null; requested: number; created: number; errors: unknown; notes: string | null };

const fa = (n: number) => n.toLocaleString("fa-IR");
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" }) : "—");

const CHANNEL_LABEL: Record<Channel, string> = { telegram: "تلگرام", linkedin: "لینکدین" };

export function BlogDesk({ posts, runs, categories, shares, channels, backlog, autoPublish, autoSyndicate, perDay, model, sources }: {
  posts: DeskPost[]; runs: DeskRun[]; categories: { slug: string; name: string }[];
  shares: DeskShare[]; channels: Channel[]; backlog: Record<string, number>; autoPublish: boolean; autoSyndicate: boolean; perDay: number; model: string;
  sources: { slug: string; name: string; home_url: string; enabled: boolean; unused: number }[];
}) {
  const [filter, setFilter] = useState<"review" | "published" | "all" | "archived">("review");
  const [pending, start] = useTransition();
  const [n, setN] = useState(perDay);
  const [publishNow, setPublishNow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [batch, setBatch] = useState(5);
  const catName = new Map(categories.map((c) => [c.slug, c.name]));
  const shareState = new Map(shares.map((s) => [`${s.post_id}:${s.channel}`, s]));

  const visible = posts.filter((p) => filter === "all" || p.status === filter);
  const counts = { review: posts.filter((p) => p.status === "review").length, published: posts.filter((p) => p.status === "published").length, archived: posts.filter((p) => p.status === "archived").length };

  type ActResult = {
    success?: boolean; error?: string;
    created?: unknown[]; errors?: unknown[]; skipped?: { title: string; reason: string }[]; notes?: string[];
    outcomes?: { channel: Channel; status: string; error?: string }[];
    backlog?: { channel: Channel; sent: number; failed: number; remaining: number; stoppedBecause?: string };
  };
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      setMsg(null);
      const r = (await fn()) as ActResult | undefined;
      if (!r) return;
      if (r.success === false) { setMsg(r.error ?? "خطا"); return; }
      if (r.backlog) {
        const b = r.backlog;
        setMsg(`${CHANNEL_LABEL[b.channel]}: ${fa(b.sent)} فرستاده شد، ${fa(b.remaining)} باقی مانده${b.stoppedBecause ? ` — متوقف شد: ${b.stoppedBecause}` : ""}.`);
        return;
      }
      if (r.outcomes) {
        setMsg(r.outcomes.map((o) => `${CHANNEL_LABEL[o.channel]}: ${o.status === "sent" ? "ارسال شد" : o.status === "skipped" ? `رد شد (${o.error ?? "تنظیم نشده"})` : `خطا (${o.error ?? ""})`}`).join(" · "));
        return;
      }
      if (r.created) {
        const bits = [`${(r.created as unknown[]).length} نوشته ساخته شد`];
        if (r.skipped?.length) bits.push(`${r.skipped.length} کنار گذاشته شد`);
        if (r.errors?.length) bits.push(`${(r.errors as unknown[]).length} خطا`);
        if (r.notes?.length) bits.push(r.notes.join(" · "));
        setMsg(`${bits.join("، ")}.`);
      }
    });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[color:var(--text)]">وبلاگ</h1>
          <p className="mt-1 text-sm text-[color:var(--muted-text)]">مدل: <span dir="ltr">{model}</span> · روزی {fa(perDay)} · انتشار خودکار: {autoPublish ? "روشن" : "خاموش (صف بازبینی)"} · هم‌رسانی خودکار: {autoSyndicate && channels.length ? `روشن (${channels.map((c) => CHANNEL_LABEL[c]).join("، ")})` : "خاموش"}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--line)] bg-white p-2">
          <input type="number" min={1} max={10} value={n} onChange={(e) => setN(Number(e.target.value))} className="h-9 w-16 rounded-lg border border-[color:var(--line)] px-2 text-center text-sm" aria-label="تعداد" />
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} /> انتشار مستقیم</label>
          <button type="button" disabled={pending} onClick={() => act(() => runGenerator(n, publishNow))} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--annabi)] px-4 text-sm font-bold text-[#f6f1e8] disabled:opacity-50" title="موضوع را از داده‌های خود پلازا برمی‌دارد">
            <Sparkles size={15} /> {pending ? "در حال نوشتن…" : "از داده‌ها بنویس"}
          </button>
          <button type="button" disabled={pending} onClick={() => act(() => runSourceGenerator(n, publishNow))} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[color:var(--lajvard)] px-4 text-sm font-bold text-[#f6f1e8] disabled:opacity-50" title="موضوع تازه را از منابع خارجی برمی‌دارد؛ اگر تازه کم بود، از آرشیو">
            <Newspaper size={15} /> {pending ? "در حال نوشتن…" : "از منابع بنویس"}
          </button>
        </div>
      </div>
      {msg ? <p className="rounded-xl bg-[color:var(--gold)]/15 px-4 py-2 text-sm font-bold text-[color:var(--text)]">{msg}</p> : null}

      <div className="flex flex-wrap gap-2 text-sm">
        {(["review", "published", "archived", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 font-bold ${filter === f ? "border-transparent bg-[color:var(--text)] text-[#f6f1e8]" : "border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>
            {f === "review" ? `در بازبینی (${fa(counts.review)})` : f === "published" ? `منتشرشده (${fa(counts.published)})` : f === "archived" ? `بایگانی (${fa(counts.archived)})` : "همه"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-10 text-center text-[color:var(--muted-text)]">چیزی این‌جا نیست.</div>
      ) : (
        <ul className="space-y-3">
          {visible.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4 md:flex-row md:items-center">
              <div className="h-20 w-32 flex-none overflow-hidden rounded-xl bg-[color:var(--bg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.cover_url ? <img loading="lazy" decoding="async" src={p.cover_url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--muted-text)]">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : p.status === "review" ? "bg-[color:var(--gold)]/20 text-[color:var(--text)]" : "bg-gray-100"}`}>{p.status}</span>
                  {p.category_slug ? <span>{catName.get(p.category_slug) ?? p.category_slug}</span> : null}
                  <span>· {when(p.published_at ?? p.created_at)}</span>
                  <span>· {fa(p.internal_links?.length ?? 0)} لینک داخلی</span>
                  {p.ai_model ? <span dir="ltr">· {p.ai_model}</span> : null}
                  {p.sources?.length ? (
                    <a href={p.sources[0].url} target="_blank" rel="noreferrer nofollow" className="rounded-full bg-[color:var(--lajvard)]/10 px-2 py-0.5 font-bold text-[color:var(--lajvard)]" title={p.sources[0].title}>منبع موضوع</a>
                  ) : null}
                </div>
                <h2 className="mt-1 truncate font-black text-[color:var(--text)]">{p.title}</h2>
                {p.title_en ? <p className="truncate text-xs text-[color:var(--muted-text)]" dir="ltr">{p.title_en}</p> : null}
                {p.topic_seed ? <p className="mt-1 line-clamp-1 text-[11px] text-[color:var(--muted-text)]">چرا: {p.topic_seed}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/admin/blog/${p.id}`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><Pencil size={14} /> ویرایش</Link>
                {p.status === "published" ? (
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><ExternalLink size={14} /> مشاهده</a>
                ) : (
                  <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(p.id, "published"))} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[color:var(--success,#0f7b4f)] px-3 text-sm font-bold text-white"><Check size={14} /> انتشار</button>
                )}
                {p.status !== "archived" ? (
                  <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(p.id, "archived"))} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><Archive size={14} /> بایگانی</button>
                ) : (
                  <button type="button" disabled={pending} onClick={() => act(() => setPostStatus(p.id, "review"))} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><Undo2 size={14} /> برگردان</button>
                )}
                {p.status === "published" && channels.length
                  ? channels.map((ch) => {
                      const st = shareState.get(`${p.id}:${ch}`);
                      const sent = st?.status === "sent";
                      const Icon = ch === "telegram" ? Send : Share2;
                      return sent && st?.url ? (
                        <a key={ch} href={st.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-bold text-emerald-700" title={`در ${CHANNEL_LABEL[ch]} منتشر شده`}>
                          <Icon size={14} /> {CHANNEL_LABEL[ch]}
                        </a>
                      ) : (
                        <button key={ch} type="button" disabled={pending || sent} onClick={() => act(() => sharePost(p.id, [ch]))} title={st?.error ?? undefined}
                          className={`inline-flex h-9 items-center gap-1 rounded-xl border px-3 text-sm font-bold ${sent ? "border-emerald-200 bg-emerald-50 text-emerald-700" : st?.status === "failed" ? "border-[color:var(--annabi)] bg-white text-[color:var(--annabi)]" : "border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>
                          <Icon size={14} /> {sent ? CHANNEL_LABEL[ch] : st?.status === "failed" ? `${CHANNEL_LABEL[ch]}: دوباره` : CHANNEL_LABEL[ch]}
                        </button>
                      );
                    })
                  : null}
                <button type="button" disabled={pending} onClick={() => { if (confirm("حذف کامل این نوشته؟")) act(() => deletePost(p.id)); }} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold text-[color:var(--annabi)]"><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {channels.length ? (
        <section>
          <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">هم‌رسانی</h2>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <label className="flex items-center gap-2 text-xs font-bold">
              هر بار
              <input type="number" min={1} max={40} value={batch} onChange={(e) => setBatch(Number(e.target.value))} className="h-9 w-16 rounded-lg border border-[color:var(--line)] px-2 text-center text-sm" />
              نوشته
            </label>
            {channels.map((ch) => {
              const left = backlog[ch] ?? 0;
              return (
                <button key={ch} type="button" disabled={pending || left === 0} onClick={() => act(() => runBacklog(ch, batch))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--line)] bg-white px-4 text-sm font-bold text-[color:var(--text)] disabled:opacity-40">
                  {ch === "telegram" ? <Send size={14} /> : <Share2 size={14} />}
                  {CHANNEL_LABEL[ch]} — {left === 0 ? "چیزی باقی نمانده" : `${fa(left)} منتشرنشده`}
                </button>
              );
            })}
            <p className="w-full text-xs text-[color:var(--muted-text)]">بین هر ارسال ۳٫۵ ثانیه فاصله می‌افتد، پس یک دستهٔ ده‌تایی حدود نیم دقیقه طول می‌کشد. با اولین خطا متوقف می‌شود.</p>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">منابع موضوع</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {sources.map((src) => (
            <li key={src.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <div className="min-w-0">
                <p className="font-black text-[color:var(--text)]">{src.name}</p>
                <a href={src.home_url} target="_blank" rel="noreferrer nofollow" className="text-xs text-[color:var(--muted-text)]" dir="ltr">{src.home_url}</a>
              </div>
              <div className="flex-none text-left text-xs text-[color:var(--muted-text)]">
                <p className="font-bold text-[color:var(--text)]">{fa(src.unused)} مقاله‌ی استفاده‌نشده</p>
                <p>{src.enabled ? "فعال" : "خاموش"}</p>
              </div>
            </li>
          ))}
          {sources.length === 0 ? <li className="rounded-2xl border border-[color:var(--line)] bg-white p-4 text-sm text-[color:var(--muted-text)]">منبعی ثبت نشده.</li> : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">اجراهای اخیر</h2>
        <div className="overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--bg)] text-xs text-[color:var(--muted-text)]"><tr><th className="p-3 text-right">شروع</th><th className="p-3 text-right">درخواست</th><th className="p-3 text-right">ساخته‌شده</th><th className="p-3 text-right">یادداشت</th><th className="p-3 text-right">خطا</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--line)]">
                  <td className="p-3">{when(r.started_at)}</td><td className="p-3">{fa(r.requested)}</td><td className="p-3">{fa(r.created)}</td>
                  <td className="p-3 text-xs text-[color:var(--muted-text)]">{r.notes ?? ""}</td>
                  <td className="p-3 text-xs text-[color:var(--annabi)]" dir="ltr">{r.errors ? JSON.stringify(r.errors).slice(0, 160) : ""}</td>
                </tr>
              ))}
              {runs.length === 0 ? <tr><td className="p-3 text-[color:var(--muted-text)]" colSpan={5}>هنوز اجرایی نبوده.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
