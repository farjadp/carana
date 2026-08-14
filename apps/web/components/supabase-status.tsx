// ============================================================================
// Source: components/supabase-status.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Surface whether the public Supabase configuration is present.
// Env / Identity: Reads validated public env only.
// ============================================================================
import { env } from "@/lib/env";

export function SupabaseStatus() {
  const isConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
  const message = isConfigured
    ? "کلیدهای عمومی Supabase روی پروژه تنظیم شده‌اند و اپ برای مرحله بعدی integration آماده است."
    : "تنظیمات Supabase کامل نیست و قبل از ادامه باید envها تکمیل شوند.";

  return (
    <div className="supabase-status" role="status" aria-live="polite">
      <span className={isConfigured ? "status-dot is-live" : "status-dot"} />
      <div>
        <strong>وضعیت Supabase</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
