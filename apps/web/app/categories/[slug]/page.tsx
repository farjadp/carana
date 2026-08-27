// ============================================================================
// Source: app/categories/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Category detail & business search page for specific business categories.
// Env / Identity: Server Component with ISR and dynamic metadata.
// ============================================================================

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PUBLIC_STATUSES, fetchAllRows } from "@goplaza/core";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryDetail } from "@/lib/data/category-details";
import { breadcrumbLd, countCategoryCities, getCategoryAliases } from "@/lib/seo/local";
import { collectionLd } from "@/lib/seo/entity";
import { JsonLd } from "@/components/json-ld";
import { LatestPostsStrip } from "@/components/blog/latest-posts";
import CategoryClientPage, { type BusinessItem } from "./category-client";

export const revalidate = 60; // ISR cache 1 minute

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryDetail(slug);

  return {
    title: `${config.name} ایرانیان کانادا`,
    description: config.description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      locale: "fa_CA",
      title: `${config.name} ایرانی در کانادا | دایرکتوری پلازا`,
      description: config.description,
      images: [config.imageUrl],
    },
  };
}


export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getCategoryDetail(slug);
  const supabase = await createSupabaseServerClient();
  const categoryAliases = getCategoryAliases(slug, config.name);

  // Two things this query got wrong until 27 Aug, both of the kind that fail
  // silently: no status filter, so a signed-in owner (and the imports account,
  // which owns thousands of rows) counted their own unpublished listings as
  // «کسب‌وکار فعال» — RLS hides them from a visitor but not from their owner;
  // and no paging, so PostgREST would have capped the page at 1,000 rows
  // without an error. The largest category is already at 839.
  const businesses = await fetchAllRows<BusinessItem>(() =>
    supabase
      .from("businesses")
      .select("*")
      .in("status", PUBLIC_STATUSES)
      .in("category", categoryAliases)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
  );

  const initialBusinesses = businesses;
  const cityLinks = (await countCategoryCities(supabase, slug, config.name))
    .filter((c) => c.count > 0)
    .map((c) => ({ slug: c.city.slug, nameFa: c.city.nameFa, count: c.count }));

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "خانه", url: "/" }, { name: "دسته‌بندی‌ها", url: "/categories" }, { name: config.name, url: `/categories/${slug}` }])} />
      <JsonLd
        data={collectionLd({
          name: `${config.name} ایرانی در کانادا`,
          description: config.description,
          path: `/categories/${slug}`,
          total: initialBusinesses.length,
          items: initialBusinesses
            .slice(0, 50)
            .map((b) => ({ name: (b as { name: string }).name, path: `/businesses/${(b as { slug: string | null; id: string }).slug ?? (b as { id: string }).id}` })),
        })}
      />
      <CategoryClientPage
        categoryConfig={config}
        initialBusinesses={initialBusinesses}
        cityLinks={cityLinks}
      />
      <LatestPostsStrip subtitle="راهنماهای تازه‌ی پلازا برای انتخاب درست و کسب‌وکار ایرانی در کانادا" />
    </>
  );
}
