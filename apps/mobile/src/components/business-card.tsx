// ============================================================================
// Source: apps/mobile/src/components/business-card.tsx
// Version: 2.0.0 — 2026-08-24
// Why: One listing row, used on the home, category, city and search screens.
//
//      v2 (24 Aug): the «ویژه» chip. It is not decoration — listBusinesses'
//      default order gives paid plans FEATURED_RANDOM_BOOST more weight, and
//      house rule #2 in plans.ts allows that only where the listing is
//      visibly labelled. The chip landed in the same change as the boost, on
//      purpose. `isFeatured` (not `plan === "featured"`) so an expired
//      plan_until stops the chip the moment it lapses, whatever the column
//      still says, and so Platinum counts too.
// Env / Identity: Presentational only.
// ============================================================================
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Flame, Moon, Star } from "lucide-react-native";
import { activeBusyStatus, isFeatured } from "@goplaza/core";

import type { BusinessCard as Business } from "../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../theme";

export function BusinessCardView({
  business,
  categoryLabel,
}: {
  business: Business;
  categoryLabel?: string;
}) {
  // "نامشخص" is the placeholder city on imported rows with no location.
  const meta = [business.city, categoryLabel ?? business.category]
    .filter((v) => v && v !== "نامشخص")
    .join(" · ");

  const initial = business.name.trim().charAt(0);
  const router = useRouter();
  // Self-expiring — activeBusyStatus checks busy_status_until, not just
  // whether the column is set, same as everywhere else this renders.
  const busy = activeBusyStatus(business);
  const featured = isFeatured(business);

  return (
    // Not Link asChild: expo-router's Slot drops a Pressable's function-style,
    // which silently erased this card's background, border and shadow.
    <Pressable
      onPress={() => router.push(`/business/${encodeURIComponent(business.slug ?? business.id)}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
        <View style={styles.row}>
          <View style={styles.avatar}>
            {business.logo_url && !business.logo_url.endsWith(".svg") ? (
              <Image source={{ uri: business.logo_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initial}</Text>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {business.name}
              </Text>
              {featured ? (
                <View style={styles.featuredChip}>
                  <Star size={10} color={colors.annabi} fill={colors.annabi} />
                  <Text style={styles.featuredChipText}>ویژه</Text>
                </View>
              ) : null}
            </View>
            {busy ? (
              <View style={[styles.busyChip, busy === "busy" ? styles.busyChipBusy : styles.busyChipQuiet]}>
                {busy === "busy" ? <Flame size={11} color="#fff" /> : <Moon size={11} color="#fff" />}
                <Text style={styles.busyChipText}>{busy === "busy" ? "الان شلوغه" : "الان خلوته"}</Text>
              </View>
            ) : null}
            {business.short_description ? (
              <Text style={styles.desc} numberOfLines={2}>
                {business.short_description}
              </Text>
            ) : null}
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          </View>
        </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  row: { flexDirection: "row-reverse", gap: space.md, alignItems: "flex-start" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.softAnnabi,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 20, fontFamily: fonts.heavy, color: colors.annabi },
  body: { flex: 1 },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  name: { ...type.h2, textAlign: "right", flexShrink: 1 },
  featuredChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: colors.softAnnabi,
  },
  featuredChipText: { fontSize: 10, fontFamily: fonts.heavy, color: colors.annabi },
  busyChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  busyChipBusy: { backgroundColor: "#dc2626" },
  busyChipQuiet: { backgroundColor: "#059669" },
  busyChipText: { fontSize: 10, fontFamily: fonts.heavy, color: "#fff" },
  desc: { ...type.body, color: colors.mutedText, textAlign: "right", marginTop: 4 },
  meta: { ...type.muted, textAlign: "right", marginTop: 8 },
});
