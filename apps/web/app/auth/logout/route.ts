// ============================================================================
// Source: app/auth/logout/route.ts
// Version: 1.3.0 — 2026-08-11
// Why: Sign the user out with a POST-only route and clear the SSR session.
// Env / Identity: Uses SSR Supabase auth and avoids GET-based logout.
// ============================================================================
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const { supabase, getResponse } = createSupabaseRouteHandlerClient(request);

  // Import logUserActivity from lib/actions/logs
  const { logUserActivity } = await import("@/lib/actions/logs");
  
  // Log before signing out because we need the session to know who is logging out
  await logUserActivity("LOGOUT");

  await supabase.auth.signOut();

  const baseResponse = getResponse();
  const redirectResponse = NextResponse.redirect(new URL("/", url.origin));

  for (const cookie of baseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
