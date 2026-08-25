// ============================================================================
// Source: proxy.ts
// Version: 1.5.0 — 2026-08-25
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
//      v1.5 (25 Aug): gplz.link is served from here too. It is a second
//      hostname on this same app — one repo, one database, one deploy — and
//      this is the only place that knows it exists. Removing this branch is
//      most of what removing the whole link-in-bio product would take.
// Env / Identity: Request-scoped auth refresh; both host branches read only
//      the request host. No auth cookie is touched on the short domain.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { HANDLE_RE, brand } from "@goplaza/core";
import { updateSession } from "@/lib/supabase/proxy";

/** Hosts that must hand every request to the canonical origin, permanently. */
const LEGACY_HOSTS = new Set(["charana.ca", "www.charana.ca", "www.goplaza.ca"]);

const CANONICAL_HOST = "goplaza.ca";

/**
 * The short domain. Bio pages and the platform's own short links are served
 * from here by this same app — see `shortHost` below.
 *
 * `brand` and `HANDLE_RE` are imported rather than re-typed. The proxy docs
 * warn against relying on shared modules, which is about mutable state and
 * globals: these are pure constants inlined at build time. Copying the handle
 * pattern here instead would make a third definition of it, and the last time
 * two definitions disagreed the database accepted `Kabab-Sara` while the app
 * rejected it (docs/06-gotchas.md).
 */
const SHORT_HOSTS = new Set([brand.shortDomain, `www.${brand.shortDomain}`]);

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

  if (SHORT_HOSTS.has(host)) return shortHost(request);

  // `/link/<handle>` is where the short host rewrites to — an implementation
  // detail, not a second public address. Reached directly on goplaza.ca it
  // would be a duplicate of the bio page under the wrong domain, so it is
  // sent to the real one. The internal rewrite above is unaffected: proxy
  // runs once per request, and a rewrite does not re-enter it.
  const internalLink = /^\/link\/(.+)$/.exec(request.nextUrl.pathname);
  if (internalLink) {
    return NextResponse.redirect(new URL(`/${internalLink[1]}`, brand.shortUrl), 301);
  }

  return await updateSession(request);
}

/**
 * Everything `gplz.link` serves. It is a second hostname on this same app, not
 * a second site — one repo, one database, one deploy.
 *
 * `updateSession` is deliberately NOT called on this path. Bio pages are
 * public and nobody signs in here, so refreshing a Supabase auth cookie would
 * only mean setting session cookies on a domain that has no session.
 */
function shortHost(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // robots.txt and sitemap.xml are answered HERE rather than by branching
  // app/robots.ts and app/sitemap.ts on the host. Those are static metadata
  // routes with no access to the request; making them host-aware would mean
  // reading headers(), which turns both dynamic and throws away the hourly
  // cache on a sitemap that walks 10,000 listings. One host check, no cost.
  if (pathname === "/robots.txt") {
    // The whole host is closed to indexing. Every bio page is a thin
    // restatement of a goplaza.ca profile, and letting the two compete is the
    // duplicate-content problem the charana.ca 301 above exists to end. The
    // pages also carry `noindex, follow` + a canonical; this is the outer
    // fence, not the only one.
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // No sitemap on this host. Without this it would serve goplaza.ca's — a
  // complete second copy of the site's URL list under the wrong domain.
  if (pathname === "/sitemap.xml") {
    return new NextResponse("Not found", { status: 404 });
  }

  // Marketing lives on the main site; the bare domain is not a landing page.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`https://${CANONICAL_HOST}`), 302);
  }

  // Short links for the platform's own share buttons. Only prefixes that
  // resolve to a page that exists: there is no /a for announcements, because
  // an announcement has no public URL of its own — it renders on the profile.
  const short = /^\/(b|j)\/(.+)$/.exec(pathname);
  if (short) {
    const [, kind, rest] = short;
    const path = kind === "b" ? `/b/${rest}` : `/jobs/${rest}`;
    return NextResponse.redirect(new URL(path, `https://${CANONICAL_HOST}`), 301);
  }

  const raw = pathname.slice(1);
  const handle = raw.toLowerCase();

  // Handles are stored lowercase and looked up case-insensitively, so
  // /Kabab-Sara and /kabab-sara are the same page. Redirect rather than
  // serve both: one page, one URL, and a QR code scanned from a shop window
  // lands on the address that was printed.
  if (raw !== handle && HANDLE_RE.test(handle)) {
    return NextResponse.redirect(new URL(`/${handle}`, brand.shortUrl), 301);
  }

  // A bio page. REWRITE, not redirect — the point of a short domain is that
  // the short URL stays in the address bar and on the printed QR code.
  //
  // Whether the handle EXISTS is not decided here; the page decides, and a
  // missing one renders the not-found UI. Per the Next 16 docs that response
  // is a 200 rather than a 404 because this app streams (it has a
  // loading.tsx), with `noindex` injected — a soft 404. Acceptable on this
  // host, which robots.txt closes entirely; a real 404 would mean a database
  // lookup in the proxy on every request.
  if (HANDLE_RE.test(handle)) {
    return NextResponse.rewrite(new URL(`/link/${handle}`, request.url));
  }

  // Anything else on this host is not ours to serve.
  return NextResponse.redirect(new URL(`https://${CANONICAL_HOST}`), 302);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
