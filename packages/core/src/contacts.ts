// ============================================================================
// Source: packages/core/src/contacts.ts
// Version: 1.0.0 — 2026-08-26
// Why: A person has more than one address. The profile carried exactly one
//      email (the auth identity, not editable here) and one
//      `profiles.mobile_number`; «راه‌های تماس بیشتر» adds up to two more of
//      each in `profile_contacts`.
//
//      WHAT THESE ROWS ARE, AND WHAT THEY ARE NOT. They are contact details
//      the person chose to record. They are NOT login identities — Supabase
//      Auth has exactly one email per user, so a second address here can
//      neither receive a magic link nor recover a password — and nothing
//      verifies them. Both facts are said out loud in the UI; a "second
//      email" that silently cannot sign you in is the same class of lie as a
//      badge nothing backs.
//
//      The caps and the validators live here rather than in apps/web because
//      mobile has to agree with the site about what may be stored and how
//      many. The DB trigger enforces the count as well — this is the message,
//      that is the boundary.
// Env / Identity: Pure. No platform APIs; safe in the Expo bundle.
// ============================================================================
import { toLatinDigits } from "./digits";

export const CONTACT_KINDS = ["email", "phone"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/**
 * Extra rows allowed per kind, ON TOP OF the two the profile already holds
 * (the account email and `profiles.mobile_number`). Two extras therefore
 * means three addresses and three numbers in total, which is what was asked
 * for. `profile_contacts_cap` in the migration enforces the same number.
 */
export const MAX_EXTRA_CONTACTS = 2;

export const CONTACT_VALUE_MAX = 254;
export const CONTACT_LABEL_MAX = 40;

/** How many digits a phone number must carry to be worth storing. */
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15; // E.164

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Digits, spaces, dashes, dots, brackets and one leading +. Nothing else. */
const PHONE_SHAPE_RE = /^\+?[0-9\s().-]+$/;

export type ContactCheck =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Fold, trim and validate one contact value. Persian digits are folded FIRST
 * for phones: the app forces RTL, the keyboard opens in Persian, and «۶۴۷»
 * has bitten sign-in and phone verification here already.
 */
export function normalizeContactValue(kind: ContactKind, raw: string): ContactCheck {
  if (kind === "email") {
    const value = raw.trim().toLowerCase();
    if (!value) return { ok: false, error: "ایمیل را وارد کن." };
    if (value.length > CONTACT_VALUE_MAX) return { ok: false, error: "این نشانی بیش از حد بلند است." };
    if (!EMAIL_RE.test(value)) return { ok: false, error: "نشانی ایمیل معتبر نیست." };
    return { ok: true, value };
  }

  const value = toLatinDigits(raw).trim();
  if (!value) return { ok: false, error: "شماره را وارد کن." };
  if (!PHONE_SHAPE_RE.test(value)) return { ok: false, error: "شماره فقط می‌تواند رقم، فاصله، خط تیره و + داشته باشد." };
  const digits = value.replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return { ok: false, error: "شماره تلفن معتبر نیست." };
  }
  return { ok: true, value };
}

/** Optional free-text label («خانه»، «دفتر»). Empty becomes null. */
export function normalizeContactLabel(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim().slice(0, CONTACT_LABEL_MAX);
  return value || null;
}

/** Two values are the same contact when they normalise to the same string. */
export function isSameContact(kind: ContactKind, a: string, b: string): boolean {
  const left = normalizeContactValue(kind, a);
  const right = normalizeContactValue(kind, b);
  if (!left.ok || !right.ok) return false;
  if (kind === "email") return left.value === right.value;
  return left.value.replace(/\D/g, "") === right.value.replace(/\D/g, "");
}

export const CONTACT_KIND_LABELS_FA: Record<ContactKind, string> = {
  email: "ایمیل",
  phone: "شماره تماس",
};
