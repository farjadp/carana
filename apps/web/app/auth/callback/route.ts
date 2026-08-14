// ============================================================================
// Source: app/auth/callback/route.ts
// Version: 1.3.0 — 2026-08-11
// Why: Exchange Supabase auth codes for sessions and redirect safely.
// Env / Identity: Uses SSR Supabase auth and validates internal redirect targets.
// ============================================================================
import { NextRequest, NextResponse } from "next/server";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = getSafeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/auth/error", url.origin));
  }

  const { supabase, getResponse } = createSupabaseRouteHandlerClient(request);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/error?reason=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // Record login activity
  if (data.user) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "unknown";

    await supabase.from("user_activity_logs").insert({
      user_id: data.user.id,
      action: "LOGIN",
      ip_address: ipAddress,
      metadata: { method: "magic_link_or_oauth" }
    });
  }

  const baseResponse = getResponse();
  const redirectResponse = NextResponse.redirect(new URL(next, url.origin));

  for (const cookie of baseResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}
