// ============================================================================
// Source: app/businesses/page.tsx
// Version: 2.0.0 — 2026-08-19
// Why: The main navigation linked to /businesses, which did not exist and
//      returned 404. A directory needs a browsable index of every listing.
//
//      v2: default order is now genuinely random and reshuffles on every
//      request (no `revalidate`, `dynamic = "force-dynamic"`) — Farjad's
//      call: no default sort at all, rather than "newest first" pretending
//      to be neutral. Featured businesses (Premium/Platinum) get
//      FEATURED_RANDOM_BOOST inside that shuffle; see the comment on
//      weightedRandomOrder for exactly what that means and why it is still
//      honest. Four explicit sorts added (?sort=views|saved|new|verified) —
//      "highest rated" was deliberately left out: with a handful of
//      published reviews today, a rating sort would mostly show ties, which
//      is worse than not offering it. Cards switched from a bespoke minimal
//      link to the shared BusinessCard, which is what actually renders the
//      "ویژه" chip — required for the random boost to be honest, not
//      decoration.
// Env / Identity: Public read. Columns are listed explicitly — Postgres does
//      not apply RLS per column, so select("*") would expose verification data.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Sparkles, ShieldCheck, Clock3, Shuffle } from "lucide-react";

import { PUBLIC_STATUSES, PROVINCES, resolveProvince } from "@goplaza/core";
import { redirect } from "next/navigation";
import { InnerPage } from "@/components/inner-page";
import { BusinessCard, type BusinessCardData } from "@/components/business/business-card";
import { weightedRandomOrder } from "@/lib/billing/entitlements";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Random by default, reshuffled every load — this route must never be
// statically cached or ISR-revalidated, or "every refresh" would just be
// serving the same cached shuffle.
export const dynamic = "force-dynamic";

const CARD_COLUMNS = [
  "id", "slug", "name", "name_en", "category", "short_description", "city", "province", "logo_url",
  "view_count", "saved_count", "created_at",
  "plan", "plan_until", "busy_status", "busy_status_until",
  "verification_method", "verified_at", "verified_until", "verified_phone", "verified_email",
  "phone", "contact_email",
].join(", ");

const PAGE_SIZE = 48;

type SortKey = "views" | "saved" | "new" | "verified";

const SORTS: { key: SortKey; label: string; icon: typeof Flame }[] = [
  { key: "views", label: "پربازدیدترین", icon: Flame },
  { key: "saved", label: "پرمخاطب‌ترین", icon: Sparkles },
  { key: "new", label: "جدیدترین", icon: Clock3 },
  { key: "verified", label: "تازه تأییدشده", icon: ShieldCheck },
];

export const metadata: Metadata = {
  alternates: { canonical: "/businesses" },
  title: "همه کسب‌وکارها",
  description:
    "فهرست کامل کسب‌وکارهای ایرانی ثبت‌شده در کانادا، قابل مرور بر اساس استان و دسته‌بندی.",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; province?: string; category?: string; q?: string; city?: string; sort?: string }>;
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
  const sort = (SORTS.some((s) => s.key === params.sort) ? params.sort : undefined) as SortKey | undefined;

  const supabase = await createSupabaseServerClient();
  const province = params.province ? resolveProvince(params.province) : null;

  let businesses: BusinessCardData[];
  let total: number;

  if (sort) {
    // A stable, explicit order — the database does the sorting and the
    // paging, same as any normal listing page.
    const orderColumn = { views: "view_count", saved: "saved_count", new: "created_at", verified: "verified_at" }[sort];
    let query = supabase.from("businesses").select(CARD_COLUMNS, { count: "exact" }).in("status", PUBLIC_STATUSES);
    if (province) query = query.eq("province", province.nameEn);
    if (params.category) query = query.eq("category", params.category);
    if (params.city) query = query.ilike("city", params.city.trim());
    const { data, count } = await query
      .order(orderColumn, { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);
    businesses = (data ?? []) as unknown as BusinessCardData[];
    total = count ?? 0;
  } else {
    // No sort at all: pull every business the current filters match — the
    // 1,000-row PostgREST default would silently truncate a large province —
    // weighted-shuffle it fresh on every request, then slice the requested
    // page. Pagination is therefore not stable across reloads in this mode;
    // that instability is the feature Farjad asked for, not a bug in it.
    const all = await fetchAllRows<BusinessCardData>(() => {
      let query = supabase.from("businesses").select(CARD_COLUMNS).in("status", PUBLIC_STATUSES);
      if (province) query = query.eq("province", province.nameEn);
      if (params.category) query = query.eq("category", params.category);
      if (params.city) query = query.ilike("city", params.city.trim());
      return query.order("id") as never;
    });
    const shuffled = weightedRandomOrder(all);
    total = shuffled.length;
    businesses = shuffled.slice(from, from + PAGE_SIZE);
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("display_order");

  const labels = new Map((categories ?? []).map((c) => [c.slug as string, c.name as string]));
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
      title="همه کسب‌وکارها"
      description={`${total.toLocaleString("fa-IR")} کسب‌وکار ثبت‌شده. با استان و دسته‌بندی محدودش کن، یا ترتیب نمایش را عوض کن.`}
    >
      <section className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">ترتیب</span>
          <Link
            href={withParams({ sort: undefined, page: undefined })}
            className={`filter-chip${!sort ? " is-active" : ""}`}
            title="بدون ترتیب ثابت — هر بار که این صفحه را باز کنی چیدمان فرق می‌کند"
          >
            <Shuffle size={13} className="ml-1 inline" /> تصادفی
          </Link>
          {SORTS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={withParams({ sort: key, page: undefined })}
              className={`filter-chip${sort === key ? " is-active" : ""}`}
            >
              <Icon size={13} className="ml-1 inline" /> {label}
            </Link>
          ))}
        </div>

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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} showViews categoryLabel={labels.get(b.category as string)} />
          ))}
        </div>

        {businesses.length === 0 ? (
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
              {!sort ? " · تصادفی — با هر بازگشایی عوض می‌شود" : ""}
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
