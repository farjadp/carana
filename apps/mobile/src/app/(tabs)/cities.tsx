// ============================================================================
// Source: apps/mobile/src/app/(tabs)/cities.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Browse cities by how many listings each one has.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MapPin } from "lucide-react-native";

import { listCities } from "../../lib/businesses";
import { colors, radius, space, type } from "../../theme";

export default function CitiesScreen() {
  const router = useRouter();
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCities()
      .then(setCities)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.annabi} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Text style={styles.title}>شهرها</Text>
      <FlatList
        data={cities}
        keyExtractor={(c) => c.city}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>هنوز شهری ثبت نشده است.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/cities/${encodeURIComponent(item.city)}`)}
          >
            <ChevronLeft size={18} color={colors.mutedText} />
            <Text style={styles.name}>{item.city}</Text>
            <View style={styles.pin}>
              <MapPin size={18} color={colors.lajvard} />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.count}</Text>
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
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softLajvard,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { ...type.h2, fontSize: 16, flex: 1, textAlign: "right" },
  badge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.annabi },
  empty: { ...type.muted, textAlign: "center", marginTop: space.xl },
});
