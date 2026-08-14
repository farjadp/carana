// ============================================================================
// Source: app/admin/(dashboard)/listings/actions.ts
// Version: 1.0.0 — 2026-08-13
// Why: Server actions for admins to manage business listings.
// Env / Identity: Server-side execution, checks for admin role.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { logUserActivity } from "@/lib/actions/logs";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendEmail } from "@/lib/email/send";
import { listingApprovedEmail, listingNeedsChangesEmail } from "@/lib/email/templates";

/**
 * Moderation actions are open to moderators as well as admins, matching the
 * admin layout and users/actions.ts. Deletion stays admin-only below.
 */
async function assertAdmin(allowed: ("admin" | "moderator")[] = ["admin", "moderator"]) {
  const supabase = await createSupabaseActionClient();
  return requireAdmin(supabase, allowed);
}

export async function updateBusinessStatus(businessId: string, newStatus: string) {
  try {
    const adminUser = await assertAdmin();
    const validStatuses = ["DRAFT", "SUBMITTED", "NEEDS_CHANGES", "APPROVED", "PUBLISHED", "REJECTED"];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error("وضعیت نامعتبر است.");
    }

    const supabase = await createSupabaseActionClient();
    const { data: business, error: fetchError } = await supabase
      .from("businesses")
      .select("created_by, name, slug")
      .eq("id", businessId)
      .single();

    if (fetchError || !business) {
      throw new Error("کسب‌وکار یافت نشد.");
    }

    const isApprovedOrPublished = newStatus === "APPROVED" || newStatus === "PUBLISHED";
    const finalStatus = isApprovedOrPublished ? "PUBLISHED" : newStatus;

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ 
        status: finalStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", businessId);

    if (updateError) {
      throw updateError;
    }

    // Tell the owner what happened. A moderation decision the owner never
    // hears about is the same as no decision from their side.
    await notifyOwner(finalStatus, business);

    // Log the action
    await logUserActivity(
      "PROFILE_UPDATE", 
      { 
        type: "business_status_changed", 
        business_id: businessId, 
        business_name: business.name,
        new_status: newStatus,
        admin_id: adminUser.id
      },
      business.created_by // Log against the user who created the business
    );

    revalidatePath("/admin/listings");
    revalidatePath(`/admin/listings/${businessId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "خطایی رخ داد." };
  }
}

export async function deleteBusiness(businessId: string) {
  try {
    const adminUser = await assertAdmin(["admin"]);
    const supabaseAdmin = createSupabaseAdminClient(); // Bypass RLS to delete
    
    const { data: business, error: fetchError } = await supabaseAdmin
      .from("businesses")
      .select("created_by, name")
      .eq("id", businessId)
      .single();

    if (fetchError || !business) {
      throw new Error("کسب‌وکار یافت نشد.");
    }

    const { error: deleteError } = await supabaseAdmin
      .from("businesses")
      .delete()
      .eq("id", businessId);

    if (deleteError) {
      throw deleteError;
    }

    // Log the action
    await logUserActivity(
      "SECURITY_ALERT", 
      { 
        type: "business_deleted", 
        business_id: businessId, 
        business_name: business.name,
        admin_id: adminUser.id
      },
      business.created_by
    );

    revalidatePath("/admin/listings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "خطایی رخ داد." };
  }
}

/**
 * Email the listing owner about a moderation decision.
 *
 * Never throws: a mail failure must not roll back a status change that already
 * succeeded, and the admin should not see an error for it.
 */
async function notifyOwner(
  status: string,
  business: { created_by: string; name: string; slug?: string | null }
) {
  try {
    const admin = createSupabaseAdminClient();
    const { data: owner } = await admin
      .from("profiles")
      .select("email")
      .eq("id", business.created_by)
      .maybeSingle();

    const to = owner?.email;
    if (!to) return;

    if (status === "PUBLISHED" && business.slug) {
      const mail = listingApprovedEmail({ name: business.name, slug: business.slug });
      await sendEmail({ to, ...mail });
      return;
    }

    if (status === "NEEDS_CHANGES" || status === "REJECTED") {
      const mail = listingNeedsChangesEmail({ name: business.name });
      await sendEmail({ to, ...mail });
    }
  } catch (error) {
    console.error("Owner notification failed:", error);
  }
}
