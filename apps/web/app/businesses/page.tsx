// ============================================================================
// Source: app/businesses/page.tsx
// Version: 1.0.0 — 2026-08-23
// Why: The main navigation linked to /businesses, which did not exist and
//      returned 404. A directory needs a browsable index of every listing.
// Env / Identity: Public read. Columns are listed explicitly — Postgres does
//      not apply RLS per column, so select("*") would expose verification data.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PUBLIC_STATUSES, PROVINCES, resolveProvince } from "@goplaza/core";
import { redirect } from "next/navigation";
import { InnerPage } from "@/components/inner-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const CARD_COLUMNS =
  "id, slug, name, name_en, category, short_description, city, province, logo_url";

const PAGE_SIZE = 48;

export const metadata: Metadata = {
  title: "همه کسب‌وکارها",
  description:
    "فهرست کامل کسب‌وکارهای ایرانی ثبت‌شده در کانادا، قابل مرور بر اساس استان و دسته‌بندی.",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; province?: string; category?: string; q?: string; city?: string }>;
}) {
  const params = await searchParams;
  // Free-text lives on /search now (ranked, Persian-aware). Keep old links working.
  if (params.q?.trim()) {
    const u = new URLSearchParams({ q: params.q.trim() });
    if (params.city) u.set("city", params.city);
    if (params.category) u.set("category", params.category);
    redirect(`/search?${u}`);
  }
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("businesses")
    .select(CARD_COLUMNS, { count: "exact" })
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const province = params.province ? resolveProvince(params.province) : null;
  if (province) query = query.eq("province", province.nameEn);
  if (params.category) query = query.eq("category", params.category);
  if (params.city) query = query.ilike("city", params.city.trim());
  // Free-text search over name / English name / short description. ilike
  // escapes its argument; the pattern below only adds the wildcards.
  // or() builds a filter string, so the term must not carry PostgREST syntax:
  // strip commas, parentheses, dots and wildcards before interpolating.
  const q = params.q?.trim().replace(/[,().%_\\*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (q) {
    const pat = `%${q}%`;
    query = query.or(`name.ilike.${pat},name_en.ilike.${pat},short_description.ilike.${pat}`);
  }

  const { data: businesses, count } = await query;

  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");

  const labels = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const withParams = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { ...params, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/businesses?${qs}` : "/businesses";
  };

  return (
    <InnerPage
      currentPath="/businesses"
      currentSection="business"
      eyebrow="فهرست کامل"
      title={q ? `نتایج جستجو برای «${q}»` : "همه کسب‌وکارها"}
      description={q ? `${total.toLocaleString("fa-IR")} کسب‌وکار پیدا شد.` : `${total.toLocaleString("fa-IR")} کسب‌وکار ثبت‌شده. با استان و دسته‌بندی محدودش کنید.`}
    >
      <section className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">استان</span>
          <Link
            href={withParams({ province: undefined, page: undefined })}
            className={`filter-chip${!province ? " is-active" : ""}`}
          >
            همه
          </Link>
          {PROVINCES.slice(0, 4).map((p) => (
            <Link
              key={p.slug}
              href={withParams({ province: p.slug, page: undefined })}
              className={`filter-chip${province?.slug === p.slug ? " is-active" : ""}`}
            >
              {p.name}
            </Link>
          ))}
        </div>

        <div className="filter-group">
          <span className="filter-label">دسته</span>
          <Link
            href={withParams({ category: undefined, page: undefined })}
            className={`filter-chip${!params.category ? " is-active" : ""}`}
          >
            همه
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.slug as string}
              href={withParams({ category: c.slug as string, page: undefined })}
              className={`filter-chip${params.category === c.slug ? " is-active" : ""}`}
            >
              {c.name as string}
            </Link>
          ))}
        </div>
      </section>

      <section className="province-listings">
        <div className="listing-grid">
          {(businesses ?? []).map((b) => (
            <Link key={b.id as string} href={`/businesses/${b.slug}`} className="listing-card">
              <strong>{b.name as string}</strong>
              {b.short_description ? <p>{b.short_description as string}</p> : null}
              <span className="listing-meta">
                {[b.city, labels.get(b.category as string) ?? b.category]
                  .filter((v) => v && v !== "نامشخص")
                  .join(" · ")}
              </span>
            </Link>
          ))}
        </div>

        {(businesses ?? []).length === 0 ? (
          <p className="empty-note">با این فیلترها کسب‌وکاری پیدا نشد.</p>
        ) : null}

        {lastPage > 1 ? (
          <nav className="pager" aria-label="صفحه‌بندی">
            {page > 1 ? (
              <Link href={withParams({ page: String(page - 1) })} className="pager-btn">
                صفحه قبل
              </Link>
            ) : (
              <span className="pager-btn is-disabled">صفحه قبل</span>
            )}
            <span className="pager-status">
              صفحه {page.toLocaleString("fa-IR")} از {lastPage.toLocaleString("fa-IR")}
            </span>
            {page < lastPage ? (
              <Link href={withParams({ page: String(page + 1) })} className="pager-btn">
                صفحه بعد
              </Link>
            ) : (
              <span className="pager-btn is-disabled">صفحه بعد</span>
            )}
          </nav>
        ) : null}
      </section>
    </InnerPage>
  );
}
