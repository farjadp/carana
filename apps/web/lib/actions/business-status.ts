"use server";

// ============================================================================
// Source: lib/actions/business-status.ts
// Version: 1.0.0 — 2026-08-16
// Why: Server action for the owner-set "busy now / quiet now" toggle. Uses
//      the service role for the write, same reason as edit/actions.ts: RLS
//      does not grant an owner UPDATE on a PUBLISHED row, and that stays
//      true here too — this action is the gate, not a relaxed policy.
// Env / Identity: Server-side, authenticated. Only the business's own
//      owner (created_by or owner_user_id) may set its status.
// ============================================================================

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { BUSY_STATUS_HOURS, type BusyStatus } from "@/lib/business/live-status";

export async function setBusyStatus(businessId: string, status: BusyStatus | null) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: business } = await supabase
      .from("businesses")
      .select("id, slug, plan, plan_until, created_by, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();
    if (!business || (business.created_by !== user.id && business.owner_user_id !== user.id)) {
      return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };
    }

    if (!entitlementsFor(business).has("busy_status")) {
      return { success: false, error: "وضعیت زنده فقط برای پلن استارتر به بالا فعال است." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("businesses")
      .update({
        busy_status: status,
        busy_status_until: status ? new Date(Date.now() + BUSY_STATUS_HOURS * 3600_000).toISOString() : null,
      })
      .eq("id", businessId);
    if (error) throw error;

    revalidatePath("/dashboard/business");
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    return { success: true };
  } catch (error: any) {
    console.error("Set Busy Status Error:", error);
    return { success: false, error: error.message };
  }
}
