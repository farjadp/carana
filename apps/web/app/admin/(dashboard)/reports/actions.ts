// ============================================================================
// Source: app/admin/(dashboard)/reports/actions.ts
// Version: 1.0.0 — 2026-08-16
// Why: Work an abuse report: mark reviewing / resolved / rejected, keep a note.
// Env / Identity: Admin only.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export async function updateReport(id: string, status: "new" | "reviewing" | "resolved" | "rejected", adminNote?: string) {
  const supabase = await createSupabaseActionClient();
  const user = await requireAdmin(supabase);
  const patch: Record<string, unknown> = { status, admin_note: adminNote?.trim() || null };
  if (status === "resolved" || status === "rejected") {
    patch.resolved_by = user.id;
    patch.resolved_at = new Date().toISOString();
  }
  const { error } = await supabase.from("business_reports").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/reports");
  return { success: true };
}
