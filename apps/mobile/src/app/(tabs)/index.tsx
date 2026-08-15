// ============================================================================
// Source: apps/mobile/src/app/(tabs)/index.tsx
// Version: 4.0.0 — 2026-08-15
// Why: Home screen. v4 stops being a table of contents and starts being a
//      place. What changed and why:
//
//      • The hero speaks to the moment — the greeting follows the clock, and
//        the search field is a real input, so the first tap starts a search
//        instead of opening another screen with another empty field.
//      • Categories are photographs on a horizontal shelf (the same art the
//        website uses), because a 3×3 grid of emoji tiles reads as a settings
//        page. Counts stay — they are real numbers.
//      • Two rails that did not exist before, both derived from real state
//        and both absent when there is nothing true to say: "open right now"
//        (from working_hours, same clock as the profile) and "verified"
//        (from verified_until, same rule as the badge). No placeholder rows.
//      • Cities are photo tiles for the eight with art, an ink chip row for
//        the rest — no card whose background would 404.
//      • A quiet register card near the bottom: business owners are the
//        paying side; they get one clear door, not a banner.
//
//      Honesty rule stands: nothing rendered here claims a state the row does
//      not carry.
// Env / Identity: Public reads only.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, BadgeCheck, ChevronLeft, Clock3, Search, Store } from "lucide-react-native";
import { getVerificationStatus } from "@charana/core";

import { BrandLoading, BrandMark, MerlonGlyph, MerlonRow } from "../../components/brand-mark";
import { BusinessCardView } from "../../components/business-card";
import {
  countByCategory,
  listBusinesses,
  listCategories,
  listCities,
  listVerified,
  listWithSignals,
  type BusinessCard,
  type BusinessSignals,
  type Category,
} from "../../lib/businesses";
import { openNow } from "../../lib/hours";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const WEB = "https://charana.ca";
const { width: SCREEN_W } = Dimensions.get("window");
const fa = (n: number) => n.toLocaleString("fa-IR");

/** Cities with generated art on the website. Others render as chips. */
const CITY_ART: Record<string, { slug: string; fa: string }> = {
  toronto: { slug: "toronto", fa: "تورنتو" },
  vancouver: { slug: "vancouver", fa: "ونکوور" },
  montreal: { slug: "montreal", fa: "مونترال" },
  calgary: { slug: "calgary", fa: "کلگری" },
  ottawa: { slug: "ottawa", fa: "اتاوا" },
  edmonton: { slug: "edmonton", fa: "ادمونتون" },
  winnipeg: { slug: "winnipeg", fa: "وینیپگ" },
  halifax: { slug: "halifax", fa: "هلیفکس" },
};

function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return "شب بخیر";
  if (h < 12) return "صبح بخیر";
  if (h < 17) return "ظهر بخیر";
  if (h < 21) return "عصر بخیر";
  return "شب بخیر";
}

/** Category images are stored site-relative; make them absolute for the app. */
const absolute = (url: string | null) =>
  url ? (url.startsWith("http") ? url : `${WEB}${url}`) : null;

export default function HomeScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newest, setNewest] = useState<BusinessCard[]>([]);
  const [signals, setSignals] = useState<BusinessSignals[]>([]);
  const [verified, setVerified] = useState<BusinessSignals[]>([]);
  const [cities, setCities] = useState<{ city: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [cats, counted, latest, cityList, withSignals, verifiedRows] = await Promise.all([
        listCategories(),
        countByCategory(),
        listBusinesses({ limit: 5 }),
        listCities(),
        listWithSignals(80),
        listVerified(8),
      ]);
      setCategories(cats);
      setCounts(counted);
      setNewest(latest);
      setCities(cityList);
      setSignals(withSignals);
      // The rail must agree with the badge on the profile — same rule.
      setVerified(
        verifiedRows.filter((b) => {
          const s = getVerificationStatus(b).state;
          return s === "verified" || s === "expiring";
        })
      );
      setTotal(Object.values(counted).reduce((a, b) => a + b, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const labelFor = (slug: string | null) =>
    categories.find((c) => c.slug === slug)?.name ?? slug ?? "";

  // "Open now" is computed on the device clock at render, never stored.
  const openRail = useMemo(
    () =>
      signals
        .map((b) => ({ b, state: openNow(b.working_hours) }))
        .filter((x): x is { b: BusinessSignals; state: { open: true; label: string } } => !!x.state?.open)
        .slice(0, 8),
    [signals]
  );

  const artCities = cities.filter((c) => CITY_ART[c.city.toLowerCase()]).slice(0, 4);
  const chipCities = cities.filter((c) => !CITY_ART[c.city.toLowerCase()]).slice(0, 10);

  const submitSearch = () => {
    const q = query.trim();
    router.push(q ? { pathname: "/search", params: { q } } : "/search");
  };

  if (loading) return <BrandLoading />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.annabi}
          />
        }
      >
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroWatermark} pointerEvents="none">
            <BrandMark size={300} color={colors.onAnnabi} simple />
          </View>

          <View style={styles.heroTop}>
            <View style={styles.heroBrand}>
              <BrandMark size={30} color={colors.onAnnabi} />
              <Text style={styles.heroBrandName}>čārana</Text>
            </View>
            {total > 0 ? (
              <View style={styles.countChip}>
                <Text style={styles.countText}>{fa(total)} کسب‌وکار</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.headline}>دنبال چی می‌گردی؟</Text>
          <Text style={styles.subline}>کسب‌وکارهای ایرانی کانادا، یک‌جا و با اطمینان.</Text>

          <View style={styles.searchBar}>
            <Pressable onPress={submitSearch} hitSlop={8} style={styles.searchGo}>
              <ArrowLeft size={18} color={colors.onAnnabi} />
            </Pressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={submitSearch}
              placeholder="مثلاً دندان‌پزشک، رستوران، ریچموندهیل…"
              placeholderTextColor={colors.mutedText}
              returnKeyType="search"
              style={styles.searchInput}
              textAlign="right"
            />
            <Search size={18} color={colors.annabi} />
          </View>

          {/* Quick asks — the four most common intents, one tap each. */}
          <View style={styles.quickRow}>
            {[
              { q: "رستوران", label: "رستوران" },
              { q: "دندان‌پزشک", label: "دندان‌پزشک" },
              { q: "املاک", label: "املاک" },
              { q: "وکیل مهاجرت", label: "مهاجرت" },
            ].map((item) => (
              <Pressable
                key={item.q}
                style={({ pressed }) => [styles.quickChip, pressed && styles.pressed]}
                onPress={() => router.push({ pathname: "/search", params: { q: item.q } })}
              >
                <Text style={styles.quickText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.heroMerlon} pointerEvents="none">
            <MerlonRow color={colors.onAnnabi} opacity={0.2} height={9} />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Category shelf ───────────────────────────────────────────── */}
        <SectionHeader title="دسته‌بندی‌ها" onPress={() => router.push("/categories")} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shelf}
          // RTL: start the shelf from the right edge.
          style={styles.shelfScroll}
        >
          {categories.map((cat) => {
            const img = absolute(cat.image_url);
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.shelfCard, pressed && styles.pressed]}
                onPress={() => router.push(`/categories/${cat.slug}`)}
              >
                {img ? (
                  <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.softLajvard }]} />
                )}
                <View style={styles.shelfWash} />
                <View style={styles.shelfBottom}>
                  <Text style={styles.shelfIcon}>{cat.icon ?? "•"}</Text>
                  <Text style={styles.shelfName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={styles.shelfCount}>{fa(counts[cat.slug] ?? 0)} کسب‌وکار</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Open right now (only if any row actually is) ─────────────── */}
        {openRail.length > 0 ? (
          <>
            <SectionHeader title="همین حالا باز است" icon={<Clock3 size={15} color={colors.success} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={styles.shelfScroll}>
              {openRail.map(({ b, state }) => (
                <MiniCard
                  key={b.id}
                  business={b}
                  meta={labelFor(b.category)}
                  footer={state.label}
                  footerColor={colors.success}
                  onPress={() => router.push(`/business/${encodeURIComponent(b.slug ?? b.id)}`)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* ── Verified spotlight (only real badges) ────────────────────── */}
        {verified.length > 0 ? (
          <>
            <SectionHeader title="تأییدشده‌ها" icon={<BadgeCheck size={15} color={colors.lajvard} />} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} style={styles.shelfScroll}>
              {verified.map((b) => (
                <MiniCard
                  key={b.id}
                  business={b}
                  meta={[b.city, labelFor(b.category)].filter((v) => v && v !== "نامشخص").join(" · ")}
                  footer="مالکیت تأیید شده"
                  footerColor={colors.lajvard}
                  onPress={() => router.push(`/business/${encodeURIComponent(b.slug ?? b.id)}`)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* ── Newest ───────────────────────────────────────────────────── */}
        <SectionHeader title="تازه‌ترین‌ها" />
        <View style={styles.list}>
          {newest.map((b) => (
            <BusinessCardView key={b.id} business={b} categoryLabel={labelFor(b.category)} />
          ))}
        </View>

        {/* ── Cities ───────────────────────────────────────────────────── */}
        <SectionHeader title="شهر تو" onPress={() => router.push("/cities")} />
        {artCities.length > 0 ? (
          <View style={styles.cityGrid}>
            {artCities.map((c) => {
              const art = CITY_ART[c.city.toLowerCase()];
              return (
                <Pressable
                  key={c.city}
                  // A single tile spans the row; a lone half-width card looks like a bug.
                  style={({ pressed }) => [styles.cityTile, artCities.length === 1 && styles.cityTileWide, pressed && styles.pressed]}
                  onPress={() => router.push(`/cities/${encodeURIComponent(c.city)}`)}
                >
                  <Image
                    source={{ uri: `${WEB}/images/cities/${art.slug}.webp` }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <View style={styles.cityWash} />
                  <View style={styles.cityBottom}>
                    <Text style={styles.cityFa}>{art.fa}</Text>
                    <Text style={styles.cityMeta}>{fa(c.count)} کسب‌وکار</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {chipCities.length > 0 ? (
          <View style={styles.cityWrap}>
            {chipCities.map((c) => (
              <Pressable
                key={c.city}
                style={({ pressed }) => [styles.cityChip, pressed && styles.pressed]}
                onPress={() => router.push(`/cities/${encodeURIComponent(c.city)}`)}
              >
                <Text style={styles.cityChipName}>{c.city}</Text>
                <Text style={styles.cityChipCount}>{fa(c.count)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* ── Owner door ───────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.ownerCard, pressed && styles.pressed]}
          onPress={() => router.push("/register")}
        >
          <View style={styles.ownerIcon}>
            <Store size={22} color={colors.annabi} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ownerTitle}>کسب‌وکار داری؟</Text>
            <Text style={styles.ownerBody}>
              رایگان ثبتش کن؛ اگر وب‌سایت داری، اطلاعاتش را خودمان می‌خوانیم.
            </Text>
          </View>
          <ChevronLeft size={18} color={colors.mutedText} />
        </Pressable>

        <View style={styles.foot}>
          <MerlonRow color={colors.gold} height={7} opacity={0.6} />
          <Text style={styles.footText}>با اطمینان پیدا کن.</Text>
        </View>

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  onPress,
  icon,
}: {
  title: string;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      {onPress ? (
        <Pressable onPress={onPress} style={styles.moreBtn} hitSlop={8}>
          <Text style={styles.moreText}>همه</Text>
          <ChevronLeft size={16} color={colors.lajvard} />
        </Pressable>
      ) : (
        <View />
      )}
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {icon ?? <MerlonGlyph size={11} />}
      </View>
    </View>
  );
}

/** Compact card for the horizontal rails. */
function MiniCard({
  business,
  meta,
  footer,
  footerColor,
  onPress,
}: {
  business: BusinessCard;
  meta?: string;
  footer: string;
  footerColor: string;
  onPress: () => void;
}) {
  const initial = business.name.trim().charAt(0);
  const logo = business.logo_url && !business.logo_url.endsWith(".svg") ? business.logo_url : null;
  return (
    <Pressable style={({ pressed }) => [styles.mini, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.miniHead}>
        <View style={styles.miniAvatar}>
          {logo ? (
            <Image source={{ uri: logo }} style={StyleSheet.absoluteFill} />
          ) : (
            <Text style={styles.miniInitial}>{initial}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.miniName} numberOfLines={1}>
            {business.name}
          </Text>
          {meta ? (
            <Text style={styles.miniMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.miniFooter}>
        <View style={[styles.dot, { backgroundColor: footerColor }]} />
        <Text style={[styles.miniFooterText, { color: footerColor }]} numberOfLines={1}>
          {footer}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

const SHELF_W = Math.min(150, SCREEN_W * 0.4);
const MINI_W = Math.min(220, SCREEN_W * 0.62);
const TILE_W = (SCREEN_W - space.md * 2 - space.sm) / 2;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: space.sm },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },

  // Hero
  hero: {
    marginHorizontal: space.md,
    backgroundColor: colors.annabi,
    borderRadius: radius.lg + 4,
    paddingTop: space.md,
    paddingBottom: space.lg + 12,
    paddingHorizontal: space.md + 2,
    overflow: "hidden",
    ...shadow.raised,
  },
  heroWatermark: { position: "absolute", top: -110, left: -120, opacity: 0.07 },
  heroTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  heroBrand: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  heroBrandName: { fontSize: 20, fontFamily: fonts.heavy, color: colors.onAnnabi, letterSpacing: 0.4 },
  countChip: {
    backgroundColor: "rgba(246, 241, 232, 0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.onAnnabi },
  greeting: { fontSize: 13.5, fontFamily: fonts.medium, color: colors.onAnnabiMuted, textAlign: "right" },
  headline: {
    fontSize: 27,
    lineHeight: 40,
    fontFamily: fonts.heavy,
    color: colors.onAnnabi,
    textAlign: "right",
    marginTop: 2,
  },
  subline: { ...type.body, color: colors.onAnnabiMuted, textAlign: "right", marginTop: 2 },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingRight: space.md,
    paddingLeft: 6,
    paddingVertical: 6,
    marginTop: space.md,
    ...shadow.card,
  },
  searchInput: { flex: 1, ...type.body, color: colors.text, paddingVertical: 8 },
  searchGo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.annabi,
    alignItems: "center",
    justifyContent: "center",
  },
  quickRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: space.sm + 2 },
  quickChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(246, 241, 232, 0.35)",
  },
  quickText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.onAnnabi },
  heroMerlon: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },

  // Section header
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
  },
  sectionTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  sectionTitle: { ...type.h2 },
  moreBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 2 },
  moreText: { fontSize: 13, color: colors.lajvard, fontFamily: fonts.bold },

  // Category shelf
  shelfScroll: { flexGrow: 0 },
  shelf: { flexDirection: "row-reverse", gap: space.sm, paddingHorizontal: space.md },
  shelfCard: {
    width: SHELF_W,
    height: SHELF_W * 1.25,
    borderRadius: radius.md + 2,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  shelfWash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 33, 61, 0.38)" },
  shelfBottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, alignItems: "flex-end" },
  shelfIcon: { fontSize: 20, marginBottom: 2 },
  shelfName: { fontSize: 14, fontFamily: fonts.bold, color: colors.onAnnabi, textAlign: "right" },
  shelfCount: { fontSize: 11, fontFamily: fonts.medium, color: "rgba(246,241,232,0.78)", marginTop: 1 },

  // Rails
  rail: { flexDirection: "row-reverse", gap: space.sm, paddingHorizontal: space.md },
  mini: {
    width: MINI_W,
    backgroundColor: colors.surface,
    borderRadius: radius.md + 2,
    padding: space.md - 2,
    gap: space.sm,
    ...shadow.card,
  },
  miniHead: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  miniAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  miniInitial: { fontSize: 18, fontFamily: fonts.heavy, color: colors.annabi },
  miniName: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  miniMeta: { ...type.muted, textAlign: "right", marginTop: 1 },
  miniFooter: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  miniFooterText: { fontSize: 12, fontFamily: fonts.semibold, flex: 1, textAlign: "right" },

  list: { gap: space.sm, paddingHorizontal: space.md },

  // Cities
  cityGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  cityTile: {
    width: TILE_W,
    height: TILE_W * 0.72,
    borderRadius: radius.md + 2,
    overflow: "hidden",
    backgroundColor: colors.text,
  },
  cityTileWide: { width: SCREEN_W - space.md * 2, height: TILE_W * 0.72 },
  cityWash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20, 33, 61, 0.42)" },
  cityBottom: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, alignItems: "flex-end" },
  cityFa: { fontSize: 17, fontFamily: fonts.heavy, color: colors.onAnnabi },
  cityMeta: { fontSize: 11.5, fontFamily: fonts.medium, color: "rgba(246,241,232,0.78)" },
  cityWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: space.md,
    marginTop: space.sm,
  },
  cityChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.softLajvard,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityChipName: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.lajvard },
  cityChipCount: { fontSize: 11, fontFamily: fonts.medium, color: colors.lajvard, opacity: 0.7 },

  // Owner card
  ownerCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: space.sm + 2,
    marginHorizontal: space.md,
    marginTop: space.lg,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(128, 0, 0, 0.14)",
    ...shadow.card,
  },
  ownerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  ownerBody: { ...type.muted, textAlign: "right", marginTop: 2 },

  foot: { alignItems: "center", gap: 8, marginTop: space.lg },
  footText: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.mutedText },

  errorBox: {
    backgroundColor: colors.softAnnabi,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.md,
    marginHorizontal: space.md,
  },
  errorText: { color: colors.annabi, fontSize: 13, fontFamily: fonts.medium, textAlign: "center" },
});
