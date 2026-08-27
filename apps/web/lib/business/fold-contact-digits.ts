// ============================================================================
// Source: lib/business/fold-contact-digits.ts
// Version: 1.0.0 — 2026-08-27
// Why: Fold Persian/Arabic digits in a listing's phone-like fields before they
//      are written. The app forces RTL, so a number typed on a Persian
//      keyboard arrives as «۴۱۶…» — the public page then renders it inside
//      `tel:${value}`, which no dialer accepts. The verification comparison
//      (normaliseContact) already folds at read time; the stored value and the
//      tel: link were the gap. Applied server-side in both the onboarding and
//      edit actions so every client is covered, not just the web form.
// Env / Identity: Pure helper, no I/O.
// ============================================================================
import { toLatinDigits } from "@goplaza/core";

const PHONE_FIELDS = ["phone", "whatsapp"] as const;

/** Mutates nothing: returns a copy with phone-like fields digit-folded. */
export function foldContactDigits<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = { ...payload };
  for (const key of PHONE_FIELDS) {
    if (typeof out[key] === "string") out[key] = toLatinDigits(out[key] as string).trim();
  }
  if (Array.isArray(out.branches)) {
    out.branches = out.branches.map((b) =>
      b && typeof b === "object" && typeof (b as Record<string, unknown>).phone === "string"
        ? { ...(b as Record<string, unknown>), phone: toLatinDigits((b as Record<string, unknown>).phone as string).trim() }
        : b
    );
  }
  return out as T;
}
