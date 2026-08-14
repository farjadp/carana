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

async function assertAdmin() {
  const supabase = await createSupabaseActionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("احراز هویت انجام نشده است.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    throw new Error("شما مجوز دسترسی به این عملیات را ندارید.");
  }

  return user;
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
      .select("created_by, name")
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
    const adminUser = await assertAdmin();
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
