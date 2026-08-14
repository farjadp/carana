// ============================================================================
// Source: apps/mobile/src/theme.ts
// Version: 2.0.0 — 2026-08-14
// Why: One palette, spacing scale and type ramp, matching the web brand tokens.
//      v2 adds the Vazirmatn families (static faces — each weight is its own
//      family name, so styles use fontFamily, never fontWeight) and soft
//      elevation, replacing hard 1px borders as the main card treatment.
// Env / Identity: Pure constants.
// ============================================================================
export const colors = {
  bg: "#f6f1e8",
  surface: "#ffffff",
  text: "#14213d",
  mutedText: "#5f6472",
  line: "rgba(20, 33, 61, 0.10)",
  lajvard: "#0047ab",
  annabi: "#800000",
  // A deeper annabi for gradients-by-adjacency and pressed states.
  annabiDeep: "#5c0000",
  // Accent only, never a surface. Brand book, section 12.
  gold: "#c9a24b",
  success: "#0f7b4f",
  softAnnabi: "rgba(128, 0, 0, 0.08)",
  softLajvard: "rgba(0, 71, 171, 0.08)",
  softGold: "rgba(201, 162, 75, 0.16)",
  // Text on annabi surfaces — warm cream, not pure white.
  onAnnabi: "#f6f1e8",
  onAnnabiMuted: "rgba(246, 241, 232, 0.72)",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };

/**
 * Vazirmatn ships static faces, so every weight is a distinct family.
 * Use these instead of fontWeight — iOS silently falls back to the system
 * font when asked to synthesise a weight a custom family does not carry.
 */
export const fonts = {
  regular: "Vazirmatn_400Regular",
  medium: "Vazirmatn_500Medium",
  semibold: "Vazirmatn_600SemiBold",
  bold: "Vazirmatn_700Bold",
  heavy: "Vazirmatn_800ExtraBold",
};

export const type = {
  h1: { fontSize: 27, fontFamily: fonts.heavy, color: colors.text, lineHeight: 40 },
  h2: { fontSize: 18.5, fontFamily: fonts.bold, color: colors.text, lineHeight: 30 },
  body: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, lineHeight: 23 },
  muted: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.mutedText, lineHeight: 20 },
};

/** Soft card elevation — replaces the hard 1px border look. */
export const shadow = {
  card: {
    shadowColor: "#14213d",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: "#14213d",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
};
