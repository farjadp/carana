// ============================================================================
// Source: app/profile/actions.ts
// Version: 1.0.0 — 2026-08-12
// Why: Server actions for updating user profile and password reset.
// ============================================================================
"use server";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";

export async function updateUserProfile(formData: FormData) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "کاربر احراز هویت نشده است" };
    }

    const full_name = formData.get("full_name") as string;
    const mobile_number = formData.get("mobile_number") as string;
    const birth_date = formData.get("birth_date") as string;
    const avatar_url = formData.get("avatar_url") as string;

    const updates: any = {};
    if (full_name !== null) updates.full_name = full_name;
    if (mobile_number !== null) updates.mobile_number = mobile_number;
    if (birth_date !== null) updates.birth_date = birth_date || null;
    if (avatar_url !== null) updates.avatar_url = avatar_url;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      return { success: false, error: "خطا در بروزرسانی پروفایل: " + error.message };
    }

    // Also try updating the auth metadata if full_name is changed
    if (full_name) {
      await supabase.auth.updateUser({
        data: { full_name }
      });
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (err: any) {
    console.error("Profile action error:", err);
    return { success: false, error: "خطای سرور" };
  }
}

export async function sendPasswordResetEmail() {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { success: false, error: "کاربر یافت نشد" };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${env.baseUrl}/auth/update-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      return { success: false, error: "ارسال ایمیل بازنشانی با خطا مواجه شد." };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: "خطای سرور" };
  }
}
