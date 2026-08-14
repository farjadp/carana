// ============================================================================
// Source: app/account/delete/actions.ts
// Version: 1.0.0 — 2026-08-22
// Why: Let a user delete their own account without contacting support.
//      App Store Guideline 5.1.1(v) requires this for any app that offers
//      account creation; an app without it is rejected.
// Env / Identity: Deletes via the service role after re-confirming the caller's
//      identity from their own session. A user can only ever delete themselves.
// ============================================================================
"use server";

import { createSupabaseActionClient, createSupabaseAdminClient } from "@/lib/supabase/server";

export type DeleteAccountResult = { success: boolean; error?: string };

export async function deleteOwnAccount(confirmation: string): Promise<DeleteAccountResult> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "برای حذف حساب ابتدا وارد شوید." };
  }

  // Typed confirmation, so a stray click cannot destroy an account.
  if (confirmation.trim().toLowerCase() !== "delete") {
    return { success: false, error: "برای تایید، عبارت DELETE را وارد کنید." };
  }

  const admin = createSupabaseAdminClient();

  // A published listing is public record that other people may rely on, and it
  // may carry reviews. Detach it from the person rather than deleting it, and
  // pull it out of public view so nobody is left with an unowned live listing.
  const { error: businessError } = await admin
    .from("businesses")
    .update({ status: "DRAFT" })
    .eq("created_by", user.id);

  if (businessError) {
    console.error("Account deletion — business detach failed:", businessError);
    return { success: false, error: "خطا در آماده‌سازی حذف. لطفاً با پشتیبانی تماس بگیرید." };
  }

  // Everything keyed to auth.users cascades on delete: profile, interactions,
  // private notes, reviews, activity logs, verification codes.
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Account deletion failed:", error);
    return { success: false, error: "حذف حساب انجام نشد. لطفاً با پشتیبانی تماس بگیرید." };
  }

  await supabase.auth.signOut();

  return { success: true };
}
