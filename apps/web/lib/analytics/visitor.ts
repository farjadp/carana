// ============================================================================
// Source: lib/analytics/visitor.ts
// Version: 1.0.0 — 2026-08-25
// Why: Everything about a request that telemetry is allowed to keep, derived
//      in ONE place. `visitorHash` moved here verbatim from
//      app/api/events/route.ts so the link-in-bio ingest cannot invent a
//      second definition of "unique visitor" — two hashing schemes would mean
//      the owner dashboard counts one person twice depending on which surface
//      they came from, which is the drift this project keeps paying for.
//
//      EVERY VALUE HERE IS DERIVED SERVER-SIDE. The client sends only which
//      page and which item; it never sends its own referrer, device or city.
//      A number a caller can write itself is not a measurement, and the same
//      rule already governs `businesses.plan`.
//
//      WHAT IS DELIBERATELY NOT KEPT: the IP address, ever. It goes into the
//      hash and is discarded. The salt rotates the hash daily, so the same
//      person is counted once within a day and cannot be followed across
//      days — that is the whole privacy design, and it is why these pages
//      need no consent banner.
// Env / Identity: Server only. Reads request headers and CRON_SECRET.
// ============================================================================
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * sha256(ip + user-agent + today + salt), truncated.
 *
 * The fallback salt is the literal string "charana" — kept through the rebrand
 * on purpose so hashes stay stable across the rename. Do not "fix" it to
 * "goplaza": that would silently make every returning visitor look new for a
 * day and break any comparison across the boundary.
 */
export function visitorHash(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const salt = process.env.CRON_SECRET ?? "charana";
  return createHash("sha256")
    .update(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

/** Host only. A full referrer URL can carry a query string with personal data. */
export function referrerHost(req: NextRequest): string | null {
  const raw = req.headers.get("referer");
  if (!raw) return null;
  try {
    return new URL(raw).host || null;
  } catch {
    return null;
  }
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|preview|headless|lighthouse|pingdom|curl|wget|python-requests|axios|monitor/i;
const TABLET_RE = /ipad|tablet|playbook|silk|android(?!.*mobile)/i;
const MOBILE_RE = /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i;

/**
 * Crawlers are RECORDED AND MARKED, never silently dropped. A view count
 * inflated by bots is a false number in the UI; a count quietly reduced by an
 * invisible filter is a number nobody can audit. The rollup excludes them, and
 * the rows stay so the exclusion can be checked.
 *
 * Note this catches link previewers too — WhatsApp, Telegram and Facebook all
 * fetch a page when someone pastes it in a chat. Those are the single biggest
 * source of phantom views on a link-in-bio page, because pasting the link is
 * exactly what people do with it.
 */
export function classifyDevice(req: NextRequest): { device: "mobile" | "tablet" | "desktop" | "bot"; bot: boolean } {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return { device: "bot", bot: true };
  if (TABLET_RE.test(ua)) return { device: "tablet", bot: false };
  if (MOBILE_RE.test(ua)) return { device: "mobile", bot: false };
  return { device: "desktop", bot: false };
}

/**
 * City, from the edge geolocation header the platform sets. Coarse by
 * definition — a city name, never coordinates — and absent in local
 * development, where the correct answer is null rather than a guess.
 */
export function requestCity(req: NextRequest): string | null {
  const raw = req.headers.get("x-vercel-ip-city");
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded || null;
  } catch {
    return null;
  }
}
