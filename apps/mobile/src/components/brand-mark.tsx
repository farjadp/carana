// ============================================================================
// Source: apps/mobile/src/components/brand-mark.tsx
// Version: 3.0.0 — 2026-08-18 (rebrand: GOPLAZA G-mark)
// Why: The GOPLAZA symbol, plus the small brand kit built on it: the stepped-
//      merlon accent motif, the shared tab-screen header, and the branded
//      loading state. Mark geometry is shared with apps/web/components/
//      brand-mark.tsx and scripts/generate-brand-assets.mjs — change all
//      three together. PROVISIONAL geometry traced from the 2026-08-18 brand
//      board; swap in the master SVG paths when the vector kit arrives.
// ============================================================================
import { ActivityIndicator, StyleSheet, Text, View, type ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, space, type } from "../theme";

/** `simple` is kept for call-site compatibility; the G-mark is one geometry. */
export function BrandMark({
  size = 32,
  color = colors.annabi,
  simple = false,
}: {
  size?: number;
  color?: ColorValue;
  simple?: boolean;
}) {
  void simple;
  return (
    <Svg viewBox="0 0 1000 1000" width={size} height={size}>
      <Path fill={color} d="M 813 176 A 450 450 0 1 0 711 897 L 627 738 A 270 270 0 1 1 643 271 Z" />
      <Path fill={color} d="M 470 410 H 920 V 900 H 836 L 730 774 V 590 H 470 Z" />
    </Svg>
  );
}

/**
 * A row of Achaemenid stepped merlons — the Persepolis parapet profile.
 * Purely decorative; use it sparingly as a section accent, never as a border
 * around content. One merlon is 36 units wide on a 48-unit period.
 */
export function MerlonRow({
  color = colors.gold,
  height = 8,
  opacity = 1,
}: {
  color?: string;
  height?: number;
  opacity?: number;
}) {
  const merlon = (x: number) =>
    `M${x},18 V12 H${x + 6} V6 H${x + 12} V0 H${x + 24} V6 H${x + 30} V12 H${x + 36} V18 Z`;
  const d = [0, 48, 96, 144, 192, 240, 288].map(merlon).join(" ");
  return (
    <Svg
      viewBox="0 0 324 18"
      width={(324 / 18) * height}
      height={height}
      opacity={opacity}
    >
      <Path fill={color} d={d} />
    </Svg>
  );
}

/** The three-step corner of a single merlon, used as a tiny section glyph. */
export function MerlonGlyph({ color = colors.gold, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 18 18" width={size} height={size}>
      <Path fill={color} d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" />
    </Svg>
  );
}

/** Shared header for the tab screens: mark, title, optional subtitle. */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={headerStyles.wrap}>
      <View style={headerStyles.titleRow}>
        <BrandMark size={26} simple />
        <Text style={headerStyles.title}>{title}</Text>
      </View>
      {subtitle ? <Text style={headerStyles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Branded loading state — the mark above the spinner, never a bare spinner. */
export function BrandLoading() {
  return (
    <View style={headerStyles.loading}>
      <BrandMark size={44} />
      <ActivityIndicator color={colors.annabi} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm },
  title: { ...type.h1, fontSize: 24, textAlign: "right", flex: 1 },
  subtitle: { ...type.muted, textAlign: "right", marginTop: 2 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    backgroundColor: colors.bg,
  },
});