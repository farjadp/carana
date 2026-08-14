// ============================================================================
// Source: apps/mobile/src/components/business-card.tsx
// Version: 1.0.0 — 2026-08-22
// Why: One listing row, used on the home, category, city and search screens.
// Env / Identity: Presentational only.
// ============================================================================
import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
            <Text style={styles.name} numberOfLines={1}>
              {business.name}
            </Text>
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
  name: { ...type.h2, textAlign: "right" },
  desc: { ...type.body, color: colors.mutedText, textAlign: "right", marginTop: 4 },
  meta: { ...type.muted, textAlign: "right", marginTop: 8 },
});
