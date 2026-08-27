// ============================================================================
// Source: packages/core/src/link.ts
// Version: 1.0.0 — 2026-08-25
// Why: GPLZ Link — the link-in-bio product served from `gplz.link` by this
//      same app. Three things live here because web, mobile and the server
//      must all answer them identically:
//
//        1. What a handle is allowed to look like.
//        2. How a short link is built.
//        3. What each of the two packages actually includes.
//
//      (3) is the important one. The free/paid split is a product decision,
//      and if the pricing page, the editor's "5 links" cap and the server's
//      clamp each carry their own copy of it, they drift — which is precisely
//      how a hand-typed second copy of GALLERY_LIMITS on mobile ended up
//      promising five photos against a server that allowed three. One table,
//      read by everyone.
//
//      WHAT IS DELIBERATELY NOT HERE: whether a handle is *available*. Format
//      is a rule (it belongs in code); reservation is state — the reserved
//      list, the 90-day cooldown after a release, and existing handles all
//      live in the database and are asked through `handle_available()`. A
//      client-side copy of the reserved list would be a second source of
//      truth that goes stale the first time a route is added.
//
// Env / Identity: Pure data and string work. No IO, no secrets, no platform
//      APIs — safe in the Expo bundle.
// ============================================================================
import { brand } from "./brand";
import { toLatinDigits } from "./digits";
import { entitlementsFor, hasLinkPro, type BillingRow } from "./entitlements";

// ---------------------------------------------------------------- 1. handles

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;

/**
 * Lowercase latin letters, digits and hyphens; must start and end with a
 * letter or digit; 3 to 30 characters. Byte-for-byte the same expression as
 * the `link_pages_handle_format` CHECK — if you change one, change both, or
 * the server will accept what the database rejects and the user gets a 500
 * instead of a sentence.
 *
 * The minimum length is expressed IN the pattern (1 + {1,28} + 1) rather than
 * checked separately. The first version did it the other way round, and the
 * database — which has no `HANDLE_MIN` — would have accepted a single
 * character. Two-letter handles are the first thing a squatter reaches for.
 * Corrected in 20260830360000_handle_format_fix.sql after calling
 * `handle_available('ab')` against the real database returned true.
 */
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/**
 * What the user typed → what we would store. Folds Persian and Arabic-Indic
 * digits first: the app forces RTL, so `کباب۲۲` arrives with digits that no
 * ASCII pattern matches, and without this the handle is rejected as invalid
 * for a reason nobody can see on screen.
 *
 * Trims, lowercases, and collapses repeated hyphens. It does NOT strip
 * illegal characters — silently deleting part of what someone typed produces
 * a handle they did not choose. Validation reports instead.
 */
export function normalizeHandle(raw: string): string {
  return toLatinDigits(raw).trim().toLowerCase().replace(/-{2,}/g, "-");
}

export type HandleCheck =
  | { ok: true; handle: string }
  | { ok: false; reason: HandleProblem; message: string };

export type HandleProblem = "empty" | "too_short" | "too_long" | "format";

/**
 * Format only. A `true` here means "this string is shaped like a handle", not
 * "you can have it" — availability is a database question. See the header.
 */
export function validateHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw ?? "");

  if (!handle) {
    return { ok: false, reason: "empty", message: "یک آدرس وارد کن." };
  }
  if (handle.length < HANDLE_MIN) {
    return {
      ok: false,
      reason: "too_short",
      message: `آدرس باید حداقل ${HANDLE_MIN} کاراکتر باشد.`,
    };
  }
  if (handle.length > HANDLE_MAX) {
    return {
      ok: false,
      reason: "too_long",
      message: `آدرس نباید بیشتر از ${HANDLE_MAX} کاراکتر باشد.`,
    };
  }
  if (!HANDLE_RE.test(handle)) {
    return {
      ok: false,
      reason: "format",
      message:
        "فقط حروف انگلیسی کوچک، عدد و خط تیره — بدون فاصله و بدون حرف فارسی، و نباید با خط تیره شروع یا تمام شود. مثال: kababsara",
    };
  }
  return { ok: true, handle };
}

/**
 * The handle a page gets when its owner has not bought a custom one. Derived
 * from the business reference number so it is stable, unique and short.
 * Intentionally ugly: nobody prints `g-4821` on a shop window, which is what
 * makes the custom handle the sharpest thing in the paid tier.
 */
export function fallbackHandle(refNo: number | string): string {
  return `g-${toLatinDigits(String(refNo)).replace(/\D/g, "")}`;
}

// ------------------------------------------------------------ 2. short links

/** The prefixes `gplz.link` serves besides bio pages. Each is also a reserved
 *  handle in the database — add to both, in the same commit, or a user page
 *  will shadow a real route. */
export type ShortKind = "b" | "j" | "a";

/** `https://gplz.link/b/4821` — a profile, a job post, an announcement. */
export function shortLink(kind: ShortKind, id: string | number): string {
  return `${brand.shortUrl}/${kind}/${encodeURIComponent(String(id))}`;
}

/** `https://gplz.link/kababsara` — a bio page. */
export function bioUrl(handle: string): string {
  return `${brand.shortUrl}/${encodeURIComponent(handle)}`;
}

/** `gplz.link/kababsara` — for display, where the scheme is noise. */
export function bioUrlDisplay(handle: string): string {
  return `${brand.shortDomain}/${handle}`;
}

// -------------------------------------------------------- 3. the two packages

/** Cents, CAD. Same convention as plans.ts. */
export const LINK_PRO_PRICE = { month: 1300, year: 13000 } as const;
export type LinkInterval = keyof typeof LINK_PRO_PRICE;

export const LINK_PRO_NAME_FA = "لینک حرفه‌ای";
export const LINK_PRO_NAME_EN = "Link Pro";

export type LinkLimits = {
  /** Custom links an owner may add. Mirror modules are never capped — they
   *  are the reason the page is worth having. `null` means unlimited. */
  customLinks: number | null;
  /** Pages per owner (branches, or a second language). */
  pages: number;
  /** How far back the analytics may be read, in days. */
  analyticsDays: number;
  /** Per-item click counts and the referrer / device breakdown. */
  analyticsBreakdown: boolean;
  /** Mirror modules beyond the always-free contact set. */
  richModules: boolean;
  /** Print-resolution vector QR instead of a framed PNG. */
  qrVector: boolean;
  /** Time-windowed links (a Nowruz offer that removes itself). */
  scheduling: boolean;
  /** Email/phone capture form. */
  leadForm: boolean;
  /** FA/EN toggle on the page. */
  bilingual: boolean;
  /** Owner-supplied Meta/GA pixel. */
  pixel: boolean;
  /** May choose their own handle rather than the g-#### fallback. */
  customHandle: boolean;
  /** May remove the "ساخته‌شده با پلازا" footer. */
  footerRemovable: boolean;
  /** Full theme control rather than the three presets. */
  themeCustom: boolean;
};

/**
 * The whole free/paid split, once.
 *
 * The free tier is deliberately generous: its footer is a growth channel, not
 * a feature, and a free tier nobody uses advertises to nobody. What it does
 * not get is the one thing every serious owner wants — their own name in the
 * URL.
 */
export const LINK_LIMITS: Record<"free" | "pro", LinkLimits> = {
  free: {
    customLinks: 5,
    pages: 1,
    analyticsDays: 7,
    analyticsBreakdown: false,
    richModules: false,
    qrVector: false,
    scheduling: false,
    leadForm: false,
    bilingual: false,
    pixel: false,
    customHandle: false,
    footerRemovable: false,
    themeCustom: false,
  },
  pro: {
    customLinks: null,
    pages: 3,
    analyticsDays: 90,
    analyticsBreakdown: true,
    richModules: true,
    qrVector: true,
    scheduling: true,
    leadForm: true,
    bilingual: true,
    pixel: true,
    customHandle: true,
    footerRemovable: true,
    themeCustom: true,
  },
};

/**
 * What this owner's link page may do right now.
 *
 * `hasLinkPro` is expiry-aware and treats a paid directory plan as granting
 * Link Pro, so Starter at $21 strictly dominates Link Pro at $13 rather than
 * competing with it. Never branch on `link_pro_until` directly.
 */
export function linkLimitsFor(row: BillingRow | null | undefined, now = new Date()): LinkLimits {
  return hasLinkPro(row, now) ? LINK_LIMITS.pro : LINK_LIMITS.free;
}

/** Which thing is being measured. The window differs per subject, and the
 *  first version of this function got that wrong by answering for both at
 *  once — a free listing is promised 30 days of *listing* insights, which is
 *  not permission to see 30 days of *link page* insights. */
export type AnalyticsSubject = "business" | "link_page";

/**
 * How many days of analytics this owner may read for a given subject.
 *
 * Every number below is one that is already promised in writing somewhere;
 * none is invented here:
 *   business · free           30  — plans.ts free bullet «آمار پایه … ۳۰ روز»
 *   business · insights_full  90  — plans.ts Starter bullet «آمار کامل: ۹۰ روز»
 *   link_page · free           7  — LINK_LIMITS.free
 *   link_page · Link Pro      90  — LINK_LIMITS.pro
 *
 * There is deliberately no 365 here. A longer window for Premium is an idea,
 * not a shipped promise, and this file is read by the pricing surfaces — the
 * moment a number lands here it becomes a claim. Add it together with the
 * bullet that sells it, the same rule plans.ts states about its own bullets.
 *
 * Everyone's events are *recorded* in full regardless; the plan gates the
 * query, never the data. So an upgrade reveals real history instead of an
 * empty chart — and by the same token a locked window may only be advertised
 * where data behind it actually exists.
 *
 * `link_page_summary` in the database clamps to a hard ceiling of its own.
 * This is the product rule; that is the backstop.
 */
export function analyticsWindowFor(
  row: BillingRow | null | undefined,
  subject: AnalyticsSubject,
  now = new Date(),
): number {
  if (subject === "link_page") return linkLimitsFor(row, now).analyticsDays;

  const ent = entitlementsFor(row, now);
  if (ent.has("insights_full")) return 90;
  return 30; // insights_basic, which every plan including free has
}

/**
 * Is the GOPLAZA footer rendered? `footer_hidden` on the row is what the
 * owner ASKED for; this is what actually happens. Unlike `owner_privacy` —
 * where what would come back is a person's name, so hiding survives a lapse —
 * what comes back here is our own advertisement, so it returns the moment the
 * subscription does.
 */
export function showsFooter(
  row: BillingRow | null | undefined,
  footerHidden: boolean,
  now = new Date(),
): boolean {
  return !(footerHidden && linkLimitsFor(row, now).footerRemovable);
}
