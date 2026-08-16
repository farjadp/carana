// ============================================================================
// Source: lib/utils/digits.ts
// Version: 1.0.0 — 2026-08-16
// Why: The app forces RTL, so the keyboard opens in Persian and users type
//      Persian (۰-۹) or Arabic-Indic (٠-٩) digits into phone and numeric
//      fields. Anything that parses digits must fold them first — see the
//      gotchas file, this has bitten sign-in and verification already.
// Env / Identity: Pure.
// ============================================================================
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
