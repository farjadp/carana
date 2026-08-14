// ============================================================================
// Source: apps/mobile/src/theme.ts
// Version: 1.0.0 — 2026-08-22
// Why: One palette and spacing scale, matching the web brand tokens.
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
  success: "#0f7b4f",
  softAnnabi: "rgba(128, 0, 0, 0.08)",
  softLajvard: "rgba(0, 71, 171, 0.08)",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };

export const type = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 19, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 21 },
  muted: { fontSize: 12.5, color: colors.mutedText },
};
