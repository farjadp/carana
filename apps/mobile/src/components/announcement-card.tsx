// ============================================================================
// Source: apps/mobile/src/components/announcement-card.tsx
// Version: 1.0.0 — 2026-08-16
// Why: One announcement, in the three shapes mobile needs — the home rail
//      ("rail"), a business's own profile ("banner", where the business name
//      is redundant), and the account tab's followed list ("row").
//      One component so the three never drift apart the way three inline
//      copies would.
// Env / Identity: Presentational. No IO.
// ============================================================================
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Megaphone } from "lucide-react-native";

import type { Announcement } from "../lib/announcements";
import { colors, fonts, radius, space } from "../theme";

export function AnnouncementCard({
  announcement: a,
  variant,
}: {
  announcement: Announcement;
  variant: "rail" | "banner" | "row";
}) {
  const router = useRouter();
  const target = a.business?.slug ?? a.business?.id;

  const body = (
    <>
      <View style={styles.head}>
        <Megaphone size={13} color={colors.gold} />
        {/* On a business's own profile the name is already the page title. */}
        {variant !== "banner" && a.business?.name ? (
          <Text style={styles.business} numberOfLines={1}>{a.business.name}</Text>
        ) : (
          <Text style={styles.eyebrow}>اعلان</Text>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>{a.title}</Text>
      {a.body ? (
        <Text style={styles.body} numberOfLines={variant === "rail" ? 2 : 3}>{a.body}</Text>
      ) : null}
    </>
  );

  // A banner sits on the page it would navigate to, so it is not a link.
  if (variant === "banner") {
    return <View style={[styles.card, styles.banner]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={() => target && router.push(`/business/${encodeURIComponent(target)}`)}
      style={({ pressed }) => [
        styles.card,
        variant === "rail" ? styles.rail : styles.row,
        pressed && { opacity: 0.75 },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softGold,
    padding: space.md,
  },
  rail: { width: 250 },
  row: { marginBottom: space.sm },
  banner: { marginTop: space.sm },

  head: { flexDirection: "row-reverse", alignItems: "center", gap: 5, marginBottom: 5 },
  business: { flex: 1, fontSize: 11, fontFamily: fonts.bold, color: colors.lajvard, textAlign: "right" },
  eyebrow: { fontSize: 11, fontFamily: fonts.bold, color: colors.gold, textAlign: "right" },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right", lineHeight: 22 },
  body: { fontSize: 12, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right", marginTop: 3, lineHeight: 20 },
});
