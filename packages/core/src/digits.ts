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
