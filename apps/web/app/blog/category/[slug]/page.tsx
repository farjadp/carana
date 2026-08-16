// ============================================================================
// Source: app/blog/category/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: One blog category — same list, scoped.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/blog/post-card";
import { listCategories, listPosts } from "@/lib/blog/queries";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 600;
const fa = (n: number) => n.toLocaleString("fa-IR");

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cats = await listCategories(await createSupabaseServerClient());
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return { title: "دسته پیدا نشد" };
  return { title: `${cat.name} | وبلاگ چارانا`, description: cat.description ?? undefined, alternates: { canonical: `/blog/category/${slug}` } };
}

export default async function BlogCategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const supabase = await createSupabaseServerClient();
  const cats = await listCategories(supabase);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();
  const { posts, total, perPage } = await listPosts(supabase, { category: slug, page });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <PageShell currentPath={`/blog/category/${slug}`} currentSection="brand">
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "وبلاگ", url: "/blog" }, { name: cat.name, url: `/blog/category/${slug}` }])} />
      <main className="min-h-screen bg-[color:var(--bg)]">
        <section className="mx-auto max-w-7xl px-4 pt-10 md:pt-14">
          <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--annabi)]"><Link href="/blog">وبلاگ</Link> / {cat.name_en}</p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)] md:text-5xl">{cat.name}</h1>
          {cat.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted-text)] md:text-base">{cat.description}</p> : null}
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="دسته‌ها">
            <Link href="/blog" className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--text)]">همه</Link>
            {cats.map((c) => (
              <Link key={c.slug} href={`/blog/category/${c.slug}`} className={`rounded-full px-4 py-2 text-sm font-bold ${c.slug === slug ? "bg-[color:var(--text)] text-[#f6f1e8]" : "border border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>{c.name}</Link>
            ))}
          </nav>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10">
          {posts.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => <PostCard key={p.id} post={p} categoryName={cat.name} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[color:var(--line)] p-12 text-center text-[color:var(--muted-text)]">هنوز نوشته‌ای در این دسته نیست.</div>
          )}
          {totalPages > 1 ? (
            <nav className="mt-10 flex items-center justify-center gap-2 text-sm" aria-label="صفحه‌بندی">
              {page > 1 ? <Link href={`/blog/category/${slug}?page=${page - 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">قبلی</Link> : null}
              <span className="text-[color:var(--muted-text)]">صفحه‌ی {fa(page)} از {fa(totalPages)}</span>
              {page < totalPages ? <Link href={`/blog/category/${slug}?page=${page + 1}`} className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1.5 font-bold">بعدی</Link> : null}
            </nav>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}
