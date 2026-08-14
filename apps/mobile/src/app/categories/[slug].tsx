// ============================================================================
// Source: apps/mobile/src/app/categories/[slug].tsx
// Version: 1.0.0 — 2026-08-22
// Why: Listings for one category.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import { ListingScreen } from "../../components/listing-screen";
import { listCategories, type Category } from "../../lib/businesses";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    listCategories()
      .then((cats) => setCategory(cats.find((c) => c.slug === slug) ?? null))
      .catch(() => {});
  }, [slug]);

  const filter = useMemo(() => ({ category: slug }), [slug]);

  return (
    <ListingScreen
      title={category?.name ?? "دسته‌بندی"}
      subtitle={category?.description ?? undefined}
      filter={filter}
    />
  );
}
