// ============================================================================
// Source: apps/mobile/src/app/(tabs)/categories.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Browse every category with its listing count.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

import { BrandLoading, ScreenHeader } from "../../components/brand-mark";
import { countByCategory, listCategories, type Category } from "../../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cats, counted] = await Promise.all([listCategories(), countByCategory()]);
        setCategories(cats);
        setCounts(counted);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <BrandLoading />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="دسته‌بندی‌ها" subtitle="هر چه لازم داری، به زبان خودت" />
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/categories/${item.slug}`)}
          >
            <ChevronLeft size={18} color={colors.mutedText} />
            <View style={styles.rowBody}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <View style={styles.iconBox}>
              <Text style={styles.icon}>{item.icon ?? "•"}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{counts[item.slug] ?? 0}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { ...type.h1, textAlign: "right", paddingHorizontal: space.md, paddingVertical: space.md },
  list: { paddingHorizontal: space.md, gap: space.sm, paddingBottom: space.xl },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 20 },
  rowBody: { flex: 1 },
  name: { ...type.h2, fontSize: 16, textAlign: "right" },
  desc: { ...type.muted, textAlign: "right", marginTop: 3 },
  badge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.softLajvard,
    alignItems: "center",
  },
  badgeText: { fontSize: 12, fontFamily: fonts.bold, color: colors.lajvard },
});
