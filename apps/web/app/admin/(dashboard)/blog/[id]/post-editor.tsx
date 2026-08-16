// ============================================================================
// Source: app/admin/(dashboard)/blog/[id]/post-editor.tsx
// Version: 1.0.0 — 2026-08-16
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Check, Save } from "lucide-react";

import { savePost, setPostStatus } from "../actions";

type Post = {
  id: string; slug: string; status: string; title: string; title_en: string | null; excerpt: string | null; summary_en: string | null;
  body_md: string; category_slug: string | null; tags: string[]; cover_url: string | null; cover_alt: string | null; admin_note: string | null;
  topic_seed: string | null; internal_links: string[]; faq: { q: string; a: string }[] | null;
};

export function PostEditor({ post, categories }: { post: Post; categories: { slug: string; name: string }[] }) {
  const [f, setF] = useState({
    title: post.title, title_en: post.title_en ?? "", excerpt: post.excerpt ?? "", summary_en: post.summary_en ?? "",
    body_md: post.body_md, category_slug: post.category_slug ?? "", tags: post.tags.join("، "), cover_url: post.cover_url ?? "",
    cover_alt: post.cover_alt ?? "", admin_note: post.admin_note ?? "",
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = () => start(async () => { const r = await savePost(post.id, f); setMsg(r.success ? "ذخیره شد." : r.error ?? "خطا"); });
  const publish = () => start(async () => { await savePost(post.id, f); const r = await setPostStatus(post.id, "published"); setMsg(r.success ? "منتشر شد." : r.error ?? "خطا"); });

  const inp = "w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[color:var(--annabi)]/40";

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/blog" className="inline-flex items-center gap-1 text-sm font-bold text-[color:var(--muted-text)]"><ArrowRight size={14} /> وبلاگ</Link>
          <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-xs font-bold">{post.status}</span>
          <span className="text-xs text-[color:var(--muted-text)]" dir="ltr">/blog/{post.slug}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPreview((v) => !v)} className="h-9 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold">{preview ? "پنهان‌کردن پیش‌نمایش" : "پیش‌نمایش"}</button>
          <button type="button" disabled={pending} onClick={save} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold"><Save size={14} /> ذخیره</button>
          {post.status !== "published" ? <button type="button" disabled={pending} onClick={publish} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[color:var(--success,#0f7b4f)] px-3 text-sm font-bold text-white"><Check size={14} /> ذخیره و انتشار</button> : null}
        </div>
      </div>
      {msg ? <p className="rounded-xl bg-[color:var(--gold)]/15 px-4 py-2 text-sm font-bold">{msg}</p> : null}
      {post.topic_seed ? <p className="text-xs text-[color:var(--muted-text)]">چرا این موضوع: {post.topic_seed}</p> : null}

      <div className={`grid grid-cols-1 gap-6 ${preview ? "lg:grid-cols-2" : ""}`}>
        <div className="space-y-3">
          <label className="block text-xs font-bold">عنوان<input className={inp} value={f.title} onChange={set("title")} /></label>
          <label className="block text-xs font-bold">English title<input className={inp} dir="ltr" value={f.title_en} onChange={set("title_en")} /></label>
          <label className="block text-xs font-bold">خلاصه<textarea className={inp} rows={2} value={f.excerpt} onChange={set("excerpt")} /></label>
          <label className="block text-xs font-bold">English summary (quoted by AI)<textarea className={inp} dir="ltr" rows={3} value={f.summary_en} onChange={set("summary_en")} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold">دسته<select className={inp} value={f.category_slug} onChange={set("category_slug")}><option value="">—</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
            <label className="block text-xs font-bold">برچسب‌ها (با ، جدا)<input className={inp} value={f.tags} onChange={set("tags")} /></label>
          </div>
          <label className="block text-xs font-bold">کاور URL<input className={inp} dir="ltr" value={f.cover_url} onChange={set("cover_url")} /></label>
          {f.cover_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={f.cover_url} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
          <label className="block text-xs font-bold">کاور alt<input className={inp} value={f.cover_alt} onChange={set("cover_alt")} /></label>
          <label className="block text-xs font-bold">متن (Markdown)<textarea className={`${inp} font-mono text-[13px] leading-6`} rows={28} value={f.body_md} onChange={set("body_md")} /></label>
          <label className="block text-xs font-bold">یادداشت داخلی<input className={inp} value={f.admin_note} onChange={set("admin_note")} /></label>
          {post.internal_links?.length ? <p className="text-xs text-[color:var(--muted-text)]">لینک‌های داخلی تأییدشده: <span dir="ltr">{post.internal_links.join(" · ")}</span></p> : null}
        </div>
        {preview ? (
          <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--bg)] p-6">
            <h1 className="mb-4 text-2xl font-black text-[color:var(--text)]">{f.title}</h1>
            <div className="prose-fa"><ReactMarkdown remarkPlugins={[remarkGfm]}>{f.body_md}</ReactMarkdown></div>
            {post.faq?.length ? <div className="mt-6 space-y-2">{post.faq.map((q) => <details key={q.q} className="rounded-xl bg-white px-4 py-2"><summary className="cursor-pointer font-bold">{q.q}</summary><p className="pt-2 text-sm leading-7">{q.a}</p></details>)}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
