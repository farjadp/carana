// ============================================================================
// Source: lib/supabase/route-handler.ts
// Version: 1.3.0 — 2026-08-11
// Why: Create a Supabase client for route handlers that can mutate auth cookies.
// Env / Identity: Uses validated public env only.
// ============================================================================
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

export function createSupabaseRouteHandlerClient(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({
            request,
          });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  return {
    supabase,
    getResponse() {
      return response;
    },
  };
}
