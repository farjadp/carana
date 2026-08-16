// ============================================================================
// Source: apps/mobile/src/app/provinces/[slug].tsx
// Version: 1.0.0 — 2026-08-23
// Why: Listings for one province, with its cities as quick filters.
// ============================================================================
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";

import { getProvinceBySlug } from "@charana/core";
import { BusinessCardView } from "../../components/business-card";
import {
  listBusinessesByProvince,
  listCategories,
  listProvinces,
  type BusinessCard,
} from "../../lib/businesses";
import { colors, radius, space, type, fonts, shadow } from "../../theme";

export default function ProvinceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const province = getProvinceBySlug(slug ?? "");

  const [items, setItems] = useState<BusinessCard[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  // A missing province has nothing to load, so it starts settled rather than
  // starting "loading" and being corrected inside an effect.
  const [loading, setLoading] = useState(!!province);

  useEffect(() => {
    if (!province) return;
    (async () => {
      try {
        const [rows, cats, summaries] = await Promise.all([
          listBusinessesByProvince(province.nameEn),
          listCategories(),
          listProvinces(),
        ]);
        setItems(rows);
        setLabels(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
        setCities(summaries.find((s) => s.province.slug === province.slug)?.cities ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [province?.slug]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{province?.name ?? "استان"}</Text>
          <Text style={styles.subtitle}>{items.length} کسب‌وکار</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.annabi} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            cities.length ? (
              <View style={styles.chipRow}>
                {cities.map((c) => (
                  <Pressable
                    key={c.city}
                    style={styles.chip}
                    onPress={() => router.push(`/cities/${encodeURIComponent(c.city)}`)}
                  >
                    <Text style={styles.chipText}>{c.city}</Text>
                    <Text style={styles.chipCount}>{c.count}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>هنوز کسب‌وکاری در این استان ثبت نشده است.</Text>
          }
          renderItem={({ item }) => (
            <BusinessCardView
              business={item}
              categoryLabel={labels[item.category ?? ""] ?? item.category ?? ""}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.md, paddingVertical: space.md,
  },
  back: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    ...shadow.card,
  },
  title: { ...type.h1, fontSize: 22, textAlign: "right" },
  subtitle: { ...type.muted, textAlign: "right", marginTop: 2 },
  list: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.xl },
  chipRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  chip: {
    flexDirection: "row-reverse", alignItems: "center", gap: 5,
    paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.pill,
    backgroundColor: colors.surface, ...shadow.card,
  },
  chipText: { fontSize: 12.5, color: colors.text, fontFamily: fonts.semibold },
  chipCount: { fontSize: 11, color: colors.mutedText },
  empty: { ...type.muted, textAlign: "center", marginTop: space.xl },
});
