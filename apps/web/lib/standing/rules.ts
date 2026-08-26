// ============================================================================
// Source: apps/web/lib/standing/rules.ts
// Version: 1.0.0 — 2026-08-26
// Why: Read/write for the two tuning surfaces of «اعتبار مشارکت»: the
//      standing_rules table (per-kind points/caps) and the "standing" key in
//      site_settings (master switch, public display, threshold overrides).
//      Readers follow the fail-soft contract lib/settings.ts documents: a
//      missing table, a missing key and a network blip must all behave like
//      "no override set" — the ledger must never break the feature that
//      feeds it.
// Env / Identity: Server only, service role. Writers must have passed
//      requireAdmin first; this module does not re-check.
// ============================================================================
import {
  DEFAULT_THRESHOLDS,
  MAINTENANCE_WINDOW_DAYS,
  type StandingThresholds,
} from "@goplaza/core";

import { SETTING_KEYS, getSetting, setSetting } from "@/lib/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface StandingRule {
  kind: string;
  label_fa: string;
  subject_type: string;
  points: number;
  daily_cap: number;
  enabled: boolean;
  version: number;
  updated_at: string;
  updated_by: string | null;
}

export interface StandingSettings {
  enabled: boolean;
  public_display: boolean;
  thresholds: StandingThresholds;
  maintenance_window_days: number;
}

/** The safe posture when nothing has been configured: recording, paying nobody. */
const SETTINGS_FALLBACK: StandingSettings = {
  enabled: false,
  public_display: false,
  thresholds: DEFAULT_THRESHOLDS,
  maintenance_window_days: MAINTENANCE_WINDOW_DAYS,
};

export async function getStandingSettings(): Promise<StandingSettings> {
  const raw = await getSetting<Record<string, unknown>>(SETTING_KEYS.standing, {});
  // Merge one level deeper than getSetting's spread: a stored value that has
  // only level1 must not silently erase level2's floors.
  const t = (raw.thresholds ?? {}) as Partial<StandingThresholds>;
  return {
    enabled: raw.enabled === true,
    public_display: raw.public_display === true,
    thresholds: {
      level1: { ...DEFAULT_THRESHOLDS.level1, ...(t.level1 ?? {}) },
      level2: { ...DEFAULT_THRESHOLDS.level2, ...(t.level2 ?? {}) },
    },
    maintenance_window_days:
      typeof raw.maintenance_window_days === "number" && raw.maintenance_window_days > 0
        ? raw.maintenance_window_days
        : SETTINGS_FALLBACK.maintenance_window_days,
  };
}

export async function setStandingSettings(
  patch: Partial<StandingSettings>,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const current = await getStandingSettings();
  return setSetting(SETTING_KEYS.standing, { ...current, ...patch }, updatedBy);
}

export async function getRules(): Promise<StandingRule[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("standing_rules")
      .select("*")
      .order("kind");
    if (error || !data) return [];
    return data as StandingRule[];
  } catch {
    return [];
  }
}

export async function getRule(kind: string): Promise<StandingRule | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("standing_rules")
      .select("*")
      .eq("kind", kind)
      .maybeSingle();
    if (error || !data) return null;
    return data as StandingRule;
  } catch {
    return null;
  }
}

/**
 * Patch one rule. `version` bumps exactly when `points` changed — the version
 * is "which economy settled this event", so a cap or label edit must not
 * inflate it and a points edit must never skip it.
 */
export async function setRule(
  kind: string,
  patch: Partial<Pick<StandingRule, "points" | "daily_cap" | "enabled" | "label_fa">>,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const current = await getRule(kind);
  if (!current) return { ok: false, error: `unknown kind: ${kind}` };
  const bump =
    typeof patch.points === "number" && patch.points !== current.points;
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("standing_rules")
      .update({
        ...patch,
        version: bump ? current.version + 1 : current.version,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq("kind", kind);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
