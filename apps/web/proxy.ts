// ============================================================================
// Source: proxy.ts
// Version: 1.4.0 — 2026-08-24
// Why: Keep Supabase SSR auth cookies fresh across app requests, and make the
//      legacy charana.ca domain a permanent redirect instead of a second copy
//      of the site.
//
//      Until now charana.ca was a Vercel alias on the same project and served
//      HTTP 200 for every path — a full duplicate of goplaza.ca. The pages did
//      emit a cross-domain canonical, which is a hint, but a rename needs the
//      301: it is the only signal that transfers link equity, and Google's
//      Change of Address tool requires the redirect to be in place.
//      `Host:` in robots.txt does nothing — Google dropped support for it.
// Env / Identity: Request-scoped auth refresh; the redirect reads only the
//      request host.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/** Hosts that must hand every request to the canonical origin, permanently. */
const LEGACY_HOSTS = new Set(["charana.ca", "www.charana.ca", "www.goplaza.ca"]);

const CANONICAL_HOST = "goplaza.ca";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase().split(":")[0] ?? "";

  if (LEGACY_HOSTS.has(host)) {
    // Path-for-path, so /businesses/x lands on the same listing rather than
    // dumping every legacy URL on the homepage — Google treats a mass
    // redirect-to-root as a soft 404 and drops the URLs instead of moving
    // them. `nextUrl` already carries pathname + search; only the host moves.
    const target = new URL(request.nextUrl.toString());
    target.protocol = "https:";
    target.host = CANONICAL_HOST;
    target.port = "";
    return NextResponse.redirect(target, 301);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
