// ============================================================================
// Source: apps/mobile/src/app/(tabs)/cities.tsx
// Version: 2.0.0 — 2026-08-23
// Why: Browse by location, province first and city underneath — mirroring web.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MapPin } from "lucide-react-native";

import { listProvinces, type ProvinceSummary } from "../../lib/businesses";
import { colors, radius, space, type } from "../../theme";

export default function LocationsScreen() {
  const router = useRouter();
  const [provinces, setProvinces] = useState<ProvinceSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProvinces()
      .then(setProvinces)
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
      <Text style={styles.title}>استان‌ها و شهرها</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {provinces.map(({ province, total, cities }) => (
          <View key={province.slug} style={styles.group}>
            <Pressable
              style={styles.provinceRow}
              onPress={() => router.push(`/provinces/${province.slug}`)}
            >
              <ChevronLeft size={18} color={colors.mutedText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.provinceName}>{province.name}</Text>
                <Text style={styles.provinceEn}>{province.nameEn}</Text>
              </View>
              <View style={styles.pin}>
                <MapPin size={18} color={colors.lajvard} />
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{total}</Text>
              </View>
            </Pressable>

            {cities.length > 0 ? (
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
            ) : null}
          </View>
        ))}
        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { ...type.h1, textAlign: "right", paddingHorizontal: space.md, paddingVertical: space.md },
  scroll: { paddingHorizontal: space.md },
  group: { marginBottom: space.lg },
  provinceRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  provinceName: { ...type.h2, fontSize: 16, textAlign: "right" },
  provinceEn: { ...type.muted, textAlign: "right", marginTop: 1 },
  pin: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.softLajvard, alignItems: "center", justifyContent: "center",
  },
  badge: {
    minWidth: 34, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, backgroundColor: colors.softAnnabi, alignItems: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.annabi },
  chipRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  chip: {
    flexDirection: "row-reverse", alignItems: "center", gap: 5,
    paddingHorizontal: space.sm, paddingVertical: 6,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.line,
  },
  chipText: { fontSize: 12.5, color: colors.text, fontWeight: "600" },
  chipCount: { fontSize: 11, color: colors.mutedText },
});
