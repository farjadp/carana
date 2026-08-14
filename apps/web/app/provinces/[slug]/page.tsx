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

import { PUBLIC_STATUSES, getProvinceBySlug, PROVINCES } from "@charana/core";
import { InnerPage } from "@/components/inner-page";
import { getProvinceSummary } from "@/lib/data/geography";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 3600;

const CARD_COLUMNS =
  "id, slug, name, name_en, category, short_description, city, province, phone, website, logo_url";

export function generateStaticParams() {
  return PROVINCES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const province = getProvinceBySlug(slug);

  if (!province) return { title: "استان پیدا نشد | čārana" };

  return {
    title: `کسب‌وکارهای ایرانی ${province.name} | čārana`,
    description: `دایرکتوری کسب‌وکارهای ایرانی در استان ${province.name} (${province.nameEn}) کانادا، بر اساس شهر و دسته‌بندی.`,
  };
}

export default async function ProvincePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const province = getProvinceBySlug(slug);

  if (!province) notFound();

  const summary = await getProvinceSummary(slug);

  const supabase = await createSupabaseServerClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select(CARD_COLUMNS)
    .eq("province", province.nameEn)
    .in("status", PUBLIC_STATUSES)
    .order("created_at", { ascending: false })
    .limit(60);

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
      </section>
    </InnerPage>
  );
}
