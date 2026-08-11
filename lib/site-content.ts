// ============================================================================
// Source: lib/site-content.ts
// Version: 1.2.0 — 2026-08-11
// Why: Hold shared legal links and footer identity copy.
// Env / Identity: Static shared content for čārana.
// ============================================================================
export type NavSection = "home" | "business" | "brand";

export const legalLinks = [
  { href: "/privacy", label: "حریم خصوصی" },
  { href: "/disclaimer", label: "سلب مسئولیت" },
  { href: "/terms", label: "شرایط استفاده" },
] as const;

export const footerCopy =
  "از ریشه‌های فارسی تا شهرهای کانادا، čārana خانه دیجیتال معرفی کسب‌وکارهای ایرانی است. © 2026 همه حقوق برای čārana محفوظ است.";
