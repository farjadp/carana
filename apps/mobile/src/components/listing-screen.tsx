// ============================================================================
// Source: apps/mobile/src/components/listing-screen.tsx
// Version: 1.0.0 — 2026-08-22
// Why: The category and city screens are the same screen with a different
//      filter, so they share one implementation.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";

import { BusinessCardView } from "./business-card";
import { listBusinesses, listCategories, type BusinessCard } from "../lib/businesses";
import { colors, radius, space, type } from "../theme";

export function ListingScreen({
  title,
  subtitle,
  filter,
}: {
  title: string;
  subtitle?: string;
  filter: { category?: string; city?: string };
}) {
  const router = useRouter();
  const [items, setItems] = useState<BusinessCard[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rows, cats] = await Promise.all([
          listBusinesses({ ...filter, limit: 100 }),
          listCategories(),
        ]);
        setItems(rows);
        setLabels(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    })();
  }, [filter.category, filter.city]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
            <Text style={styles.count}>
              {error ?? `${items.length} کسب‌وکار`}
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>هنوز کسب‌وکاری در این بخش ثبت نشده است.</Text>
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
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { ...type.h1, fontSize: 22, textAlign: "right" },
  subtitle: { ...type.muted, textAlign: "right", marginTop: 2 },
  list: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.xl },
  count: { ...type.muted, textAlign: "right", marginBottom: space.xs },
  empty: { ...type.muted, textAlign: "center", marginTop: space.xl },
});
