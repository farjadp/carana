// ============================================================================
// Source: proxy.ts
// Version: 1.3.0 — 2026-08-11
// Why: Keep Supabase SSR auth cookies fresh across app requests.
// Env / Identity: Request-scoped auth refresh only.
// ============================================================================
import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
