// ============================================================================
// Source: apps/web/lib/admin/backup-tables.ts
// Version: 1.0.0 — 2026-08-19
// Why: The single catalogue of what the admin backup covers — which tables,
//      in which FK-safe restore order, keyed on which primary key. The
//      backup and restore routes and the settings UI all read this file, so
//      "what is in a backup" cannot be true in one place and false in
//      another.
//
//      What a backup deliberately does NOT cover, stated here because the UI
//      repeats it: storage files (logos, gallery, blog images — they live in
//      Supabase Storage, not in these tables) and auth.users (password
//      hashes belong to Supabase Auth; profiles rows ARE covered, and on
//      restore a profile whose auth user no longer exists is skipped and
//      counted, not an error).
// Env / Identity: Pure data.
// ============================================================================

export type BackupTable = {
  name: string;
  /** Persian label for the admin UI. */
  label: string;
  /** Conflict target for restore upserts, and the pagination order key. */
  pk: string;
  /**
   * Selected by default when creating a backup. Log/analytics tables are
   * opt-in: they dwarf the core data and a restore of them is rarely wanted.
   */
  core: boolean;
};

/**
 * ORDER MATTERS: this is FK-safe restore order (parents before children).
 * Backup export uses the same order for predictability.
 */
export const BACKUP_TABLES: BackupTable[] = [
  // Parents / reference data
  { name: "categories", label: "دسته‌بندی‌ها", pk: "id", core: true },
  { name: "profiles", label: "پروفایل کاربران", pk: "id", core: true },
  { name: "city_metro", label: "نقشه‌ی شهر→متروپل", pk: "city_en", core: true },
  { name: "city_aliases", label: "نام‌های فارسی شهرها", pk: "city_en", core: true },
  { name: "category_aliases", label: "نام‌های قدیمی دسته‌ها", pk: "alias", core: true },
  // The directory itself
  { name: "businesses", label: "کسب‌وکارها", pk: "id", core: true },
  // Children of businesses / users
  { name: "business_memberships", label: "عضویت‌های کسب‌وکار", pk: "id", core: true },
  { name: "business_claims", label: "درخواست‌های مالکیت", pk: "id", core: true },
  { name: "business_change_reviews", label: "بازبینی تغییرات", pk: "id", core: true },
  { name: "business_announcements", label: "اعلان‌ها", pk: "id", core: true },
  { name: "business_reports", label: "گزارش تخلف", pk: "id", core: true },
  { name: "job_posts", label: "آگهی‌های استخدام", pk: "id", core: true },
  { name: "user_business_interactions", label: "ذخیره‌ها و یادداشت‌ها", pk: "id", core: true },
  { name: "public_reviews", label: "نظرات", pk: "id", core: true },
  { name: "subscriptions", label: "اشتراک‌ها", pk: "id", core: true },
  { name: "invoices", label: "فاکتورها", pk: "id", core: true },
  { name: "suggestions", label: "پیشنهادهای کاربران", pk: "id", core: true },
  // Blog
  { name: "blog_categories", label: "دسته‌های وبلاگ", pk: "slug", core: true },
  { name: "blog_posts", label: "پست‌های وبلاگ", pk: "id", core: true },
  // Logs / analytics — opt-in
  { name: "business_events", label: "رویدادهای بازدید (آمار)", pk: "id", core: false },
  { name: "search_queries", label: "لاگ جستجوها", pk: "id", core: false },
  { name: "search_ai_expansions", label: "کش جستجوی هوشمند", pk: "q_norm", core: false },
  { name: "ai_usage", label: "مصرف هوش مصنوعی", pk: "id", core: false },
  { name: "user_activity_logs", label: "لاگ فعالیت کاربران", pk: "id", core: false },
  { name: "stripe_events", label: "رویدادهای Stripe", pk: "id", core: false },
  { name: "blog_runs", label: "اجراهای تولید وبلاگ", pk: "id", core: false },
  { name: "cron_runs", label: "اجراهای زمان‌بندی‌شده", pk: "id", core: false },
  { name: "system_errors", label: "خطاهای سیستم", pk: "id", core: false },
];

export const BACKUP_TABLE_BY_NAME = new Map(BACKUP_TABLES.map((t) => [t.name, t]));
