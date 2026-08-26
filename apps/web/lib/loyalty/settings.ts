// ============================================================================
// Source: apps/web/lib/loyalty/settings.ts
// Version: 1.0.0 — 2026-08-26
// Why: The green knobs of «وفاداری مالک» — the master switch and the tier
//      ladder — read from site_settings key "loyalty" with the same fail-soft
//      contract lib/settings.ts documents.
//
//      THE FAIL-SOFT DIRECTION MATTERS HERE MORE THAN ANYWHERE ELSE IN THE
//      APP. A missing table or a network blip must fall back to DISABLED, not
//      to the defaults: everywhere else a soft failure costs a feature, here
//      it would cost money. `enabled` is therefore only ever true when the
//      stored value says so explicitly.
// Env / Identity: Server only, service role. Writers pass requireAdmin first.
// ============================================================================
import {
  DEFAULT_LOYALTY_TIERS,
  TENURE_GAP_GRACE_DAYS,
  type LoyaltyTier,
} from "@goplaza/core";

import { SETTING_KEYS, getSetting, setSetting } from "@/lib/settings";

export interface LoyaltySettings {
  /** Off unless the stored value explicitly says otherwise. */
  enabled: boolean;
  tiers: LoyaltyTier[];
  graceDays: number;
}

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  const raw = await getSetting<Record<string, unknown>>(SETTING_KEYS.loyalty, {});
  const tiers = Array.isArray(raw.tiers) && raw.tiers.length ? (raw.tiers as LoyaltyTier[]) : DEFAULT_LOYALTY_TIERS;
  return {
    enabled: raw.enabled === true,
    tiers: [...tiers].sort((a, b) => a.months - b.months),
    graceDays:
      typeof raw.graceDays === "number" && raw.graceDays > 0 ? raw.graceDays : TENURE_GAP_GRACE_DAYS,
  };
}

export async function setLoyaltySettings(
  patch: Partial<LoyaltySettings>,
  updatedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const current = await getLoyaltySettings();
  return setSetting(SETTING_KEYS.loyalty, { ...current, ...patch }, updatedBy);
}
