// ============================================================================
// Source: app/profile/actions.ts
// Version: 1.1.0 — 2026-08-26
// Why: Server actions for updating user profile and password reset.
//      v1.1: accepts `bio`, folds Persian digits in the phone number, and
//      bounds both fields. The digit fold is the boundary, not the polish —
//      the form folds as you type so the field shows what will be stored, but
//      the app forces RTL and a crafted request can carry «۶۴۷» straight to
//      the column. That class of bug has broken sign-in and verification here
//      before; see docs/06-gotchas.md.
// ============================================================================
"use server";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";
import { toLatinDigits } from "@/lib/utils/digits";

/** Matches BIO_MAX in profile-form.tsx. */
const BIO_MAX = 280;

export async function updateUserProfile(formData: FormData) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "کاربر احراز هویت نشده است" };
    }

    const full_name = formData.get("full_name") as string | null;
    const mobile_number = formData.get("mobile_number") as string | null;
    const birth_date = formData.get("birth_date") as string | null;
    const avatar_url = formData.get("avatar_url") as string | null;
    const bio = formData.get("bio") as string | null;

    const updates: Record<string, string | null> = {};
    if (full_name !== null) updates.full_name = full_name.trim().slice(0, 120) || null;
    if (mobile_number !== null) {
      // Persian digits first. Anything else — spaces, dashes, a leading + —
      // is kept, because this is a display field, not a parsed one.
      updates.mobile_number = toLatinDigits(mobile_number).trim().slice(0, 32) || null;
    }
    if (birth_date !== null) updates.birth_date = birth_date || null;
    if (avatar_url !== null) updates.avatar_url = avatar_url || null;
    if (bio !== null) updates.bio = bio.trim().slice(0, BIO_MAX) || null;

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
