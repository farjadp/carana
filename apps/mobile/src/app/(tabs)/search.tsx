// ============================================================================
// Source: apps/mobile/src/app/(tabs)/search.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Search across name, English name and short description, with a category
//      filter — the same axes the web search offers.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search as SearchIcon, X } from "lucide-react-native";

import { ScreenHeader } from "../../components/brand-mark";
import { BusinessCardView } from "../../components/business-card";
import { SuggestionBox } from "../../components/suggestion-box";
import {
  listBusinesses,
  listCategories,
  searchBusinesses,
  type BusinessCard,
  type Category,
} from "../../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function SearchScreen() {
  // The home hero and its quick chips deep-link here with ?q=; a fresh param
  // replaces whatever was typed, so the tab shows what the user asked for.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [term, setTerm] = useState(q ?? "");
  // Track the last param we adopted, so a new deep link wins over stale typing
  // without a state-sync effect.
  const [adopted, setAdopted] = useState(q ?? "");
  if (typeof q === "string" && q !== adopted) {
    setAdopted(q);
    setTerm(q);
  }
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      if (term.trim()) {
        // Ranked, Persian-aware search — same RPC as the website.
        const { hits } = await searchBusinesses({ q: term, category, limit: 60 });
        setResults(hits);
      } else {
        setResults(await listBusinesses({ category: category ?? undefined, limit: 60 }));
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [term, category]);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [run]);

  const labelFor = (slug: string | null) =>
    categories.find((c) => c.slug === slug)?.name ?? slug ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="جستجو" />
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.mutedText} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="نام، خدمت، دسته یا شهر — فارسی یا انگلیسی"
            placeholderTextColor={colors.mutedText}
            style={styles.input}
            returnKeyType="search"
          />
          {term ? (
            <Pressable onPress={() => setTerm("")} hitSlop={8}>
              <X size={16} color={colors.mutedText} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label="همه" active={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={category === c.slug}
              onPress={() => setCategory(category === c.slug ? null : c.slug)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.lg }} color={colors.annabi} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Text style={styles.resultCount}>{results.length} نتیجه</Text>
          }
          ListEmptyComponent={
            <View style={{ gap: space.md }}>
              <Text style={styles.empty}>نتیجه‌ای پیدا نشد.</Text>
              {/* The zero-result moment is when someone knows what is missing. */}
              {term.trim() ? (
                <SuggestionBox
                  page={`search:${term.trim().slice(0, 80)}`}
                  title="دنبال چی بودی که نبود؟"
                  hint="بگو یا بنویس — همین درخواست‌ها می‌گویند چه کسب‌وکاری را باید پیدا و دعوت کنیم."
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <BusinessCardView business={item} categoryLabel={labelFor(item.category)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.md, gap: space.sm },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    ...shadow.card,
  },
  input: { flex: 1, ...type.body, textAlign: "right", padding: 0 },
  chips: { flexDirection: "row-reverse", gap: space.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  chipActive: { backgroundColor: colors.annabi },
  chipText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.text },
  chipTextActive: { color: "#fff" },
  list: { padding: space.md, gap: space.sm, paddingBottom: space.xl },
  resultCount: { ...type.muted, textAlign: "right", marginBottom: space.xs },
  empty: { ...type.muted, textAlign: "center", marginTop: space.xl },
});
