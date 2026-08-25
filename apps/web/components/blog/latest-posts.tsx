// ============================================================================
// Source: components/blog/latest-posts.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The blog was reachable from one link inside one dropdown, so nothing
//      that gets written is ever seen. Two server components put it in front
//      of people:
//        • HomeLatestPosts — the band on the home page: the latest ten
//          posts as a horizontal rail, 3–4 in view at a time (Farjad's spec,
//          24 Aug), with category chips beneath.
//        • LatestPostsStrip — three cards at the foot of every inner page
//          (business, category, city, province, job).
//      Both fetch their own rows, so a page only has to drop the tag in.
//      Both return null when there is nothing published — an empty
//      «جدیدترین مقالات» heading is the same broken promise as a search box
//      that does not search.
// Env / Identity: Server Components. Anon client; RLS shows published only.
// ============================================================================
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

import { PostCard } from "@/components/blog/post-card";
import { PostsRail } from "@/components/blog/posts-rail";
import { latestPosts, listCategories } from "@/lib/blog/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** The home page band: ten posts on a horizontal rail; absent when nothing is published. */
export async function HomeLatestPosts() {
  const supabase = await createSupabaseServerClient();
  const [posts, cats] = await Promise.all([latestPosts(supabase, 10), listCategories(supabase)]);
  if (posts.length === 0) return null;

  const catName = new Map(cats.map((c) => [c.slug, c.name]));

  return (
    <section className="relative overflow-hidden border-t border-gray-100 bg-[color:var(--bg)] px-4 py-16">
      {/* One warm wash behind the band so it reads as a different room from
          the business grids above and below it — no wallpaper, no texture. */}
      <div className="pointer-events-none absolute -top-24 right-[12%] h-72 w-72 rounded-full bg-[color:var(--annabi)]/8 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-28 left-[8%] h-72 w-72 rounded-full bg-[color:var(--lajvard)]/8 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--annabi)]/8 px-3 py-1 text-xs font-black text-[color:var(--annabi)]">
              <Newspaper className="h-3.5 w-3.5" /> وبلاگ گوپلازا
            </span>
            <h2 className="text-2xl font-black leading-tight text-[color:var(--text)] md:text-3xl">
              جدیدترین مقالات
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-gray-500">
              راهنمای عملی زندگی و کسب‌وکار ایرانی در کانادا — شهرها، مهاجرت، مناسبت‌ها و آنچه داده‌های گوپلازا می‌گویند.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-5 text-sm font-bold text-[color:var(--text)] transition hover:-translate-y-0.5 hover:border-[color:var(--annabi)]/40 hover:text-[color:var(--annabi)]"
          >
            همه‌ی مقالات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* Ten posts, 3–4 in view. Card widths: ~1.2 on a phone so the cut-off
            edge advertises that the rail scrolls, two on a tablet, four on a
            desktop 7xl container. */}
        <PostsRail>
          {posts.map((post) => (
            <div key={post.id} className="w-[78vw] shrink-0 snap-start sm:w-[340px] lg:w-[292px]">
              <PostCard post={post} categoryName={post.category_slug ? catName.get(post.category_slug) : null} className="h-full" />
            </div>
          ))}
        </PostsRail>

        {cats.length ? (
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="دسته‌های وبلاگ">
            {cats.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`/blog/category/${c.slug}`}
                className="rounded-full border border-[color:var(--line)] bg-white px-3.5 py-1.5 text-xs font-bold text-[color:var(--muted-text)] transition hover:border-[color:var(--annabi)]/40 hover:text-[color:var(--annabi)]"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Three cards at the foot of an inner page. `excludeSlug` keeps a blog post
 * from linking to itself; `category` narrows to one blog category when the
 * host page has an obvious match.
 */
export async function LatestPostsStrip({
  title = "جدیدترین مقالات",
  subtitle = "راهنماهای تازه‌ی گوپلازا برای زندگی و کسب‌وکار ایرانی در کانادا",
  limit = 3,
  excludeSlug,
  category,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  excludeSlug?: string;
  category?: string;
  className?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const [posts, cats] = await Promise.all([
    latestPosts(supabase, limit, { excludeSlug, category }),
    listCategories(supabase),
  ]);
  if (posts.length === 0) return null;

  const catName = new Map(cats.map((c) => [c.slug, c.name]));

  return (
    <section className={`border-t border-[color:var(--line)] bg-[color:var(--bg)] px-4 py-14 ${className}`} dir="rtl">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--annabi)]/8 px-3 py-1 text-[11px] font-black text-[color:var(--annabi)]">
              <Newspaper className="h-3 w-3" /> وبلاگ
            </span>
            <h2 className="text-xl font-black text-[color:var(--text)] md:text-2xl">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-[color:var(--muted-text)]">{subtitle}</p> : null}
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[color:var(--annabi)] hover:underline"
          >
            همه‌ی مقالات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} categoryName={p.category_slug ? catName.get(p.category_slug) : null} />
          ))}
        </div>
      </div>
    </section>
  );
}
