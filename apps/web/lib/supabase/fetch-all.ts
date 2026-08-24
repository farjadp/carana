// ============================================================================
// Source: apps/web/lib/supabase/fetch-all.ts
// Version: 2.0.0 — 2026-08-24
// Why: Re-export. `fetchAllRows` moved to @goplaza/core so the mobile app
//      stops counting a 1,000-row slice of a 5,251-row directory — the same
//      PostgREST cap this helper was written for on 18 Aug, still live on
//      native six days later because the fix lived in apps/web.
// ============================================================================
export { fetchAllRows } from "@goplaza/core";
