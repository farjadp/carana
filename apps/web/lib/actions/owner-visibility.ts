"use server";

// ============================================================================
// Source: lib/actions/owner-visibility.ts
// Version: 1.0.0 — 2026-08-17
// Why: The Premium owner control behind the "owner" section on a public
//      profile (packages/core/src/owner-identity.ts). Free and Starter
//      listings always show it; Premium is the only plan that may hide it.
// Env / Identity: Server-side, authenticated. Only the listing's own owner
//      (created_by or owner_user_id) may call it. Writes with the service
//      role for the same reason as every other plan-gated field: RLS grants
//      an owner no UPDATE on a PUBLISHED row, so this action is the one gate.
//
//      Asymmetry worth knowing: the *write* is entitlement-checked, the
//      *read* is not. A lapsed Premium listing keeps its owner hidden. The
//      alternative is republishing somebody's name because a card expired,
//      which is not a downgrade — it is a privacy incident with a billing
//      trigger. Clearing the flag is therefore allowed on any plan.
// ============================================================================

import { revalidatePath } from "next/cache";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/billing/entitlements";

export async function setOwnerVisibility(businessId: string, hidden: boolean) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "ابتدا وارد حساب کاربری شوید." };

    const { data: business } = await supabase
      .from("businesses")
      .select("id, slug, vanity_slug, plan, plan_until, created_by, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();

    if (!business || (business.created_by !== user.id && business.owner_user_id !== user.id)) {
      return { success: false, error: "این کسب‌وکار متعلق به تو نیست." };
    }

    // Turning the section back on is always allowed — a lapsed owner must not
    // be locked out of un-hiding themselves. Only hiding needs the plan.
    if (hidden && !entitlementsFor(business).has("owner_privacy")) {
      return {
        success: false,
        error: "پنهان کردن نام صاحب کسب‌وکار فقط در پلن پریمیوم ممکن است.",
      };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("businesses")
      .update({ hide_owner: hidden })
      .eq("id", businessId);
    if (error) throw error;

    revalidatePath(`/dashboard/business/${businessId}/edit`);
    if (business.slug) revalidatePath(`/businesses/${business.slug}`);
    if (business.vanity_slug) revalidatePath(`/b/${business.vanity_slug}`);
    return { success: true, hidden };
  } catch (error: unknown) {
    console.error("Set Owner Visibility Error:", error);
    return { success: false, error: (error as Error).message };
  }
}
