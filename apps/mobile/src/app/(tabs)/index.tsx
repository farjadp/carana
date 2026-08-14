// ============================================================================
// Source: apps/mobile/src/app/(tabs)/index.tsx
// Version: 3.0.0 — 2026-08-14
// Why: Home screen. v3 is the brand redesign: an annabi hero card carrying the
//      Hidden Č mark and the Persepolis merlon row, soft-elevation cards
//      instead of hard borders, and Vazirmatn throughout.
// Env / Identity: Public reads only.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Search } from "lucide-react-native";

import {
  BrandLoading,
  BrandMark,
  MerlonGlyph,
  MerlonRow,
} from "../../components/brand-mark";
import { BusinessCardView } from "../../components/business-card";
import {
  countByCategory,
  listBusinesses,
  listCategories,
  listCities,
  type BusinessCard,
  type Category,
} from "../../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

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

  if (loading) return <BrandLoading />;

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
        {/* Hero — the brand statement */}
        <View style={styles.hero}>
          {/* Watermark: the mark, oversized and faint, bleeding off the corner */}
          <View style={styles.heroWatermark} pointerEvents="none">
            <BrandMark size={220} color={colors.onAnnabi} simple />
          </View>

          <BrandMark size={48} color={colors.onAnnabi} />
          <Text style={styles.brand}>čārana</Text>
          <Text style={styles.brandFa}>چارانا</Text>
          <Text style={styles.tagline}>با اطمینان پیدا کن.</Text>

          {total > 0 ? (
            <View style={styles.countChip}>
              <Text style={styles.countText}>
                {total.toLocaleString("fa-IR")} کسب‌وکار ایرانی در کانادا
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.searchBar} onPress={() => router.push("/search")}>
            <Search size={18} color={colors.annabi} />
            <Text style={styles.searchText}>جستجوی کسب‌وکار، خدمات یا شهر…</Text>
          </Pressable>

          <View style={styles.heroMerlon} pointerEvents="none">
            <MerlonRow color={colors.onAnnabi} opacity={0.22} height={9} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Categories */}
        <SectionHeader title="دسته‌بندی‌ها" onPress={() => router.push("/categories")} />
        <View style={styles.catGrid}>
          {categories.slice(0, 8).map((cat, i) => (
            <Pressable
              key={cat.id}
              style={({ pressed }) => [styles.catTile, pressed && styles.pressed]}
              onPress={() => router.push(`/categories/${cat.slug}`)}
            >
              <View style={[styles.catIconBox, i % 2 ? styles.catIconLajvard : null]}>
                <Text style={styles.catIcon}>{cat.icon ?? "•"}</Text>
              </View>
              <Text style={styles.catName} numberOfLines={2}>
                {cat.name}
              </Text>
              <Text style={styles.catCount}>
                {(counts[cat.slug] ?? 0).toLocaleString("fa-IR")}
              </Text>
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
              style={({ pressed }) => [styles.cityChip, pressed && styles.pressed]}
              onPress={() => router.push(`/cities/${encodeURIComponent(c.city)}`)}
            >
              <Text style={styles.cityName}>{c.city}</Text>
              <Text style={styles.cityCount}>{c.count.toLocaleString("fa-IR")}</Text>
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
        <Pressable onPress={onPress} style={styles.moreBtn} hitSlop={8}>
          <Text style={styles.moreText}>همه</Text>
          <ChevronLeft size={16} color={colors.lajvard} />
        </Pressable>
      ) : (
        <View />
      )}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <MerlonGlyph size={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.sm },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },

  hero: {
    alignItems: "center",
    backgroundColor: colors.annabi,
    borderRadius: radius.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg + 14,
    paddingHorizontal: space.lg,
    overflow: "hidden",
    ...shadow.raised,
  },
  heroWatermark: {
    position: "absolute",
    top: -70,
    left: -70,
    opacity: 0.07,
  },
  heroMerlon: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  brand: {
    fontSize: 32,
    fontFamily: fonts.heavy,
    color: colors.onAnnabi,
    letterSpacing: 0.5,
    marginTop: 8,
  },
  brandFa: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.onAnnabiMuted,
    marginTop: -2,
  },
  tagline: {
    ...type.body,
    color: colors.onAnnabi,
    marginTop: 6,
    textAlign: "center",
  },
  countChip: {
    marginTop: space.sm,
    backgroundColor: "rgba(246, 241, 232, 0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  countText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: colors.onAnnabi,
  },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    marginTop: space.md,
    width: "100%",
    ...shadow.card,
  },
  searchText: { ...type.body, color: colors.mutedText, flex: 1, textAlign: "right" },

  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
    marginBottom: space.sm,
  },
  sectionTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  sectionTitle: { ...type.h2 },
  moreBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  moreText: { fontSize: 13, color: colors.lajvard, fontFamily: fonts.bold },

  catGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space.sm },
  catTile: {
    width: "31.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: "center",
    gap: 6,
    ...shadow.card,
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
    justifyContent: "center",
  },
  catIconLajvard: { backgroundColor: colors.softLajvard },
  catIcon: { fontSize: 20 },
  catName: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  catCount: { fontSize: 11, fontFamily: fonts.medium, color: colors.mutedText },

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
  cityName: { fontSize: 13, fontFamily: fonts.bold, color: colors.lajvard },
  cityCount: { fontSize: 11, fontFamily: fonts.medium, color: colors.lajvard, opacity: 0.7 },

  errorBox: {
    backgroundColor: colors.softAnnabi,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
  },
  errorText: { color: colors.annabi, fontSize: 13, fontFamily: fonts.medium, textAlign: "center" },
});
