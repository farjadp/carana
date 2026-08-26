// ============================================================================
// Source: apps/web/lib/settings.ts
// Version: 1.0.0 — 2026-08-19
// Why: Read/write for site_settings — runtime-tunable switches the admin page
//      owns. Readers must never break the feature they gate: every read
//      fails soft to the caller's default (missing table, missing key,
//      network blip all behave like "no override set").
// Env / Identity: Server only — the table has no client RLS policies, so all
//      access rides the service role. Writers must have passed requireAdmin
//      first; this module does not re-check.
// ============================================================================
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/** The one place setting keys are named, so consumers and the UI agree. */
export const SETTING_KEYS = {
  /** { enabled?: boolean; daily_cap?: number } — lib/search/smart.ts */
  smartSearch: "smart_search",
  /** { enabled?, public_display?, thresholds?, maintenance_window_days? } — lib/standing/rules.ts */
  standing: "standing",
  /** { enabled?, tiers?, graceDays? } — lib/loyalty/settings.ts. Off means no
   *  discount is ever offered or applied; it ships off on purpose. */
  loyalty: "loyalty",
} as const;

export async function getSetting<T extends Record<string, unknown>>(
  key: string,
  fallback: T
): Promise<T> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data?.value || typeof data.value !== "object") return fallback;
    return { ...fallback, ...(data.value as T) };
  } catch {
    return fallback;
  }
}

export async function setSetting(
  key: string,
  value: Record<string, unknown>,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("site_settings")
      .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
