// ============================================================================
// Source: lib/supabase/server.ts
// Version: 1.3.0 — 2026-08-11
// Why: Provide SSR-aware server and admin Supabase clients for protected flows.
// Env / Identity: Uses public env for request-scoped auth and secret env for admin access.
// ============================================================================
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { env, serverEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // In Server Components, cookie refresh is handled by proxy.ts.
      setAll() {},
    },
  });
}

export async function createSupabaseActionClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
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
