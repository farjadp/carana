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
    title: `${config.name} ایرانیان کانادا | čārana`,
    description: config.description,
    openGraph: {
      title: `${config.name} ایرانی در کانادا | دایرکتوری چارانا`,
      description: config.description,
      images: [config.imageUrl],
    },
  };
}

function getCategoryAliases(slug: string, name: string): string[] {
  const aliases = new Set<string>([slug, name]);
  if (slug === "medical-clinic" || slug === "medical") {
    aliases.add("medical"); aliases.add("medical-clinic"); aliases.add("پزشکی، دندانپزشکی و سلامت"); aliases.add("پزشکی");
  } else if (slug === "restaurant-cafe" || slug === "food") {
    aliases.add("food"); aliases.add("restaurant-cafe"); aliases.add("رستوران، کافه و غذا"); aliases.add("رستوران");
  } else if (slug === "legal-immigration" || slug === "legal") {
    aliases.add("legal"); aliases.add("legal-immigration"); aliases.add("حقوقی و وکالت");
  } else if (slug === "real-estate-mortgage" || slug === "real_estate") {
    aliases.add("real_estate"); aliases.add("real-estate-mortgage"); aliases.add("مشاور املاک"); aliases.add("املاک و وام");
  } else if (slug === "accounting-tax" || slug === "financial") {
    aliases.add("financial"); aliases.add("accounting-tax"); aliases.add("مالی، حسابداری و بیمه");
  } else if (slug === "beauty-wellness" || slug === "beauty") {
    aliases.add("beauty"); aliases.add("beauty-wellness"); aliases.add("آرایشگری و زیبایی");
  } else if (slug === "iranian-grocery" || slug === "retail") {
    aliases.add("retail"); aliases.add("iranian-grocery"); aliases.add("فروشگاه و خرده‌فروشی");
  } else if (slug === "skilled-trades" || slug === "construction") {
    aliases.add("construction"); aliases.add("skilled-trades"); aliases.add("ساختمان و تاسیسات");
  }
  return Array.from(aliases);
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

  return (
    <CategoryClientPage
      categoryConfig={config}
      initialBusinesses={initialBusinesses}
    />
  );
}
