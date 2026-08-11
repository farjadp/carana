// ============================================================================
// Source: lib/supabase/client.ts
// Version: 1.2.0 — 2026-08-11
// Why: Provide the browser-safe Supabase client instance.
// Env / Identity: Uses validated public env only.
// ============================================================================
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export const supabase = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey
);
