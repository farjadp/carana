// ============================================================================
// Source: lib/ai/website-extract.ts
// Version: 1.0.0 — 2026-08-15
// Why: The pure part of "read it from my website": SSRF-guarded fetch, page
//      mining (hrefs, JSON-LD, logo, subpages) and the model extraction. No
//      auth or rate limiting here — the server action wraps this.
// Env / Identity: Server only (makes outbound requests and an OpenAI call).
// ============================================================================
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import * as cheerio from "cheerio";

export class InvalidTargetError extends Error {}

// ---------------------------------------------------------------------------
// What we ask the model for. Everything optional; absent means "not on site".
// ---------------------------------------------------------------------------
const daySchema = z
  .object({
    open: z.string().describe('Opening time as 24h "HH:MM", e.g. "09:00"').optional(),
    close: z.string().describe('Closing time as 24h "HH:MM", e.g. "18:00"').optional(),
    closed: z.boolean().describe("True if closed all day").optional(),
  })
  .describe("Omit the day entirely if the site does not state its hours.");

const hoursSchema = z
  .object({
    monday: daySchema.optional(),
    tuesday: daySchema.optional(),
    wednesday: daySchema.optional(),
    thursday: daySchema.optional(),
    friday: daySchema.optional(),
    saturday: daySchema.optional(),
    sunday: daySchema.optional(),
  })
  .describe(
    "Opening hours per weekday, only for days the site actually states. If the site says 'by appointment only' and gives no times, omit working_hours entirely."
  );

const extractionSchema = z.object({
  name: z.string().describe("Business name in Persian (transliterate if the site is English-only)").optional(),
  name_en: z.string().describe("Business name in English exactly as the site writes it").optional(),
  tagline: z.string().max(100).describe("A one-line slogan in Persian, if the site has one").optional(),
  short_description: z
    .string()
    .min(10)
    .max(120)
    .describe("10-120 characters, Persian: what this business does, for a directory card")
    .optional(),
  description: z
    .string()
    .min(50)
    .max(2000)
    .describe(
      "50-2000 characters, Persian, 2-4 paragraphs: services, specialty, who it serves, location. Faithful to the site; do not invent facts."
    )
    .optional(),
  category_slug: z
    .string()
    .describe("The single best matching slug from the provided category list, or omit")
    .optional(),
  sub_category: z.string().max(100).describe("Specific field within the category, in Persian").optional(),
  established_year: z.string().describe("Four-digit founding year if stated").optional(),
  phone: z.string().describe("Main phone, digits and + only, e.g. +14165551234").optional(),
  whatsapp: z.string().describe("WhatsApp number, digits and + only, if distinct or explicitly WhatsApp").optional(),
  contact_email: z.string().describe("Contact email address").optional(),
  website: z.string().describe("Absolute URL").optional(),
  instagram: z.string().describe("Absolute URL").optional(),
  telegram: z.string().describe("Absolute URL").optional(),
  linkedin: z.string().describe("Absolute URL").optional(),
  google_maps_url: z.string().describe("A Google Maps link to the business, if the site links one").optional(),
  address: z.string().max(250).describe("Street address, without city/province/postal code").optional(),
  city: z.string().describe("City name in English, e.g. Richmond Hill").optional(),
  province: z
    .enum(["ON", "BC", "QC", "AB", "MB", "SK", "NS", "NB", "NL", "PE"])
    .describe("Canadian province code")
    .optional(),
  postal_code: z.string().max(20).describe("Canadian postal code like L4C 1T6").optional(),
  languages: z
    .array(z.enum(["فارسی", "انگلیسی", "فرانسوی", "عربی", "ترکی", "سایر"]))
    .describe("Languages the business serves in, if stated or evident")
    .optional(),
  services: z
    .array(
      z.object({
        name: z.string().describe("Service or product name in Persian"),
        description: z.string().optional(),
        price: z.string().describe("Number only, no currency symbol").optional(),
        price_unit: z.string().describe("e.g. ساعت, جلسه, ماه, نفر").optional(),
      })
    )
    .max(20)
    .describe("Named services/products the site lists. Only what is actually listed.")
    .optional(),
  working_hours: hoursSchema.optional(),
  accepts_appointments: z.boolean().describe("True if the site offers booking/appointments").optional(),
  booking_url: z.string().describe("Online booking link, if any").optional(),
  logo_url: z.string().describe("Absolute URL of the business logo image, if identifiable").optional(),
  confidence: z
    .object({
      high: z.array(z.string()).describe("Field names found verbatim on the site"),
      low: z.array(z.string()).describe("Field names that were inferred, summarised, or translated"),
    })
    .describe("Which of the returned fields the owner should double-check"),
});

export type ScrapedBusiness = z.infer<typeof extractionSchema>;

// ---------------------------------------------------------------------------
// Network safety
// ---------------------------------------------------------------------------

/**
 * Reject anything that is not a public http(s) host.
 * Without this the server would fetch whatever a user types — localhost, LAN
 * addresses, cloud metadata — and hand the body to the model (SSRF).
 */
export function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new InvalidTargetError("آدرس وب‌سایت معتبر نیست.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidTargetError("فقط آدرس‌های http و https پشتیبانی می‌شوند.");
  }
  const host = parsed.hostname.toLowerCase();
  const isBlocked =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    /^\[?f[cd]/i.test(host) ||
    /^\[?fe80:/i.test(host);
  if (isBlocked) throw new InvalidTargetError("آدرس داخلی شبکه مجاز نیست.");
  return parsed;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 CharanaBot/1.0 (+https://charana.ca)";

async function fetchPage(url: URL): Promise<string | null> {
  try {
    const res = await fetch(url, {
      // A redirect could land on a private address and defeat the host check.
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    });
    // Follow at most one redirect that stays on the same site — http→https,
    // www↔apex, /→/fa are all common. Anything off-site is refused.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      const next = new URL(loc, url);
      const strip = (h: string) => h.toLowerCase().replace(/^www\./, "");
      if (strip(next.hostname) !== strip(url.hostname)) return null;
      assertPublicHttpUrl(next.toString());
      const res2 = await fetch(next, {
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      });
      if (!res2.ok) return null;
      return await res2.text();
    }
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page mining — the parts a parser gets right and a model gets wrong
// ---------------------------------------------------------------------------

const SUBPAGE_HINT =
  /about|contact|service|price|menu|team|hours|location|درباره|تماس|خدمات|قیمت|ساعات|آدرس|منو/i;

type Mined = {
  text: string;
  hrefs: { tel: string[]; mailto: string[]; social: string[]; maps: string[]; booking: string[] };
  jsonld: unknown[];
  logo?: string;
  subpages: URL[];
};

function mine(html: string, base: URL): Mined {
  const $ = cheerio.load(html);
  const jsonld: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      jsonld.push(JSON.parse($(el).text()));
    } catch {
      /* ignore malformed */
    }
  });

  const hrefs: Mined["hrefs"] = { tel: [], mailto: [], social: [], maps: [], booking: [] };
  const subpages = new Map<string, URL>();
  $("a[href]").each((_, el) => {
    const raw = $(el).attr("href")?.trim();
    if (!raw) return;
    if (raw.startsWith("tel:")) { hrefs.tel.push(raw.slice(4)); return; }
    if (raw.startsWith("mailto:")) { hrefs.mailto.push(raw.slice(7).split("?")[0]); return; }
    // Everything else is resolved to an absolute URL so relative links
    // (/book-consultation/) survive the trip through the model.
    let abs: string;
    try { abs = new URL(raw, base).toString(); } catch { return; }
    if (/wa\.me|whatsapp\.com|instagram\.com|t\.me|telegram\.me|linkedin\.com|facebook\.com/i.test(abs))
      hrefs.social.push(abs);
    else if (/maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|google\.com\/maps/i.test(abs)) hrefs.maps.push(abs);
    else if (/calendly|booksy|acuity|square\.site|setmore|book|appointment|رزرو|نوبت/i.test(abs))
      hrefs.booking.push(abs);
    try {
      const u = new URL(abs);
      if (u.hostname === base.hostname && SUBPAGE_HINT.test(u.pathname + " " + $(el).text())) {
        u.hash = "";
        subpages.set(u.pathname, u);
      }
    } catch {
      /* not a URL */
    }
  });

  // Logo: og:image, or an <img> whose alt/class/src says logo, in the header.
  let logo: string | undefined;
  const og = $('meta[property="og:image"]').attr("content");
  const imgLogo = $('header img, .logo img, img[alt*="logo" i], img[src*="logo" i], img[class*="logo" i]')
    .first()
    .attr("src");
  const pick = imgLogo ?? og;
  if (pick) {
    try {
      logo = new URL(pick, base).toString();
    } catch {
      /* skip */
    }
  }

  $("script, style, noscript, iframe, svg, video, nav, footer form").remove();
  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const body = $("body").text().replace(/\s+/g, " ").trim();
  const text = [title && `TITLE: ${title}`, metaDesc && `META: ${metaDesc}`, body].filter(Boolean).join("\n");

  return { text, hrefs, jsonld, logo, subpages: [...subpages.values()].slice(0, 4) };
}


export type ExtractOutcome =
  | { ok: true; data: ScrapedBusiness; pagesRead: number }
  | { ok: false; error: string };

/** Fetch, mine and extract. Throws InvalidTargetError for bad/private URLs. */
export async function extractBusinessFromWebsite(
  url: string,
  categories: { value: string; label: string }[] = []
): Promise<ExtractOutcome> {
  const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  const home = assertPublicHttpUrl(normalized);

  const homeHtml = await fetchPage(home);
  if (!homeHtml) {
    return { ok: false, error: "امکان دسترسی به وب‌سایت وجود ندارد. آدرس را بررسی کنید یا بعداً دوباره امتحان کنید." };
  }
  const homeMined = mine(homeHtml, home);

  const subHtml = await Promise.all(homeMined.subpages.map((u) => fetchPage(u)));
  const subMined = subHtml
    .map((h, i) => (h ? mine(h, homeMined.subpages[i]) : null))
    .filter((m): m is Mined => !!m);
  const all = [homeMined, ...subMined];

  const combinedText = all
    .map((m, i) => `--- PAGE ${i === 0 ? home.pathname || "/" : homeMined.subpages[i - 1]?.pathname ?? ""} ---\n${m.text}`)
    .join("\n\n")
    .slice(0, 28_000);

  const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 12);
  const links = {
    tel: uniq(all.flatMap((m) => m.hrefs.tel)),
    mailto: uniq(all.flatMap((m) => m.hrefs.mailto)),
    social: uniq(all.flatMap((m) => m.hrefs.social)),
    maps: uniq(all.flatMap((m) => m.hrefs.maps)),
    booking: uniq(all.flatMap((m) => m.hrefs.booking)),
  };
  const jsonld = all.flatMap((m) => m.jsonld).slice(0, 6);
  const logo = all.map((m) => m.logo).find(Boolean);
  const categoryList = categories.map((c) => `${c.value} = ${c.label}`).join("\n");

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: extractionSchema,
    temperature: 0.2,
    // Strict mode rejects optional nested keys and string formats; we validate
    // the result ourselves below, so let the model use the plain schema.
    providerOptions: { openai: { strictJsonSchema: false } },
    prompt: `You are filling a business-directory profile for a Persian-speaking directory of Iranian businesses in Canada, from the business's own website.

Rules:
- Only state what the site supports. If a field is not on the site, omit it. Never invent phone numbers, addresses, years or prices.
- Persian output for descriptive fields (name, tagline, short_description, description, sub_category, service names/descriptions, hours strings). Keep proper nouns, URLs, emails and phone numbers as-is.
- Prefer facts from STRUCTURED LINKS and JSON-LD over prose when they disagree.
- Phone/WhatsApp: normalise to E.164 digits with leading + (Canada is +1).
- Split the postal address into address / city / province code / postal_code.
- category_slug must be one of the slugs listed, or omitted.
- Put every field you filled from verbatim site content in confidence.high; anything summarised, translated or inferred goes in confidence.low.
${logo ? `- A likely logo image URL is: ${logo}` : ""}

CATEGORY SLUGS:
${categoryList || "(none provided)"}

STRUCTURED LINKS FOUND ON THE SITE:
${JSON.stringify(links, null, 1)}

JSON-LD ON THE SITE:
${jsonld.length ? JSON.stringify(jsonld).slice(0, 6000) : "(none)"}

SITE URL: ${home.toString()}

PAGE TEXT:
${combinedText}`,
  });

  // Post-validate what strict mode would not let us constrain in-schema.
  const isUrl = (v?: string) => { try { return !!v && /^https?:$/.test(new URL(v).protocol); } catch { return false; } };
  const isEmail = (v?: string) => !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const data: ScrapedBusiness = { ...object, website: isUrl(object.website) ? object.website : home.origin };
  for (const k of ["instagram", "telegram", "linkedin", "google_maps_url", "booking_url", "logo_url"] as const) {
    if (data[k] && !isUrl(data[k])) delete data[k];
  }
  if (data.contact_email && !isEmail(data.contact_email)) delete data.contact_email;
  // Hours: the model invents "9-18, weekends closed" for sites that state no
  // hours at all. Only trust hours if the site text actually contains
  // time-of-day patterns (09:00, 9am, 6 pm, ۹:۰۰ …).
  const siteHasTimes = /\b([01]?\d|2[0-3])(:[0-5]\d)?\s?(am|pm|a\.m\.|p\.m\.)\b|\b([01]?\d|2[0-3]):[0-5]\d\b|[۰-۹]{1,2}:[۰-۹]{2}/i.test(combinedText);
  if (data.working_hours && !siteHasTimes) delete data.working_hours;
  // Keep only well-formed days.
  if (data.working_hours) {
    const hh = /^([01]\d|2[0-3]):[0-5]\d$/;
    const clean: NonNullable<ScrapedBusiness["working_hours"]> = {};
    for (const [day, v] of Object.entries(data.working_hours) as [keyof NonNullable<ScrapedBusiness["working_hours"]>, { open?: string; close?: string; closed?: boolean }][]) {
      if (!v) continue;
      if (v.closed) clean[day] = { closed: true };
      else if (v.open && v.close && hh.test(v.open) && hh.test(v.close)) clean[day] = { open: v.open, close: v.close, closed: false };
    }
    if (Object.keys(clean).length) data.working_hours = clean; else delete data.working_hours;
  }
  // Empty strings are "not found", not findings.
  for (const k of Object.keys(data) as (keyof ScrapedBusiness)[]) {
    if (data[k] === "") delete data[k];
  }
  // Anything the model wrote in Persian from a non-Persian site is a
  // translation, and the owner should read it — regardless of what the model
  // claimed. Hours are frequently paraphrased too.
  const alwaysReview = ["short_description", "description", "tagline", "sub_category", "services", "working_hours"];
  const high = new Set(data.confidence?.high ?? []);
  const low = new Set(data.confidence?.low ?? []);
  for (const k of alwaysReview) if (k in data) { high.delete(k); low.add(k); }
  // Only report confidence for fields that actually came back.
  const present = (k: string) => k in data && data[k as keyof ScrapedBusiness] !== undefined;
  data.confidence = { high: [...high].filter(present), low: [...low].filter(present) };
  if (data.established_year && !/^\d{4}$/.test(data.established_year)) delete data.established_year;
  // A founding year must literally appear on the site.
  if (data.established_year && !combinedText.includes(data.established_year)) delete data.established_year;
  // "Serves in Persian" must be evidenced: Persian script on the site, or the word.
  if (data.languages?.includes("فارسی") && !/[\u0600-\u06FF]/.test(combinedText) && !/persian|farsi|iranian|ایران/i.test(combinedText)) {
    data.languages = data.languages.filter((l) => l !== "فارسی");
    if (!data.languages.length) delete data.languages;
  }
  if (data.instagram && !/instagram\.com/i.test(data.instagram)) delete data.instagram;
  if (data.telegram && !/t\.me|telegram\.me/i.test(data.telegram)) delete data.telegram;
  if (data.linkedin && !/linkedin\.com/i.test(data.linkedin)) delete data.linkedin;
  if (data.category_slug && !categories.some((c) => c.value === data.category_slug)) delete data.category_slug;
  if (!data.logo_url && logo) data.logo_url = logo;

  return { ok: true, data, pagesRead: all.length };
}
