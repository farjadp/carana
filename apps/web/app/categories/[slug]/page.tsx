// ============================================================================
// Source: app/categories/[slug]/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Category detail & business search page for specific business categories.
// Env / Identity: Server Component with ISR and dynamic metadata.
// ============================================================================

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCategoryDetail } from "@/lib/data/category-details";
import { countCategoryCities, getCategoryAliases } from "@/lib/seo/local";
import CategoryClientPage from "./category-client";

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
    openGraph: {
      title: `${config.name} ایرانی در کانادا | دایرکتوری چارانا`,
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

  // Query businesses matching category aliases
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .in("category", categoryAliases)
    .order("created_at", { ascending: false });

  const initialBusinesses = businesses || [];
  const cityLinks = (await countCategoryCities(supabase, slug, config.name))
    .filter((c) => c.count > 0)
    .map((c) => ({ slug: c.city.slug, nameFa: c.city.nameFa, count: c.count }));

  return (
    <CategoryClientPage
      categoryConfig={config}
      initialBusinesses={initialBusinesses}
      cityLinks={cityLinks}
    />
  );
}
