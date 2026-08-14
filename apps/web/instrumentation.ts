// ============================================================================
// Source: instrumentation.ts
// Version: 2.0.0 — 2026-08-26
// Why: Catch the server errors Next handles itself, which application-level
//      try/catch never sees, and record them in our own table.
// Env / Identity: Server. Writes through the admin client.
// ============================================================================

import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request
) => {
  // Imported lazily: instrumentation is evaluated in every runtime Next
  // starts, including edge, and the Supabase admin client is server-only.
  const { reportQuietFailure } = await import("@/lib/observability/report");

  reportQuietFailure("request_error", {
    path: request.path,
    message: err instanceof Error ? err.message : String(err),
  });
};
