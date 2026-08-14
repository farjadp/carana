// ============================================================================
// Source: apps/mobile/src/app/(tabs)/index.tsx
// Version: 2.0.0 — 2026-08-22
// Why: Home screen, mirroring the web landing page: hero, popular categories,
//      newest listings, active cities.
// Env / Identity: Public reads only.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search } from "lucide-react-native";

import { BusinessCardView } from "../../components/business-card";
import {
  countByCategory,
  listBusinesses,
  listCategories,
  listCities,
  type BusinessCard,
  type Category,
} from "../../lib/businesses";
import { colors, radius, space, type } from "../../theme";

export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newest, setNewest] = useState<BusinessCard[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cats, counted, latest, cityList] = await Promise.all([
        listCategories(),
        countByCategory(),
        listBusinesses({ limit: 6 }),
        listCities(),
      ]);
      setCategories(cats);
      setCounts(counted);
      setNewest(latest);
      setCities(cityList.slice(0, 8));
      setTotal(Object.values(counted).reduce((a, b) => a + b, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const labelFor = (slug: string | null) =>
    categories.find((c) => c.slug === slug)?.name ?? slug ?? "";

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.annabi} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.annabi}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.brand}>čārana</Text>
          <Text style={styles.tagline}>
            کسب‌وکارهای ایرانی کانادا، یکجا و قابل اعتماد
          </Text>
          {total > 0 ? (
            <Text style={styles.count}>{total.toLocaleString("fa-IR")} کسب‌وکار ثبت‌شده</Text>
          ) : null}

          <Pressable style={styles.searchBar} onPress={() => router.push("/search")}>
            <Search size={18} color={colors.mutedText} />
            <Text style={styles.searchText}>جستجوی کسب‌وکار، خدمات یا شهر…</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Categories */}
        <SectionHeader title="دسته‌بندی‌ها" onPress={() => router.push("/categories")} />
        <View style={styles.catGrid}>
          {categories.slice(0, 8).map((cat) => (
            <Pressable
              key={cat.id}
              style={styles.catTile}
              onPress={() => router.push(`/categories/${cat.slug}`)}
            >
              <Text style={styles.catIcon}>{cat.icon ?? "•"}</Text>
              <Text style={styles.catName} numberOfLines={2}>
                {cat.name}
              </Text>
              <Text style={styles.catCount}>{counts[cat.slug] ?? 0}</Text>
            </Pressable>
          ))}
        </View>

        {/* Newest */}
        <SectionHeader title="تازه‌ترین کسب‌وکارها" />
        <View style={styles.list}>
          {newest.map((b) => (
            <BusinessCardView key={b.id} business={b} categoryLabel={labelFor(b.category)} />
          ))}
        </View>

        {/* Cities */}
        <SectionHeader title="شهرهای فعال" onPress={() => router.push("/cities")} />
        <View style={styles.cityWrap}>
          {cities.map((c) => (
            <Pressable
              key={c.city}
              style={styles.cityChip}
              onPress={() => router.push(`/cities/${encodeURIComponent(c.city)}`)}
            >
              <Text style={styles.cityName}>{c.city}</Text>
              <Text style={styles.cityCount}>{c.count}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.moreBtn}>
          <Text style={styles.moreText}>همه</Text>
          <ChevronLeft size={16} color={colors.lajvard} />
        </Pressable>
      ) : (
        <View />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md },

  hero: { alignItems: "center", paddingTop: space.lg, paddingBottom: space.md },
  brand: { fontSize: 40, fontWeight: "800", color: colors.annabi, letterSpacing: 0.5 },
  tagline: { ...type.body, color: colors.mutedText, marginTop: 6, textAlign: "center" },
  count: { ...type.muted, marginTop: 8, color: colors.lajvard, fontWeight: "700" },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 13,
    marginTop: space.md,
    width: "100%",
  },
  searchText: { ...type.body, color: colors.mutedText, flex: 1, textAlign: "right" },

  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  sectionTitle: { ...type.h2 },
  moreBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  moreText: { fontSize: 13, color: colors.lajvard, fontWeight: "700" },

  catGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space.sm },
  catTile: {
    width: "31.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space.md,
    alignItems: "center",
    gap: 4,
  },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 12, fontWeight: "700", color: colors.text, textAlign: "center" },
  catCount: { fontSize: 11, color: colors.mutedText },

  list: { gap: space.sm },

  cityWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space.sm },
  cityChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.softLajvard,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 9,
  },
  cityName: { fontSize: 13, fontWeight: "700", color: colors.lajvard },
  cityCount: { fontSize: 11, color: colors.lajvard, opacity: 0.7 },

  errorBox: {
    backgroundColor: colors.softAnnabi,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  errorText: { color: colors.annabi, fontSize: 13, textAlign: "center" },
});
