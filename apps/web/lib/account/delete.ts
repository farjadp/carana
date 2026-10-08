// ============================================================================
// Source: lib/account/delete.ts
// Version: 1.0.0 — 2026-10-08
// Why: One account-deletion path for the website (server action) and the app
//      (/api/mobile/account/delete). App Store Guideline 5.1.1(v): an app that
//      creates accounts must delete them, and the two surfaces must not drift.
//      Until this file, deletion failed for anyone who had registered a
//      business: `businesses.created_by` is NOT NULL + ON DELETE RESTRICT, so
//      the cascade from auth.users → profiles was refused and the person saw
//      «حذف حساب انجام نشد».
// Env / Identity: Server only. Service role. The caller has already proved the
//      user id is their own (cookie session or Bearer token) — never pass an id
//      taken from a request body.
// ============================================================================
import { IMPORTS_SYSTEM_EMAIL } from "@goplaza/core";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type DeleteAccountResult = { success: boolean; error?: string };

/** The typed word that stands between a stray tap and a destroyed account. */
export function deleteConfirmationOk(confirmation: unknown): boolean {
  return typeof confirmation === "string" && confirmation.trim().toLowerCase() === "delete";
}

export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  const admin = createSupabaseAdminClient();

  const { data: system, error: systemError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", IMPORTS_SYSTEM_EMAIL)
    .maybeSingle();
  if (systemError || !system || system.id === userId) {
    console.error("Account deletion — system profile missing:", systemError);
    return { success: false, error: "خطا در آماده‌سازی حذف. لطفاً با پشتیبانی تماس بگیرید." };
  }

  // A listing is public record other people may rely on, and it may carry
  // reviews. It is detached from the person rather than deleted, and pulled
  // out of public view so nobody is left with an unowned live listing. The
  // created_by move is what lets the profile row go at all.
  const { error: businessError } = await admin
    .from("businesses")
    .update({ status: "DRAFT", created_by: system.id })
    .eq("created_by", userId);
  if (businessError) {
    console.error("Account deletion — business detach failed:", businessError);
    return { success: false, error: "خطا در آماده‌سازی حذف. لطفاً با پشتیبانی تماس بگیرید." };
  }

  // Everything else keyed to the person cascades or is set null from
  // auth.users / profiles: profile, interactions, notes, reviews, standing,
  // contacts, claims, link pages; a claimed listing's owner_user_id → null.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("Account deletion failed:", error);
    return { success: false, error: "حذف حساب انجام نشد. لطفاً با پشتیبانی تماس بگیرید." };
  }

  return { success: true };
}
