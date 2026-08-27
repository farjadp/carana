// ============================================================================
// Source: app/support/categories.ts
// Version: 1.0.0 — 2026-08-26
// Why: The support categories, in a plain module both sides can import.
//
//      They lived in actions.ts first, and the select silently rendered ZERO
//      options: a "use server" file may only export async functions, so the
//      object survived typecheck and lint and then arrived on the client as
//      nothing. Anything shared with a client component has to sit outside
//      the "use server" boundary — the compiler will not tell you.
// Env / Identity: Pure data. Safe on the client.
// ============================================================================

export const SUPPORT_CATEGORIES = {
  listing: "ثبت یا ویرایش کسب‌وکار",
  ownership: "احراز مالکیت و نشان تایید",
  account: "حساب کاربری و ورود",
  billing: "پرداخت و اشتراک",
  report: "گزارش محتوای نادرست",
  bug: "مشکل فنی سایت یا اپ",
  other: "موضوع دیگر",
} as const;

export type SupportCategory = keyof typeof SUPPORT_CATEGORIES;
