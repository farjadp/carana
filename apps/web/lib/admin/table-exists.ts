// ============================================================================
// Source: apps/web/lib/admin/table-exists.ts
// Version: 1.0.0 — 2026-08-26
// Why: The admin's "probe, don't assume" habit was silently broken.
//
//      Every probe in this admin was written as
//        const { error } = await admin.from(t).select("x", { head: true, count: "exact" });
//        ok = !error
//      and that is NOT an existence check. Measured against the live project
//      on 26 Aug: a HEAD request for a table PostgREST does not know returns
//      **status 204, count null, error null** — so `!error` is true and the
//      probe renders GREEN for a table that does not exist. A green light for
//      a missing migration is precisely the unbacked UI these probes were
//      added to prevent.
//
//      A non-HEAD select is honest about it: status 404 with
//      "Could not find the table ... in the schema cache".
// Env / Identity: Server only, service role. Admin surfaces.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Does this table actually exist and answer?
 *
 * Deliberately a real (non-HEAD) select limited to one row: the HEAD variant
 * cannot distinguish "missing" from "empty". Any error — missing table, RLS
 * refusal, transport failure — reads as false, which is the safe direction
 * for a probe whose whole job is to say "this is not ready".
 */
export async function tableExists(admin: SupabaseClient, table: string): Promise<boolean> {
  try {
    const { error } = await admin.from(table).select("*").limit(1);
    return !error;
  } catch {
    return false;
  }
}
