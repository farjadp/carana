// ============================================================================
// Source: lib/supabase/client.ts
// Version: 1.3.0 — 2026-08-11
// Why: Provide the browser-safe Supabase client with SSR-aware cookie handling.
// Env / Identity: Uses validated public env only.
// ============================================================================
import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      env.supabaseUrl,
      env.supabasePublishableKey
    );
  }

  return browserClient;
}
