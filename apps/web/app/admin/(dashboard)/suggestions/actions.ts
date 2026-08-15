// ============================================================================
// Source: app/admin/(dashboard)/suggestions/actions.ts
// Version: 1.0.0 — 2026-08-15
// Why: Mark a suggestion read/done and keep a private note on it.
// Env / Identity: Admin only — requireAdmin, then RLS-scoped update.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export async function updateSuggestion(id: string, status: "new" | "read" | "done", adminNote?: string) {
  const supabase = await createSupabaseActionClient();
  await requireAdmin(supabase);
  const { error } = await supabase
    .from("suggestions")
    .update({ status, admin_note: adminNote?.trim() || null })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/suggestions");
  return { success: true };
}
