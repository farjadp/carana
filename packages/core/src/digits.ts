// ============================================================================
// Source: packages/core/src/digits.ts
// Version: 1.0.0 — 2026-08-25
// Why: The app forces RTL, so the keyboard opens in Persian and people type
//      Persian (۰-۹) or Arabic-Indic (٠-٩) digits into fields that are then
//      parsed as ASCII. This has already broken sign-in and phone
//      verification; see docs/06-gotchas.md.
//
//      It lands in @goplaza/core now because the link handle needs the same
//      fold and mobile needs it too. Two copies already exist in apps/web
//      (lib/utils/digits.ts and lib/sms/send.ts) — identical in behaviour,
//      different in implementation, which is exactly how a rule drifts. This
//      is the canonical one; the open task "dedupe toLatinDigits" points the
//      other two here. Nothing was edited in apps/web to add this file, so it
//      cannot change existing behaviour.
// Env / Identity: Pure. Safe on web and native.
// ============================================================================

/**
 * Persian (U+06F0–U+06F9) and Arabic-Indic (U+0660–U+0669) digits to ASCII.
 * Everything else in the string is left exactly as it was — this folds
 * digits, it does not sanitise or trim.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * ASCII digits to Persian, character for character — no grouping, no sign
 * handling, non-digits untouched. The inverse of toLatinDigits for display.
 * Until 27 Aug this lived as ~7 near-identical `const fa = …` copies in
 * apps/web; the grouped variant below had ~38. Same drift risk as the fold.
 */
export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Locale-formatted Persian number — Persian digits WITH the Persian
 * thousands separator («۶٬۱۵۵»). Not interchangeable with faDigits: a year
 * or a phone fragment wants faDigits; a count wants this.
 */
export function faNumber(n: number): string {
  return n.toLocaleString("fa-IR");
}
