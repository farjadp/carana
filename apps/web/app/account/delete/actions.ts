// ============================================================================
// Source: app/account/delete/actions.ts
// Version: 2.0.0 — 2026-10-08
// Why: Let a user delete their own account without contacting support.
//      App Store Guideline 5.1.1(v) requires this for any app that offers
//      account creation; an app without it is rejected.
//      v2: the work moved to lib/account/delete.ts so the app's route runs the
//      same code — and the shared version fixes deletion for business owners.
// Env / Identity: Re-confirms the caller from their own session. A user can
//      only ever delete themselves.
// ============================================================================
"use server";

import { deleteConfirmationOk, deleteUserAccount, type DeleteAccountResult } from "@/lib/account/delete";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export type { DeleteAccountResult };

export async function deleteOwnAccount(confirmation: string): Promise<DeleteAccountResult> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "برای حذف حساب ابتدا وارد شوید." };
  }

  if (!deleteConfirmationOk(confirmation)) {
    return { success: false, error: "برای تایید، عبارت DELETE را وارد کنید." };
  }

  const result = await deleteUserAccount(user.id);
  if (result.success) await supabase.auth.signOut();
  return result;
}
