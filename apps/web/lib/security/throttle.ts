// ============================================================================
// Source: lib/security/throttle.ts
// Version: 1.0.0 — 2026-09-08
// Why: Make bulk scraping of the directory expensive without any real visitor
//      ever noticing. The listings are the product; the contact details on
//      them are the part with resale value, and until now a single script
//      could walk every page in the sitemap as fast as the CDN would serve it.
//
//      DESIGN CONSTRAINT, from Farjad, 8 Sep: nothing may make the site
//      harder to use. That rules out CAPTCHA, interstitials, and hiding phone
//      numbers behind a click — all of which score better on paper and all of
//      which a real person feels. What is left is a ceiling set so far above
//      human browsing that only a machine reaches it. The ceiling is 100.
//
//      WHY IT LIVES IN THE PROXY: /businesses/[slug] is ISR (revalidate=60),
//      so a scraper is served from the CDN and the page component never runs.
//      Middleware is the only code on the path of a cached hit.
//
//      WHAT THIS HONESTLY IS: an in-memory counter, per edge isolate. It is
//      not a distributed limiter and does not pretend to be. A burst from one
//      address lands mostly on one isolate, so the crude case — a single
//      script pulling the sitemap — trips it. A scraper spread over many
//      addresses does not, and neither does one that forges a Googlebot user
//      agent (see GOOD_BOT_RE). The answer to both is a Vercel WAF rule,
//      which is configuration rather than code; this file is the free half.
//      A shared store was considered and rejected: it would add a network
//      round-trip to every page view, which is a real cost to every real
//      visitor to catch a rarer class of abuser.
// Env / Identity: Request-scoped. Reads platform geo/IP headers. Keeps no IP
//      — the address is folded into a bucket key and never stored or logged.
// ============================================================================
import type { NextRequest } from "next/server";

/**
 * Requests per minute before a client is asked to slow down.
 *
 * THIS NUMBER IS NOT A GUESS AT HUMAN READING SPEED. It has to clear a much
 * higher bar: Next prefetches every <Link> entering the viewport, and the
 * listings grid puts 48 cards on one screenful, so a visitor who only scrolls
 * fires ~48 requests per page without clicking anything. Ten pages in a busy
 * minute is ~500 requests from one entirely innocent person.
 *
 * Prefetches cannot be told apart from page views here. The obvious exemption
 * — skipping requests that carry `Next-Router-Prefetch` — was written, tested,
 * and removed on 8 Sep: Next strips that header before the proxy runs. A probe
 * that echoed the header back read `null` for a request curl had definitely
 * sent it on. `RSC` and `Next-Router-State-Tree` go the same way. There is no
 * signal left to key on, so the ceiling absorbs the storm instead.
 *
 * 600/min is ~10 requests a second. A scraper walking the sitemap at any
 * useful speed clears it in seconds; a person cannot reach it by browsing.
 */
const PER_MINUTE = 600;
/** Requests per hour. Catches the patient scraper that stays under the minute. */
const PER_HOUR = 5000;

/**
 * The audience is Iranians living in Canada, so Canadian and US traffic gets
 * the generous ceiling. Everything else is not blocked — it is held to a
 * limit that is still roughly forty times a human reading pace. This is the
 * cheapest signal available: the platform resolves the country for free on
 * every request, and datacenters that scrapers rent are rarely in it.
 */
const HOME_COUNTRIES = new Set(["CA", "US"]);
const AWAY_PER_MINUTE = 200;
const AWAY_PER_HOUR = 1500;

/**
 * Search engines are exempt. Throttling Googlebot would deindex the site,
 * which is a far larger loss than any scrape.
 *
 * This trusts the user agent, which is forgeable — a scraper claiming to be
 * Googlebot walks straight through. Verifying it properly means a reverse DNS
 * lookup, which is not available in the edge runtime and would cost a lookup
 * per request. The trade is deliberate: a false negative here costs a scrape,
 * a false positive costs the index.
 */
const GOOD_BOT_RE =
  /googlebot|google-inspectiontool|bingbot|applebot|duckduckbot|yandexbot|baiduspider|slurp|petalbot|gptbot|oai-searchbot|chatgpt-user|claudebot|perplexitybot|facebookexternalhit|twitterbot|telegrambot|whatsapp|linkedinbot|vercel/i;

/**
 * Paths that are never counted. Assets and internals are not the thing being
 * protected, and counting them would let a single image-heavy page burn a
 * visitor's budget.
 */
function isCountable(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return false;
  if (pathname.startsWith("/api")) return false; // has its own per-route limits
  if (pathname.startsWith("/.well-known")) return false;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return false; // any file extension
  return true;
}

/**
 * A signed-in visitor is a known person with an account to lose, and the
 * dashboard legitimately makes many requests. Presence of the Supabase auth
 * cookie is enough — this is a fast path, not an authorisation check, and it
 * never reads or trusts the cookie's contents.
 */
function isSignedIn(request: NextRequest): boolean {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) return true;
  }
  return false;
}

/**
 * Client address. `x-vercel-forwarded-for` is set by the platform and cannot
 * be spoofed by the caller; the other two are fallbacks for local development
 * and are trusted only because nothing else is available there.
 *
 * The value never leaves this function — it goes into a bucket key and is
 * discarded, the same rule `lib/analytics/visitor.ts` follows.
 */
function clientAddress(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * FNV-1a. A bucket key, not a security boundary — the user agent is folded in
 * only so that two devices behind one household or carrier NAT get their own
 * budget. A cryptographic hash here would be cost with no benefit, and the
 * edge runtime's is async.
 */
function fold(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

type Window = { count: number; resetAt: number };
const minuteBuckets = new Map<string, Window>();
const hourBuckets = new Map<string, Window>();

/** Keep the maps bounded on a long-lived isolate. */
function sweep(map: Map<string, Window>, now: number) {
  if (map.size < 5000) return;
  for (const [key, window] of map) if (window.resetAt <= now) map.delete(key);
}

/** Returns true when this hit is over the ceiling. */
function over(map: Map<string, Window>, key: string, limit: number, ms: number, now: number) {
  sweep(map, now);
  const existing = map.get(key);
  if (!existing || existing.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + ms });
    return { exceeded: false, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    return { exceeded: true, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { exceeded: false, retryAfter: 0 };
}

export type ThrottleVerdict = { exceeded: false } | { exceeded: true; retryAfterSeconds: number };

/**
 * Count one page request and say whether it is over the ceiling.
 *
 * Exempt, in order of how cheap the check is: uncounted paths, verified-enough
 * search engines, signed-in people.
 */
export function checkThrottle(request: NextRequest): ThrottleVerdict {
  const { pathname } = request.nextUrl;
  if (!isCountable(pathname)) return { exceeded: false };

  const userAgent = request.headers.get("user-agent") ?? "";
  if (GOOD_BOT_RE.test(userAgent)) return { exceeded: false };
  if (isSignedIn(request)) return { exceeded: false };

  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  // An unknown country means local development or a self-hosted run, not a
  // suspicious visitor. Give it the generous ceiling rather than the strict one.
  const home = country === "" || HOME_COUNTRIES.has(country);
  const perMinute = home ? PER_MINUTE : AWAY_PER_MINUTE;
  const perHour = home ? PER_HOUR : AWAY_PER_HOUR;

  const key = `${clientAddress(request)}|${fold(userAgent)}`;
  const now = Date.now();

  const minute = over(minuteBuckets, key, perMinute, 60_000, now);
  if (minute.exceeded) return { exceeded: true, retryAfterSeconds: minute.retryAfter };

  const hour = over(hourBuckets, key, perHour, 3_600_000, now);
  if (hour.exceeded) return { exceeded: true, retryAfterSeconds: hour.retryAfter };

  return { exceeded: false };
}

/**
 * The response a client over the ceiling gets.
 *
 * A plain 429 with `Retry-After` — no CAPTCHA, no challenge page to solve.
 * The wording says exactly what happened and does not accuse anyone of
 * anything: a person who somehow reaches this is far likelier to be on a
 * shared connection than to be scraping, and telling them "you look like a
 * bot" would be both rude and unproven.
 *
 * `noindex` matters: without it a crawler that tripped the limit could cache
 * this page as the content of a real listing URL.
 */
export function throttledResponse(retryAfterSeconds: number): Response {
  const seconds = Math.max(1, retryAfterSeconds);
  const body = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>کمی آهسته‌تر</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
         margin: 0; min-height: 100vh; display: grid; place-items: center;
         background: #fafaf9; color: #1c1917; padding: 24px; }
  main { max-width: 30rem; text-align: center; }
  h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
  p { line-height: 1.9; margin: 0 0 1.5rem; color: #57534e; }
  a { display: inline-block; padding: 0.7rem 1.5rem; border-radius: 0.6rem;
      background: #1c1917; color: #fafaf9; text-decoration: none; }
</style>
</head>
<body>
  <main>
    <h1>کمی آهسته‌تر</h1>
    <p>درخواست‌های زیادی از این اتصال در مدت کوتاهی دریافت شد.
       حدود ${seconds} ثانیه صبر کنید و دوباره امتحان کنید — حساب شما مشکلی ندارد.</p>
    <a href="/">بازگشت به صفحهٔ اصلی</a>
  </main>
</body>
</html>`;

  return new Response(body, {
    status: 429,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "retry-after": String(seconds),
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
