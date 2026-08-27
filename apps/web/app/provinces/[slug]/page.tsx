// ============================================================================
// Source: app/provinces/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-23
// Why: One province: its cities, and the listings inside it.
// Env / Identity: Public read. Column list is explicit — Postgres does not
//      apply RLS per column, so select("*") would expose verification fields.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getGeoIndex, isIndexable, provinceCount } from "@/lib/seo/geo-index";

import { PUBLIC_STATUSES, getProvinceBySlug, PROVINCES } from "@goplaza/core";
import { InnerPage } from "@/components/inner-page";
import { getProvinceSummary } from "@/lib/data/geography";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LatestPostsStrip } from "@/components/blog/latest-posts";

export const revalidate = 3600;

const CARD_COLUMNS =
  "id, slug, name, name_en, category, short_description, city, province, phone, website, logo_url";

export function generateStaticParams() {
  return PROVINCES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = Math.max(1, parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const province = getProvinceBySlug(slug);

  if (!province) return { title: "استان پیدا نشد" };

  // Four provinces hold the whole directory; the rest hold 0–2 listings and
  // were being announced in the sitemap regardless. Below the floor the page
  // still renders for a visitor but carries noindex.
  const count = provinceCount(await getGeoIndex(), slug);

  return {
    title: `کسب‌وکارهای ایرانی ${province.name}`,
    description: `دایرکتوری کسب‌وکارهای ایرانی در استان ${province.name} (${province.nameEn}) کانادا، بر اساس شهر و دسته‌بندی.`,
    // Each ?page= canonicalises to ITSELF. Pointing page 2+ at page 1 — which
    // this did — tells Google the deeper pages are duplicates, so nothing only
    // reachable from them gets indexed. Google dropped rel=next/prev in 2019
    // and calls the canonical-to-page-1 pattern a mistake.
    alternates: { canonical: page > 1 ? `/provinces/${slug}?page=${page}` : `/provinces/${slug}` },
    robots: isIndexable(count) ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const PAGE = 24;

export default async function ProvincePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const page = Math.max(1, parseInt((await searchParams)?.page ?? "1", 10) || 1);
  const province = getProvinceBySlug(slug);

  if (!province) notFound();

  const summary = await getProvinceSummary(slug);

  const supabase = await createSupabaseServerClient();
  const { data: businesses, count } = await supabase
    .from("businesses")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("province", province.nameEn)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  const cities = summary?.cities ?? [];

  return (
    <InnerPage
      currentPath={`/provinces/${slug}`}
      currentSection="business"
      eyebrow="استان"
      title={`کسب‌وکارهای ایرانی ${province.name}`}
      description={`${(summary?.total ?? 0).toLocaleString("fa-IR")} کسب‌وکار در ${cities.length} شهر این استان.`}
    >
      <nav className="crumbs">
        <Link href="/provinces">استان‌ها</Link>
        <span>›</span>
        <span>{province.name}</span>
      </nav>

      {cities.length > 0 ? (
        <section className="city-chips">
          <h2>شهرهای {province.name}</h2>
          <div className="city-chip-row">
            {cities.map((c) => (
              <Link
                key={c.city}
                href={`/cities/${encodeURIComponent(c.city)}`}
                className="city-chip"
              >
                {c.city}
                <span>{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {(summary?.total ?? 0) === 0 ? (
        /* Three provinces hold no listings at all. Rendering the usual
           "تازه‌ترین کسب‌وکارها" heading over an empty grid is the pattern
           docs/10-seo-playbook.md §5.2 faults the competitors for — a page
           that implies coverage it does not have. Say so plainly and send the
           visitor somewhere that has results. The page is noindex either way
           and is not in the sitemap. */
        <section className="province-listings">
          <h2>هنوز کسب‌وکاری در {province.name} ثبت نشده</h2>
          <p>
            پلازا دایرکتوری زنده است و این استان فعلاً خالی است. اگر کسب‌وکاری
            در {province.name} می‌شناسید، ثبتش رایگان است و همین صفحه با اولین
            ثبت زنده می‌شود.
          </p>
          <p>
            <Link href="/provinces">دیدن استان‌هایی که کسب‌وکار دارند</Link>
            {" · "}
            <Link href="/businesses">جست‌وجوی همه‌ی کسب‌وکارها</Link>
          </p>
        </section>
      ) : (
      <section className="province-listings">
        <h2>تازه‌ترین کسب‌وکارها</h2>
        <div className="listing-grid">
          {(businesses ?? []).map((b) => (
            <Link
              key={b.id as string}
              href={`/businesses/${b.slug}`}
              className="listing-card"
            >
              <strong>{b.name as string}</strong>
              {b.short_description ? <p>{b.short_description as string}</p> : null}
              <span className="listing-meta">
                {[b.city, b.category].filter((v) => v && v !== "نامشخص").join(" · ")}
              </span>
            </Link>
          ))}
        </div>

        {(businesses ?? []).length === 0 ? (
          <p className="empty-note">هنوز کسب‌وکاری در این استان ثبت نشده است.</p>
        ) : null}

        {totalPages > 1 ? (
          <nav className="pager" aria-label="صفحه‌بندی">
            {page > 1 ? <Link href={`/provinces/${slug}?page=${page - 1}`} className="pager-btn">قبلی</Link> : <span className="pager-btn is-disabled">قبلی</span>}
            <span className="pager-status">صفحه‌ی {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
            {page < totalPages ? <Link href={`/provinces/${slug}?page=${page + 1}`} className="pager-btn">بعدی</Link> : <span className="pager-btn is-disabled">بعدی</span>}
          </nav>
        ) : null}
      </section>
      )}
      <LatestPostsStrip subtitle="راهنماهای تازه‌ی پلازا درباره‌ی استان‌ها و زندگی ایرانی در کانادا" />
    </InnerPage>
  );
}
