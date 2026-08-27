// ============================================================================
// Source: app/complaint/categories.ts
// Version: 1.0.0 — 2026-08-26
// Why: Complaint subjects, in a plain module both the form and the server
//      action import. NOT in actions.ts: a "use server" file may only export
//      async functions, so an object declared there reaches the client as
//      undefined and the select silently renders zero options — exactly the
//      bug the support form shipped with for an hour.
//
//      `route` decides which mailbox the complaint lands in. Privacy goes to
//      the privacy address because that is the one /privacy promises and the
//      one the 30-day clock is written against; everything else goes to
//      management, because a complaint that lands in the general support
//      queue is a complaint that waits behind password resets.
// Env / Identity: Pure data. Safe on the client.
// ============================================================================

export type ComplaintRoute = "management" | "privacy";

export const COMPLAINT_CATEGORIES = {
  business: { label: "درباره‌ی یک کسب‌وکار در فهرست", route: "management" },
  listing: { label: "اطلاعات نادرست یا جعلی در یک صفحه", route: "management" },
  review: { label: "نظر یا محتوای نامناسب", route: "management" },
  billing: { label: "پرداخت، اشتراک یا بازگشت وجه", route: "management" },
  privacy: { label: "حریم خصوصی و اطلاعات شخصی", route: "privacy" },
  staff: { label: "برخورد یا پاسخ تیم پلازا", route: "management" },
  other: { label: "موضوع دیگر", route: "management" },
} as const satisfies Record<string, { label: string; route: ComplaintRoute }>;

export type ComplaintCategory = keyof typeof COMPLAINT_CATEGORIES;

/** What the complainant wants to happen. Asking beats guessing. */
export const COMPLAINT_OUTCOMES = {
  fix: "اصلاح اطلاعات",
  remove: "حذف صفحه یا محتوا",
  refund: "بازگشت وجه",
  explain: "توضیح درباره‌ی آنچه رخ داده",
  followup: "پیگیری و پاسخ کتبی",
  other: "چیز دیگری",
} as const;

export type ComplaintOutcome = keyof typeof COMPLAINT_OUTCOMES;
