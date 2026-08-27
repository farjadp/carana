// ============================================================================
// Source: components/blog/post-card.tsx
// Version: 1.0.0 — 2026-08-16
// Why: One card for every post list (index, category, related).
// ============================================================================
import Link from "next/link";
import { Clock } from "lucide-react";

import { fmtDate, type PostCard as PostCardData } from "@/lib/blog/queries";
import { faNumber as fa } from "@goplaza/core";


export function PostCard({ post, categoryName, featured = false, className = "" }: { post: PostCardData; categoryName?: string | null; featured?: boolean; className?: string }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex flex-col overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(20,33,61,0.10)] ${featured ? "md:col-span-2 md:flex-row" : ""} ${className}`}
    >
      <div className={`relative overflow-hidden bg-[color:var(--bg)] ${featured ? "aspect-[16/9] md:aspect-auto md:w-1/2" : "aspect-[16/9]"}`}>
        {post.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_url} alt={post.cover_alt ?? ""} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading={featured ? "eager" : "lazy"} />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(122,24,49,0.12),rgba(0,71,171,0.12))]" />
        )}
      </div>
      <div className={`flex flex-1 flex-col p-5 ${featured ? "md:p-8" : ""}`}>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[color:var(--muted-text)]">
          {categoryName ? <span className="rounded-full bg-[color:var(--annabi)]/8 px-2.5 py-1 text-[color:var(--annabi)]">{categoryName}</span> : null}
          <span>{fmtDate(post.published_at)}</span>
          {post.reading_minutes ? <span className="inline-flex items-center gap-1"><Clock size={11} /> {fa(post.reading_minutes)} دقیقه</span> : null}
        </div>
        <h3 className={`font-black leading-snug text-[color:var(--text)] ${featured ? "text-2xl md:text-3xl" : "text-lg"}`}>{post.title}</h3>
        {post.excerpt ? <p className={`mt-2 text-sm leading-7 text-[color:var(--muted-text)] ${featured ? "" : "line-clamp-3"}`}>{post.excerpt}</p> : null}
        {post.title_en ? <p className="mt-auto pt-3 text-[11px] text-[color:var(--muted-text)]/80" dir="ltr">{post.title_en}</p> : null}
      </div>
    </Link>
  );
}
