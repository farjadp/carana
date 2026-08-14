// ============================================================================
// Source: apps/mobile/src/components/brand-mark.tsx
// Version: 2.0.0 — 2026-08-14
// Why: The approved "Hidden Č" mark, plus the small brand kit built on it:
//      the Achaemenid stepped-merlon motif (the only ornament the brand book
//      allows), the shared tab-screen header, and the branded loading state.
//      Mark geometry matches the master pack exactly; regenerate from
//      charana-mark-primary.svg if that changes.
// ============================================================================
import { ActivityIndicator, StyleSheet, Text, View, type ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors, space, type } from "../theme";

/**
 * Below roughly 32pt the inner path muddies, so the brand book specifies a
 * simplified variant for small sizes — pass `simple`.
 */
export function BrandMark({
  size = 32,
  color = colors.annabi,
  simple = false,
}: {
  size?: number;
  color?: ColorValue;
  simple?: boolean;
}) {
  return (
    <Svg viewBox="0 0 1000 1000" width={size} height={size}>
      <Path
        fill={color}
        d="M760 190 C690 120 600 80 500 80 C268 80 80 268 80 500 C80 732 268 920 500 920
           C610 920 708 878 780 806 L666 692 C624 734 566 760 500 760 C356 760 240 644 240 500
           C240 356 356 240 500 240 C562 240 620 262 664 304 Z"
      />
      {simple ? null : (
        <>
          <Path
            fill={color}
            d="M364 548 C418 478 496 448 586 462 C652 472 704 508 748 560 L650 650
               C624 620 592 602 552 596 C496 588 448 608 416 650 Z"
          />
          <Path fill={color} d="M648 650 L790 650 L790 792 Z" />
        </>
      )}
      <Path fill={color} d="M438 318 L500 372 L562 318 L598 354 L500 442 L402 354 Z" />
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