// ============================================================================
// Source: app/blog/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Blog index — newest first, category chips, pager. Persian-first with
//      an English title line per card for the AI readers.
// Env / Identity: Public. Revalidates every 10 min (posts land daily).
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Rss } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/blog/post-card";
import { listCategories, listPosts } from "@/lib/blog/queries";
import { breadcrumbLd } from "@/lib/seo/local";
import { collectionLd } from "@/lib/seo/entity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "وبلاگ پلازا — راهنماها، شهرها، کسب‌وکار ایرانی در کانادا",
  description: "راهنماهای عملی برای ایرانیان کانادا، زندگی در شهرها، مناسبت‌ها، کسب‌وکار و آنچه داده‌های پلازا می‌گویند.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/blog/feed.xml" } },
};

const fa = (n: number) => n.toLocaleString("fa-IR");

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const supabase = await createSupabaseServerClient();
  const [cats, { posts, total, perPage }] = await Promise.all([listCategories(supabase), listPosts(supabase, { page })]);
  const catName = new Map(cats.map((c) => [c.slug, c.name]));
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <PageShell currentPath="/blog" currentSection="brand">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "وبلاگ", url: "/blog" }])} />
      {posts.length ? (
        <JsonLd
          data={collectionLd({
            name: "وبلاگ پلازا",
            path: "/blog",
            total,
            items: posts.map((p) => ({ name: p.title as string, path: `/blog/${p.slug}` })),
          })}
        />
      ) : null}
      <main className="min-h-screen bg-[color:var(--bg)]">
        <section className="mx-auto max-w-7xl px-4 pt-10 md:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]">وبلاگ</p>
              <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">چیزهایی که خودمان می‌خواستیم بدانیم.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)] md:text-base">
                راهنماهای عملی، شهرها، مناسبت‌ها، کسب‌وکار — و آنچه عددهای پلازا درباره‌ی ایرانیان کانادا می‌گویند. {total ? `${fa(total)} نوشته.` : ""}
              </p>
            </div>
            <Link href="/blog/feed.xml" className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)] hover:text-[color:var(--annabi)]"><Rss size={14} /> RSS</Link>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="دسته‌ها">
            <span className="rounded-full bg-[color:var(--text)] px-4 py-2 text-sm font-bold text-[#f6f1e8]">همه</span>
            {cats.map((c) => (
              <Link key={c.slug} href={`/blog/category/${c.slug}`} className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--text)] transition hover:border-[color:var(--annabi)]/40 hover:text-[color:var(--annabi)]">
                {c.name}
              </Link>
            ))}
          </nav>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10">
          {posts.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <PostCard key={p.id} post={p} categoryName={p.category_slug ? catName.get(p.category_slug) : null} featured={page === 1 && i === 0} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[color:var(--line)] p-12 text-center text-[color:var(--muted-text)]">اولین نوشته‌ها در راه‌اند.</div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-10 flex items-center justify-center gap-2 text-sm" aria-label="صفحه‌بندی">
              {page > 1 ? <Link href={`/blog?page=${page - 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">قبلی</Link> : null}
              <span className="text-[color:var(--muted-text)]">صفحه‌ی {fa(page)} از {fa(totalPages)}</span>
              {page < totalPages ? <Link href={`/blog?page=${page + 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">بعدی</Link> : null}
            </nav>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}
