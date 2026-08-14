// ============================================================================
// Source: app/admin/(dashboard)/users/actions.ts
// Version: 1.0.0 — 2026-08-12
// Why: Provide secure Server Actions for admin-level user role updates and deletions.
// Env / Identity: Strictly verified admin actions, uses service role for auth deletions.
// ============================================================================
"use server";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { logUserActivity } from "@/lib/actions/logs";

async function assertAdmin() {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("احراز هویت انجام نشده است.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    throw new Error("شما مجوز ادمین برای این اقدام را ندارید.");
  }

  return user;
}

export async function updateUserRole(targetUserId: string, newRole: string) {
  try {
    const currentUser = await assertAdmin();

    if (currentUser.id === targetUserId) {
      throw new Error("شما نمی‌توانید نقش خودتان را تغییر دهید.");
    }

    const validRoles = ["user", "business_owner", "moderator", "admin"];
    if (!validRoles.includes(newRole)) {
      throw new Error("نقش انتخاب شده معتبر نیست.");
    }

    const supabase = await createSupabaseActionClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", targetUserId);

    if (error) {
      throw error;
    }

    // Log the role update action
    await logUserActivity(
      "ROLE_UPDATE",
      { new_role: newRole, admin_id: currentUser.id },
      targetUserId
    );

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطایی رخ داد.";
    return { success: false, error: message };
  }
}

export async function deleteUser(targetUserId: string) {
  try {
    const currentUser = await assertAdmin();

    if (currentUser.id === targetUserId) {
      throw new Error("شما نمی‌توانید حساب کاربری خودتان را حذف کنید.");
    }

    // Must delete from auth.users using service role client, which cascades to public.profiles
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(targetUserId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطایی رخ داد.";
    return { success: false, error: message };
  }
}
