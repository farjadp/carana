// ============================================================================
// Source: apps/mobile/src/app/index.tsx
// Version: 1.0.0 — 2026-08-21
// Why: First real screen — proves types, query, RLS and UI end to end.
// Env / Identity: Reads the public directory with the anon client.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { listBusinesses, type DirectoryBusiness } from "../lib/businesses";

export default function DirectoryScreen() {
  const [items, setItems] = useState<DirectoryBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listBusinesses({ search: search.trim() || undefined });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  // useEffect never runs during the web pre-render, so the fetch only happens
  // on a real client. Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>čārana</Text>
      <Text style={styles.subtitle}>کسب‌وکارهای ایرانی در کانادا</Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="جستجوی نام کسب‌وکار…"
        placeholderTextColor="#9ca3af"
        style={styles.search}
        textAlign={I18nManager.isRTL ? "right" : "left"}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? "نتیجه‌ای پیدا نشد." : "هنوز کسب‌وکاری منتشر نشده است."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.short_description ? (
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.short_description}
              </Text>
            ) : null}
            <Text style={styles.cardMeta}>
              {[item.city, item.category].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfcfb", paddingTop: 64, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "800", color: "#800000", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 4, marginBottom: 20 },
  search: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  list: { paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0eeec",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1f2937", textAlign: "right" },
  cardBody: { fontSize: 14, color: "#6b7280", marginTop: 6, textAlign: "right", lineHeight: 20 },
  cardMeta: { fontSize: 12, color: "#9ca3af", marginTop: 10, textAlign: "right" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  errorBox: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: "#b91c1c", fontSize: 13, textAlign: "center" },
});
