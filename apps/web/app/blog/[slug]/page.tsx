// ============================================================================
// Source: app/blog/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-16
// Why: One post. Markdown body (GFM), FAQ block mirrored as FAQPage LD,
//      Article LD with the English title as alternateName and summary_en as
//      the abstract, related posts, and the "بعدش چه کار کنم" doors into the
//      directory. Internal links inside the body are plain markdown links.
// Env / Identity: Public. Revalidates every 10 min.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Clock } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/blog/post-card";
import { SuggestionBox } from "@/components/suggestion-box";
import { fmtDate, getPost, listCategories, relatedPosts } from "@/lib/blog/queries";
import { SITE, breadcrumbLd, faqLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 600;
const fa = (n: number) => n.toLocaleString("fa-IR");

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(await createSupabaseServerClient(), slug);
  if (!post) return { title: "نوشته پیدا نشد" };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      url: `/blog/${post.slug}`,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      locale: "fa_IR",
      alternateLocale: ["en_CA"],
    },
    other: post.title_en ? { "article:title:en": post.title_en } : undefined,
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const post = await getPost(supabase, slug);
  if (!post) notFound();
  const [cats, related] = await Promise.all([listCategories(supabase), relatedPosts(supabase, post)]);
  const cat = cats.find((c) => c.slug === post.category_slug) ?? null;
  const path = `/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE}${path}`,
    mainEntityOfPage: `${SITE}${path}`,
    headline: post.title,
    alternativeHeadline: post.title_en ?? undefined,
    abstract: post.summary_en ?? undefined,
    description: post.excerpt ?? undefined,
    image: post.cover_url ? [post.cover_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    inLanguage: "fa-IR",
    author: { "@type": "Organization", name: "čārana", url: SITE },
    publisher: { "@type": "Organization", name: "čārana", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/brand/charana-mark-primary.svg` } },
    articleSection: cat?.name_en ?? undefined,
    keywords: post.tags.join(", "),
    wordCount: post.body_md.split(/\s+/).length,
  };

  return (
    <PageShell currentPath={path} currentSection="brand">
      <JsonLd data={[articleLd, breadcrumbLd([{ name: "خانه", url: "/" }, { name: "وبلاگ", url: "/blog" }, ...(cat ? [{ name: cat.name, url: `/blog/category/${cat.slug}` }] : []), { name: post.title, url: path }]), ...(post.faq?.length ? [faqLd(post.faq)] : [])]} />
      <main className="min-h-screen bg-[color:var(--bg)]">
        <article className="mx-auto max-w-3xl px-4 pt-10 md:pt-14">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted-text)]" aria-label="مسیر">
            <Link href="/blog" className="hover:text-[color:var(--annabi)]">وبلاگ</Link>
            {cat ? <><span>/</span><Link href={`/blog/category/${cat.slug}`} className="hover:text-[color:var(--annabi)]">{cat.name}</Link></> : null}
          </nav>
          <h1 className="text-3xl font-black leading-[1.3] text-[color:var(--text)] md:text-5xl md:leading-[1.25]">{post.title}</h1>
          {post.title_en ? <p className="mt-2 font-latin text-sm text-[color:var(--muted-text)]" dir="ltr">{post.title_en}</p> : null}
          {post.excerpt ? <p className="mt-4 text-lg leading-8 text-[color:var(--text)]/85">{post.excerpt}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted-text)]">
            <span className="font-bold text-[color:var(--text)]">{post.author_name}</span>
            <span>·</span>
            <time dateTime={post.published_at ?? undefined}>{fmtDate(post.published_at)}</time>
            {post.reading_minutes ? <><span>·</span><span className="inline-flex items-center gap-1"><Clock size={12} /> {fa(post.reading_minutes)} دقیقه</span></> : null}
          </div>

          {post.cover_url ? (
            <figure className="mt-8 overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.cover_url} alt={post.cover_alt ?? ""} className="aspect-[16/9] w-full object-cover" />
            </figure>
          ) : null}

          {/* English abstract — the block an answer engine quotes. Visible, not hidden. */}
          {post.summary_en ? (
            <aside className="mt-8 rounded-2xl border border-[color:var(--line)] bg-white p-4 text-sm leading-7 text-[color:var(--muted-text)]" dir="ltr" lang="en">
              <strong className="mb-1 block font-latin text-[11px] uppercase tracking-wide text-[color:var(--annabi)]">In English</strong>
              <span className="font-latin">{post.summary_en}</span>
            </aside>
          ) : null}

          <div className="prose-fa mt-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_md}</ReactMarkdown>
          </div>

          {post.faq?.length ? (
            <section className="mt-12" aria-labelledby="faq-h">
              <h2 id="faq-h" className="mb-4 text-xl font-black text-[color:var(--text)]">پرسش‌های رایج</h2>
              <div className="divide-y divide-[color:var(--line)] rounded-3xl border border-[color:var(--line)] bg-white">
                {post.faq.map((f) => (
                  <details key={f.q} className="group px-5">
                    <summary className="cursor-pointer list-none py-4 font-bold text-[color:var(--text)]">{f.q}</summary>
                    <p className="-mt-1 pb-5 text-sm leading-8 text-[color:var(--text)]/80">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {post.tags.length ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((t) => <span key={t} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[color:var(--muted-text)]">#{t}</span>)}
            </div>
          ) : null}

          <div className="mt-12 rounded-3xl bg-[color:var(--annabi)] p-6 text-[#f6f1e8] md:p-8">
            <h2 className="text-xl font-black">دنبال کسب‌وکار ایرانی می‌گردی؟</h2>
            <p className="mt-1 text-sm text-[#f6f1e8]/80">جستجوی چارانا فارسی و انگلیسی را می‌فهمد — حتی با کیبورد اشتباه.</p>
            <form action="/search" method="get" className="mt-4 flex gap-2">
              <input name="q" placeholder="مثلاً دندان‌پزشک، رستوران، ریچموندهیل…" className="h-11 flex-1 rounded-full bg-white px-4 text-sm text-[color:var(--text)] outline-none" aria-label="جستجو" />
              <button type="submit" className="h-11 rounded-full bg-[#14213d] px-5 text-sm font-bold text-[#f6f1e8]">جستجو</button>
            </form>
          </div>

          <div className="mt-10">
            <SuggestionBox page={path} compact title="درباره‌ی این موضوع سؤالی داری؟" hint="بپرس یا بگو چه چیزی کم بود — نوشته‌ی بعدی را همین‌ها می‌سازند." />
          </div>
        </article>

        {related.length ? (
          <section className="mx-auto max-w-7xl px-4 py-14" aria-labelledby="rel-h">
            <div className="mb-5 flex items-end justify-between">
              <h2 id="rel-h" className="text-xl font-black text-[color:var(--text)]">بیشتر از {cat?.name ?? "وبلاگ"}</h2>
              <Link href={cat ? `/blog/category/${cat.slug}` : "/blog"} className="inline-flex items-center gap-1 text-sm font-bold text-[color:var(--lajvard)]">همه <ArrowLeft size={14} /></Link>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {related.map((p) => <PostCard key={p.id} post={p} categoryName={cat?.name} />)}
            </div>
          </section>
        ) : <div className="h-10" />}
      </main>
    </PageShell>
  );
}
