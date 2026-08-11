// ============================================================================
// Source: lib/supabase/server.ts
// Version: 1.2.0 — 2026-08-11
// Why: Provide server-side and admin Supabase clients.
// Env / Identity: Uses public env for regular server access and secret env for admin access.
// ============================================================================
import { createClient } from "@supabase/supabase-js";

import { env, serverEnv } from "@/lib/env";

export function createSupabaseServerClient() {
  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseAdminClient() {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
