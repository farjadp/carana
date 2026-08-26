// ============================================================================
// Source: apps/mobile/src/components/listing-screen.tsx
// Version: 2.0.0 — 2026-08-24
// Why: The category and city screens are the same screen with a different
//      filter, so they share one implementation.
//
//      v2 (24 Aug): the four sorts the website offers, and an honest count.
//      v1 fetched 100 rows and printed «۱۰۰ کسب‌وکار» — in Toronto, where
//      1,699 match, that sentence was simply false. The total now comes from
//      the database and the line says how much of it is on screen. Default
//      order is the shared weighted shuffle, so the «ویژه» chip on
//      BusinessCardView is doing real work here.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";

import { BrandLoading } from "./brand-mark";
import { BusinessCardView } from "./business-card";
import {
  LISTING_SORTS,
  listBusinesses,
  listCategories,
  type BusinessCard,
  type ListingSort,
} from "../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../theme";

const PAGE = 100;
const fa = (n: number) => n.toLocaleString("fa-IR");

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
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<ListingSort | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sortsRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Inside the async closure rather than the effect body: a synchronous
      // setState in an effect can cascade renders (react-hooks lint), and
      // nothing here needs the spinner before the microtask anyway.
      setLoading(true);
      try {
        const [page, cats] = await Promise.all([
          listBusinesses({ ...filter, sort: sort ?? undefined, limit: PAGE }),
          listCategories(),
        ]);
        if (cancelled) return;
        setItems(page.rows);
        setTotal(page.total);
        setLabels(Object.fromEntries(cats.map((c) => [c.slug, c.name])));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "خطای ناشناخته");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter.category, filter.city, sort]);

  // Says what is true: how many are on screen, out of how many exist. Only
  // the shuffled default reshuffles, so only it gets that note.
  const countLine =
    error ??
    (items.length >= total
      ? `${fa(total)} کسب‌وکار`
      : `${fa(items.length)} از ${fa(total)} کسب‌وکار`) +
      (sort ? "" : " · ترتیب تصادفی");

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
        <BrandLoading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {/*
                The app styles RTL with row-reverse rather than
                I18nManager.forceRTL, so the scroll container itself is still
                LTR: the first (rightmost) chip starts past the right edge.
                Scrolling to the end on layout is what puts «تصادفی» — the
                default, and the one a reader looks for first — on screen.
              */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sorts}
                ref={sortsRef}
                onContentSizeChange={() => sortsRef.current?.scrollToEnd({ animated: false })}
              >
                <Pressable
                  onPress={() => setSort(null)}
                  style={[styles.chip, sort === null && styles.chipActive]}
                >
                  <Text style={[styles.chipText, sort === null && styles.chipTextActive]}>تصادفی</Text>
                </Pressable>
                {LISTING_SORTS.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    onPress={() => setSort(key)}
                    style={[styles.chip, sort === key && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, sort === key && styles.chipTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.count}>{countLine}</Text>
            </>
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
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  headerText: { flex: 1 },
  title: { ...type.h1, fontSize: 22, textAlign: "right" },
  subtitle: { ...type.muted, textAlign: "right", marginTop: 2 },
  list: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.xl },
  sorts: { flexDirection: "row-reverse", gap: space.xs, paddingBottom: space.sm },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  chipActive: { backgroundColor: colors.annabi },
  chipText: { fontSize: 12, fontFamily: fonts.heavy, color: colors.text },
  chipTextActive: { color: "#fff" },
  count: { ...type.muted, textAlign: "right", marginBottom: space.xs },
  empty: { ...type.muted, textAlign: "center", marginTop: space.xl },
});
