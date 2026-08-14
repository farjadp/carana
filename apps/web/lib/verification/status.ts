// ============================================================================
// Source: lib/verification/status.ts
// Version: 1.0.0 — 2026-08-24
// Why: One definition of what "verified" means. The public profile, the owner
//      dashboard, the admin queue and any future search filter must agree, and
//      they only agree if they all read this file.
// Env / Identity: Pure. No IO, no Supabase, safe on both server and client.
// ============================================================================

/**
 * How long a verification lasts. Six months, expressed in days.
 *
 * A phone number that answered half a year ago is not evidence today. This is
 * the number that makes the badge mean something ongoing rather than
 * "someone once clicked a link".
 */
export const VERIFICATION_WINDOW_DAYS = 182;

/**
 * How early the renewal countdown becomes visible to the public.
 *
 * The owner sees the countdown from day one — it is their obligation. Visitors
 * only see it near the end, because "verified · 154 days to renewal" on every
 * listing reads as an expiry warning rather than as reassurance, and would
 * make a healthy directory look like one about to lapse.
 *
 * Set this to VERIFICATION_WINDOW_DAYS to show the countdown publicly for the
 * whole window.
 */
export const PUBLIC_COUNTDOWN_THRESHOLD_DAYS = 30;

/** When we nudge the owner. Renewal is possible any time from here. */
export const RENEWAL_OPENS_DAYS_BEFORE = 30;

export type VerificationMethod = "self_onboarded" | "claimed";

export type VerificationState =
  /** Never verified, or verified and then invalidated. */
  | "unverified"
  /** Verified and comfortably inside the window. */
  | "verified"
  /** Verified, but inside the renewal window. Still trustworthy. */
  | "expiring"
  /** The window closed. The badge is void until renewed. */
  | "expired"
  /** A contact point changed after verification, so the proof no longer matches. */
  | "superseded";

export interface VerifiableBusiness {
  verification_method?: VerificationMethod | null;
  verified_at?: string | null;
  verified_until?: string | null;
  verified_phone?: string | null;
  verified_email?: string | null;
  phone?: string | null;
  contact_email?: string | null;
}

export interface VerificationStatus {
  state: VerificationState;
  method: VerificationMethod | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  /** Negative once expired. */
  daysRemaining: number | null;
  /** True when the owner may start a renewal. */
  canRenew: boolean;
  /** True when a visitor should see the countdown, not only the owner. */
  showCountdownPublicly: boolean;
}

/**
 * Normalise a phone number far enough to compare two of them.
 *
 * Persian and Arabic-Indic digits are folded to ASCII for the same reason they
 * are in the SMS sender: the product runs RTL, the keyboard opens in Persian,
 * and a number stored from that keyboard shares no characters with one typed
 * on a Latin keyboard. Comparing them raw would silently void a valid badge.
 */
function normaliseContact(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[۰-۹٠-٩]/g, (ch) => {
      const code = ch.charCodeAt(0);
      const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
      return String(code - base);
    })
    .replace(/[\s\-()]/g, "")
    .toLowerCase()
    .trim();
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function getVerificationStatus(
  business: VerifiableBusiness,
  now: Date = new Date()
): VerificationStatus {
  const empty: VerificationStatus = {
    state: "unverified",
    method: null,
    verifiedAt: null,
    expiresAt: null,
    daysRemaining: null,
    canRenew: false,
    showCountdownPublicly: false,
  };

  if (!business.verified_at || !business.verified_until) return empty;

  const verifiedAt = new Date(business.verified_at);
  const expiresAt = new Date(business.verified_until);
  const method = business.verification_method ?? null;

  // A verification proves a contact point, not a row. If the listing's phone
  // or email was edited away from what was proven, the badge is void — it
  // would otherwise be possible to verify one number and then publish another.
  const phoneMoved =
    !!business.verified_phone &&
    normaliseContact(business.phone) !== normaliseContact(business.verified_phone);

  const emailMoved =
    !!business.verified_email &&
    !!business.contact_email &&
    normaliseContact(business.contact_email) !== normaliseContact(business.verified_email);

  if (phoneMoved || emailMoved) {
    return { ...empty, state: "superseded", method, verifiedAt, expiresAt };
  }

  const daysRemaining = daysBetween(now, expiresAt);
  const canRenew = daysRemaining <= RENEWAL_OPENS_DAYS_BEFORE;

  if (daysRemaining <= 0) {
    return {
      state: "expired",
      method,
      verifiedAt,
      expiresAt,
      daysRemaining,
      canRenew: true,
      showCountdownPublicly: true,
    };
  }

  return {
    state: daysRemaining <= RENEWAL_OPENS_DAYS_BEFORE ? "expiring" : "verified",
    method,
    verifiedAt,
    expiresAt,
    daysRemaining,
    canRenew,
    showCountdownPublicly: daysRemaining <= PUBLIC_COUNTDOWN_THRESHOLD_DAYS,
  };
}

/** The expiry to write when a verification succeeds right now. */
export function nextExpiry(from: Date = new Date()): Date {
  const out = new Date(from);
  out.setDate(out.getDate() + VERIFICATION_WINDOW_DAYS);
  return out;
}

/** True when the badge should be presented as currently meaningful. */
export function isTrusted(status: VerificationStatus): boolean {
  return status.state === "verified" || status.state === "expiring";
}

// ----------------------------------------------------------------------------
// Persian copy, kept next to the states so the two cannot drift apart
// ----------------------------------------------------------------------------
export const METHOD_LABEL: Record<VerificationMethod, string> = {
  self_onboarded: "ثبت‌شده توسط صاحب کسب‌وکار",
  claimed: "مالکیت احرازشده",
};

export const METHOD_EXPLANATION: Record<VerificationMethod, string> = {
  self_onboarded:
    "صاحب این کسب‌وکار خودش آن را در چارانا ثبت کرده و ایمیل و شماره موبایلش تایید شده است.",
  claimed:
    "این آگهی را چارانا ثبت کرده بود. صاحب کسب‌وکار با دریافت کد پیامکی روی همان شماره‌ای که در آگهی منتشر شده بود، مالکیتش را اثبات کرده است.",
};

export const STATE_LABEL: Record<VerificationState, string> = {
  unverified: "تایید نشده",
  verified: "تاییدشده",
  expiring: "تاییدشده",
  expired: "تایید منقضی شده",
  superseded: "اطلاعات تماس تغییر کرده",
};
