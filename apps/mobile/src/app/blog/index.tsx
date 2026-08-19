// ============================================================================
// Source: apps/mobile/src/app/blog/index.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The blog list in the app — same posts as goplaza.ca/blog, read straight
//      from Supabase (RLS returns published only).
// Env / Identity: Public reads.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Clock } from "lucide-react-native";

import { BrandLoading, MerlonGlyph } from "../../components/brand-mark";
import { faDate, listBlogCategories, listPosts, type BlogCategory, type PostCard } from "../../lib/blog";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function BlogListScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [cats, setCats] = useState<BlogCategory[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (category: string | null) => {
    try {
      const [rows, categories] = await Promise.all([listPosts({ category, limit: 40 }), listBlogCategories()]);
      setPosts(rows);
      setCats(categories);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(active);
  }, [load, active]);

  const catName = new Map(cats.map((c) => [c.slug, c.name]));
  if (loading) return <BrandLoading />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ChevronRight size={22} color={colors.text} /></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>وبلاگ</Text>
          <MerlonGlyph size={11} />
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(active); }} tintColor={colors.annabi} />}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <Text style={styles.lede}>راهنماها، شهرها و آنچه داده‌های گوپلازا درباره‌ی ایرانیان کانادا می‌گویند.</Text>
            <FlatList
              horizontal
              inverted
              showsHorizontalScrollIndicator={false}
              data={[{ slug: "__all", name: "همه" } as BlogCategory, ...cats]}
              keyExtractor={(c) => c.slug}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const on = item.slug === "__all" ? active === null : active === item.slug;
                return (
                  <Pressable onPress={() => setActive(item.slug === "__all" ? null : item.slug)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.name}</Text>
                  </Pressable>
                );
              }}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>هنوز نوشته‌ای در این دسته منتشر نشده است.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/blog/${item.slug}`)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
          >
            {item.cover_url ? <Image source={{ uri: item.cover_url }} style={styles.cover} resizeMode="cover" /> : null}
            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                {item.category_slug ? <Text style={styles.cat}>{catName.get(item.category_slug) ?? item.category_slug}</Text> : null}
                <Text style={styles.meta}>{faDate(item.published_at)}</Text>
                {item.reading_minutes ? (
                  <View style={styles.metaTime}>
                    <Clock size={11} color={colors.mutedText} />
                    <Text style={styles.meta}>{fa(item.reading_minutes)} دقیقه</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.excerpt ? <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text> : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingBottom: space.sm },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  title: { ...type.h1, fontSize: 24 },
  lede: { ...type.muted, textAlign: "right" },
  list: { paddingHorizontal: space.md, paddingBottom: space.xl, gap: space.sm + 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.card },
  chipOn: { backgroundColor: colors.text },
  chipText: { fontSize: 13, fontFamily: fonts.bold, color: colors.text },
  chipTextOn: { color: colors.onAnnabi },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadow.card },
  cover: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.bg },
  cardBody: { padding: space.md, gap: 6 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap" },
  metaTime: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  cat: { fontSize: 11, fontFamily: fonts.bold, color: colors.annabi, backgroundColor: colors.softAnnabi, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  meta: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText },
  cardTitle: { fontSize: 17, fontFamily: fonts.heavy, color: colors.text, lineHeight: 28, textAlign: "right" },
  excerpt: { ...type.muted, lineHeight: 24, textAlign: "right" },
  empty: { ...type.muted, textAlign: "center", paddingVertical: space.xl },
  err: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.annabi, textAlign: "right" },
});
