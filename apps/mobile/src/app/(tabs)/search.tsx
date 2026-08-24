// ============================================================================
// Source: apps/mobile/src/app/(tabs)/search.tsx
// Version: 2.0.0 — 2026-08-24
// Why: Search across name, English name and short description, with a category
//      filter — the same axes the web search offers.
//
//      v2 (24 Aug parity audit): the two layers 577ff4e gave the website and
//      not the app — live announcements matching the query, and the smart
//      expansion for sentences like «هوس آلبالو کردم» that no listing
//      contains literally.
//
//      Both keep the website's rules rather than a mobile-shaped version:
//      the model returns TERMS which are re-run through the same
//      `search_businesses` RPC (so it cannot invent a business), the block
//      is visibly labelled «جستجوی هوشمند» with the model's own reason line,
//      and it is asked for at all only when the literal search came back
//      thin — the cheapest gate is not making the call.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { Megaphone, Search as SearchIcon, Wand2, X } from "lucide-react-native";

import { ScreenHeader } from "../../components/brand-mark";
import { BusinessCardView } from "../../components/business-card";
import { SuggestionBox } from "../../components/suggestion-box";
import { expandQuery } from "../../lib/api";
import {
  listBusinesses,
  listCategories,
  searchAnnouncements,
  searchBusinesses,
  type AnnouncementHit,
  type BusinessCard,
  type Category,
} from "../../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

/** Below this many literal hits, the query is worth interpreting. Same as web. */
const THIN_RESULTS = 5;

export default function SearchScreen() {
  // The home hero and its quick chips deep-link here with ?q=; a fresh param
  // replaces whatever was typed, so the tab shows what the user asked for.
  const router = useRouter();
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
  const [announcements, setAnnouncements] = useState<AnnouncementHit[]>([]);
  const [smartHits, setSmartHits] = useState<BusinessCard[]>([]);
  const [smartReason, setSmartReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const chipsRef = useRef<ScrollView>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setSmartHits([]);
    setSmartReason(null);
    try {
      const q = term.trim();
      if (!q) {
        setAnnouncements([]);
        setResults((await listBusinesses({ category: category ?? undefined, limit: 60 })).rows);
        return;
      }

      // Layer 1 — ranked, Persian-aware search: the same RPC as the website.
      // Layer 2 — announcements matching the literal query. Independent of
      // layer 1, so it runs alongside rather than after.
      const [{ hits }, news] = await Promise.all([
        searchBusinesses({ q, category, limit: 60 }),
        searchAnnouncements(q, 6),
      ]);
      setResults(hits);
      setAnnouncements(news);
      if (hits.length >= THIN_RESULTS) return;

      // Layer 3 — interpretation, only for a query the literal engine could
      // not answer. Every result below still comes from the same RPC.
      const smart = await expandQuery(q);
      if (!smart?.terms.length) return;
      const seen = new Set(hits.map((h) => h.id));
      const found: BusinessCard[] = [];
      const perTerm = await Promise.all(
        smart.terms.slice(0, 4).map((t) => searchBusinesses({ q: t, category, limit: 8 }))
      );
      for (const { hits: termHits } of perTerm) {
        for (const hit of termHits) {
          if (seen.has(hit.id)) continue;
          seen.add(hit.id);
          found.push(hit);
        }
      }
      setSmartHits(found.slice(0, 12));
      // The reason is shown only next to results it explains — a lone
      // sentence with nothing under it would read as a claim about stock.
      setSmartReason(found.length ? smart.reason : null);
    } catch {
      setResults([]);
      setAnnouncements([]);
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

        {/* Same LTR-scroll-container point as listing-screen: without this,
            «همه» — the chip that clears the filter — sits off the right edge. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          ref={chipsRef}
          onContentSizeChange={() => chipsRef.current?.scrollToEnd({ animated: false })}
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
            <>
              {announcements.length ? (
                <View style={styles.newsBox}>
                  <View style={styles.newsHead}>
                    <Megaphone size={15} color={colors.lajvard} />
                    <Text style={styles.newsHeadText}>اعلان‌های مرتبط</Text>
                  </View>
                  {announcements.map((a) => (
                    <Pressable
                      key={a.announcement_id}
                      onPress={() =>
                        router.push(`/business/${encodeURIComponent(a.slug ?? a.business_id)}`)
                      }
                      style={styles.newsRow}
                    >
                      <Text style={styles.newsTitle} numberOfLines={1}>{a.announcement_title}</Text>
                      <Text style={styles.newsBiz} numberOfLines={1}>{a.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={styles.resultCount}>{results.length} نتیجه</Text>
            </>
          }
          ListFooterComponent={
            smartHits.length ? (
              <View style={styles.smartBox}>
                <View style={styles.newsHead}>
                  <Wand2 size={15} color={colors.lajvard} />
                  <Text style={styles.newsHeadText}>جستجوی هوشمند</Text>
                </View>
                {/* Labelled as interpretation, never as a match. */}
                <Text style={styles.smartNote}>
                  {smartReason ?? "این‌ها را بر اساس برداشت از جمله‌ی تو پیدا کردیم، نه تطابق کلمه‌به‌کلمه."}
                </Text>
                <View style={{ gap: space.sm, marginTop: space.sm }}>
                  {smartHits.map((b) => (
                    <BusinessCardView key={b.id} business={b} categoryLabel={labelFor(b.category)} />
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ gap: space.md }}>
              <Text style={styles.empty}>
                {smartHits.length
                  ? "چیزی دقیقاً با این عبارت پیدا نشد — پایین‌تر، بر اساس برداشت از جمله‌ات."
                  : "نتیجه‌ای پیدا نشد."}
              </Text>
              {/*
                The zero-result moment is when someone knows what is missing —
                but only when it really is a dead end. If the smart layer found
                something, asking «دنبال چی بودی که نبود؟» above those results
                would be asking about a question we just answered.
              */}
              {term.trim() && !smartHits.length ? (
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
  newsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
    ...shadow.card,
  },
  newsHead: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  newsHeadText: { fontSize: 13, fontFamily: fonts.heavy, color: colors.lajvard, textAlign: "right" },
  newsRow: { marginTop: space.sm },
  newsTitle: { ...type.body, fontFamily: fonts.bold, textAlign: "right" },
  newsBiz: { ...type.muted, textAlign: "right", marginTop: 1 },
  smartBox: { marginTop: space.md },
  smartNote: { ...type.muted, textAlign: "right", marginTop: 4, lineHeight: 22 },
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
