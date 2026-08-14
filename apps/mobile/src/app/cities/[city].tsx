// ============================================================================
// Source: apps/mobile/src/app/cities/[city].tsx
// Version: 1.0.0 — 2026-08-22
// Why: Listings for one city.
// ============================================================================
import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";

import { ListingScreen } from "../../components/listing-screen";

export default function CityScreen() {
  const { city } = useLocalSearchParams<{ city: string }>();
  const name = decodeURIComponent(city ?? "");
  const filter = useMemo(() => ({ city: name }), [name]);

  return (
    <ListingScreen
      title={name}
      subtitle="کسب‌وکارهای ایرانی این شهر"
      filter={filter}
    />
  );
}
