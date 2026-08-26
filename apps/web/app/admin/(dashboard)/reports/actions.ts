// ============================================================================
// Source: app/admin/(dashboard)/reports/actions.ts
// Version: 1.0.0 — 2026-08-16
// Why: Work an abuse report: mark reviewing / resolved / rejected, keep a note.
// Env / Identity: Admin only.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { recordEvent, settleSubject } from "@/lib/standing/ledger";
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

  // Standing ledger. `resolved` means the report was upheld, so the reporter
  // earned it; `rejected` means it was not, and earns nothing — but it is
  // NOT reversed. A report that turned out to be wrong is a guess, not a
  // betrayal, and punishing guesses is how a directory stops being told about
  // its own bad data. The event simply stays pending forever.
  //
  // The event is recorded here rather than at report time because reports may
  // be filed anonymously (reporter_id is nullable); only a signed-in reporter
  // has a ledger to write to.
  if (status === "resolved") {
    const { data: report } = await supabase
      .from("business_reports")
      .select("reporter_id")
      .eq("id", id)
      .maybeSingle();
    if (report?.reporter_id) {
      await recordEvent({
        userId: report.reporter_id,
        kind: "report_upheld",
        subjectType: "report",
        subjectId: id,
      }).catch((e) => console.error("standing: record report_upheld failed", e));
      await settleSubject("report_upheld", "report", id, user.id).catch((e) =>
        console.error("standing: settle report_upheld failed", e)
      );
    }
  }

  revalidatePath("/admin/reports");
  return { success: true };
}
