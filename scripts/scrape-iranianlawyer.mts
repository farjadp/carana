// ============================================================================
// Source: scripts/scrape-iranianlawyer.mts
// Version: 1.0.0 — 2026-08-23
// Why: iranianlawyer.org is an eighth directory — the only one that is
//      lawyer-only and worldwide. We want its **Canadian** entries, so the
//      country filter is the whole point of this file and is enforced from
//      the page's own breadcrumb taxonomy, not from an address guess.
//
// Read of the real HTML on 23 Aug 2026:
//   · WordPress 7.1, custom post type `lawyers`, custom taxonomy `location`
//     that is hierarchical: /location/canada/british-columbia/vancouver/.
//   · The CPT is NOT exposed on wp-json (only menu-locations is), so this
//     parses HTML.
//   · DISCOVERY IS THE SITEMAP, NOT THE ARCHIVE. /location/canada/ renders 44
//     profiles and links a page/2 that 301s back to page 1 — the archive is
//     capped and lies about having more. Summing the four province archives
//     already gives 49, which is proof the country archive is incomplete.
//     wp-sitemap-posts-lawyers-1.xml lists all 707 worldwide, so we walk all
//     707 detail pages and keep the ones whose own breadcrumb says Canada.
//     That costs ~660 wasted fetches and is the only way to not silently
//     miss Canadian lawyers.
//   · Per profile: h1 is "English | فارسی"; breadcrumb anchors under
//     /location/ give country/province/city; tel: and mailto: links; the
//     website is the .btn "Website"; an "Address" info-header block holds
//     firm, street, city, province, postal, country; practice areas are
//     .practices-single anchors; description lives in two language tabs
//     (#tab_main English, #tab0 Persian); the photo is og:image.
//
// What is deliberately NOT carried over: the site's star rating (SourceListing
// has `likes`, and a rating is not a like — writing one into the other would
// be exactly the unbacked-number problem this project hunts). Practice areas,
// languages and "practicing since" have no SourceListing column either, so
// they are folded into `tagline`/`description` text where they are readable,
// never invented into fields.
//
// Env / Identity: No credentials. Read-only. Polite: 4 in flight, 300ms gap.
//
// Usage:
//   npx tsx scripts/scrape-iranianlawyer.mts [--out iranianlawyer.json] [--limit N]
// ============================================================================
import fs from "node:fs";
import * as cheerio from "cheerio";

import { clean, cleanPhone, type SourceListing } from "./lib/source-listing.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = flag("out", "iranianlawyer.json");
const LIMIT = Number(flag("limit", "0")) || 0;
const ORIGIN = "https://www.iranianlawyer.org";
const SITEMAP = `${ORIGIN}/wp-sitemap-posts-lawyers-1.xml`;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const NOW = new Date().toISOString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fa,en;q=0.8" },
        redirect: "follow",
      });
      if (res.status === 404 || res.status === 410) return null;
      // The site rate-limits under sustained crawling and 429 needs to be
      // waited out, not retried at the same cadence — the first full run lost
      // 3 profiles to it because the generic 1.2s backoff was far too short.
      if (res.status === 429) {
        await sleep(15_000 * attempt);
        throw new Error("HTTP 429");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 4) {
        console.error(`\n  giving up on ${url}: ${(e as Error).message}`);
        return null;
      }
      await sleep(1200 * attempt);
    }
  }
  return null;
}

/**
 * The sitemaps on this site answer **HTTP 404 with a perfectly valid body** —
 * verified 23 Aug 2026: wp-sitemap.xml and wp-sitemap-posts-lawyers-1.xml both
 * 404 while serving the full <urlset>, whereas real lawyer pages 200 and a
 * made-up one 404s. So the status code cannot be trusted for sitemaps, only
 * for detail pages. Reading the body regardless is safe because it is
 * self-validating: no <loc>, no URLs, and the run stops with a loud zero.
 */
async function getSitemap(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    return await res.text();
  } catch {
    return "";
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        await sleep(300);
      }
    })
  );
  return out;
}

/** Text of a block, with <br> turned into real line breaks (the address needs it). */
function blockLines($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string[] {
  const html = (el.html() ?? "").replace(/<br\s*\/?>/gi, "\n");
  return cheerio
    .load(`<div>${html}</div>`)("div")
    .text()
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** The div that follows an .info-header whose text starts with `label`. */
function afterHeader($: cheerio.CheerioAPI, label: string): cheerio.Cheerio<any> | null {
  let found: cheerio.Cheerio<any> | null = null;
  $(".info-header").each((_, el) => {
    if (found) return;
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.toLowerCase().startsWith(label.toLowerCase())) found = $(el).next();
  });
  return found;
}

type Parsed = SourceListing & {
  /** Kept out of SourceListing on purpose; used for the report, not the import. */
  _country: string | null;
  _province: string | null;
};

function parse(html: string, url: string): Parsed | null {
  const $ = cheerio.load(html);

  // --- location, from the breadcrumb's own taxonomy links -------------------
  // /location/<country>/<province>/<city>/ — depth decides which is which.
  let country: string | null = null;
  let province: string | null = null;
  let city: string | null = null;
  $('a[href*="/location/"]').each((_, a) => {
    const href = ($(a).attr("href") ?? "").replace(ORIGIN, "");
    const m = href.match(/^\/location\/([^/]+)\/(?:([^/]+)\/)?(?:([^/]+)\/)?$/);
    if (!m) return;
    // Only the breadcrumb sits inside .breadcrumb-item — the header menu links
    // every country and would otherwise overwrite this with "Armenia".
    if ($(a).closest(".breadcrumb-item").length === 0) return;
    const text = clean($(a).text());
    // A few city terms carry a disambiguating province suffix in the label
    // itself ("Victoria-bc"), which would otherwise reach the DB as the city
    // name and match no province. Strip it; the province comes from its own
    // breadcrumb level anyway.
    const cityText = text ? clean(text.replace(/-(?:bc|on|ab|qc|mb|sk|ns|nb|nl|pe)$/i, "")) : text;
    if (m[3]) city ??= cityText;
    else if (m[2]) province ??= text;
    else country ??= text;
  });
  if (!country || country.toLowerCase() !== "canada") return null;

  // --- name -----------------------------------------------------------------
  const h1 = $("h1").first();
  const parts = blockLines($, h1).join(" ").split("|").map((s) => s.trim()).filter(Boolean);
  const nameEn = parts[0] ?? null;
  const nameFa = parts.slice(1).join(" ").trim() || null;
  // The directory is Persian-facing: the Persian name is the display name when
  // the source gives one, with the English kept in the text for the importer.
  const name = clean(nameFa || nameEn);
  if (!name) return null;

  // --- contact --------------------------------------------------------------
  const phones = [
    ...new Set(
      $('a[href^="tel:"]')
        .map((_, a) => cleanPhone($(a).attr("href") ?? ""))
        .get()
        .filter((p): p is string => !!p)
    ),
  ];
  const email =
    clean($("#copy-email").attr("data-email")) ??
    clean(($('a[href^="mailto:"]').first().attr("href") ?? "").replace(/^mailto:/, "").split("?")[0]);

  // The site's own host, google maps and the vCard endpoint are not websites.
  let website: string | null = null;
  $("a[href]").each((_, a) => {
    if (website) return;
    if (clean($(a).text())?.toLowerCase() !== "website") return;
    const href = ($(a).attr("href") ?? "").trim();
    if (/^https?:\/\//i.test(href) && !href.includes("iranianlawyer.org")) website = href;
  });

  // SCOPE THIS TIGHTLY. The page footer carries the DIRECTORY's own accounts
  // (instagram.com/iranianlawyer_org). A whole-page sweep gave every lawyer
  // that same handle — and the importer treats "same instagram" as "same
  // business", so all of them would have merged into one row. Only the
  // profile's own .social-size list counts, and the site's accounts are
  // rejected even there.
  const socials = { instagram: null as string | null, telegram: null as string | null, whatsapp: null as string | null, facebook: null as string | null };
  $(".social-size a[href]").each((_, a) => {
    const href = ($(a).attr("href") ?? "").trim();
    if (!/^https?:\/\//i.test(href)) return;
    if (/iranianlawyer/i.test(href)) return;
    let host = "";
    try {
      host = new URL(href).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      return;
    }
    if (host.endsWith("instagram.com")) socials.instagram ??= href;
    else if (host === "t.me" || host.endsWith("telegram.me")) socials.telegram ??= href;
    else if (host === "wa.me" || host.endsWith("whatsapp.com")) socials.whatsapp ??= href;
    else if (host.endsWith("facebook.com") || host === "fb.com") socials.facebook ??= href;
  });

  // --- address --------------------------------------------------------------
  // Printed as: firm / street… / city / province / postal / country. The last
  // line is always the country and the postal is the line matching a postcode;
  // everything before the city line is the firm + street.
  const addrEl = afterHeader($, "Address");
  const addrLines = addrEl ? blockLines($, addrEl) : [];
  // Most profiles put the postcode on its own line, but some inline it
  // ("10087 Yonge St, Richmond Hill, ON L4C 1T7"), so match anywhere in the
  // line and only drop the line when the postcode WAS the whole line.
  const POSTAL = /\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/;
  let postal: string | null = null;
  const rest: string[] = [];
  for (const line of addrLines) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    const m = trimmed.match(POSTAL);
    if (m) postal ??= `${m[1]} ${m[2]}`.toUpperCase();
    if (m && POSTAL.test(trimmed) && trimmed.replace(POSTAL, "").trim() === "") continue;
    rest.push(line);
  }
  // Drop the trailing country and the province/city lines — the importer
  // normalises the city itself from `city_hint`, and repeating them in the
  // street makes a worse address than leaving them out.
  const drop = new Set(
    [country, province, city].filter(Boolean).map((s) => (s as string).toLowerCase())
  );
  const street = clean(
    rest
      .filter((l) => !drop.has(l.toLowerCase()))
      .join("، ")
      .replace(/[,،]\s*[,،]/g, "،")
      .replace(/[,،]\s*$/, "")
  );

  // --- practice areas, languages, since ------------------------------------
  const practices = $(".practice-areas .practices-single a")
    .map((_, a) => clean($(a).text()))
    .get()
    .filter((s): s is string => !!s);
  const since = clean($(".practicing-since").first().text())?.replace(/[()]/g, "") ?? null;
  const langs = (() => {
    const el = afterHeader($, "Languages");
    // "Languages" has no wrapper div — the text is a bare sibling node.
    const raw = el && el.length ? blockLines($, el).join(" ") : null;
    if (raw) return clean(raw);
    const hdr = $(".info-header").filter((_, e) => $(e).text().trim().toLowerCase().startsWith("languages")).first();
    return clean(hdr.length ? (hdr[0].nextSibling as any)?.data ?? "" : "");
  })();

  // --- description ----------------------------------------------------------
  const faBody = clean($("#tab0").text());
  const enBody = clean($("#tab_main").text());
  const description = [faBody, enBody].filter(Boolean).join("\n\n") || null;

  // Tagline: what the source actually states about this lawyer, nothing more.
  const tagline =
    clean(
      [
        practices.length ? `زمینه‌های کاری: ${practices.join("، ")}` : null,
        langs ? `زبان‌ها: ${langs}` : null,
        since,
      ]
        .filter(Boolean)
        .join(" · ")
    ) ?? null;

  // --- photo ----------------------------------------------------------------
  const og = clean($('meta[property="og:image"]').attr("content"));
  const logo =
    og && !/favicon|iranian-lawyer\.webp|loading-iran|placeholder|no-image|default/i.test(og) ? og : null;

  return {
    source: "iranianlawyer",
    source_id: (url.match(/\/lawyers\/([^/]+)\/?$/)?.[1] ?? url),
    source_url: url,
    category: practices.length ? practices.join(" / ") : "Lawyer",
    name,
    tagline: tagline ? tagline.slice(0, 300) : null,
    description,
    phones,
    email,
    street,
    city_hint: city ?? province ?? null,
    postal_code: postal,
    website,
    instagram: socials.instagram,
    telegram: socials.telegram,
    whatsapp: socials.whatsapp,
    facebook: socials.facebook,
    logo_url: logo,
    likes: null,
    scraped_at: NOW,
    _country: country,
    _province: province,
  };
}

// ---------------------------------------------------------------------------
async function main() {
  const xml = await getSitemap(SITEMAP);
  let urls = [...new Set((xml.match(/<loc>([^<]+)<\/loc>/g) ?? []).map((m) => m.slice(5, -6).trim()))].filter(
    (u) => u.includes("/lawyers/")
  );
  if (urls.length === 0) {
    console.error(`no <loc> entries in ${SITEMAP} — the sitemap moved or the site changed. Nothing scraped.`);
    process.exit(1);
  }
  // --only lets a run pick up exactly the profiles a previous run dropped
  // (429s), instead of re-crawling all 707 to recover three of them.
  const only = flag("only", "");
  if (only) {
    const wanted = new Set(only.split(",").map((s) => s.trim()).filter(Boolean));
    urls = urls.filter((u) => wanted.has(u) || wanted.has(u.match(/\/lawyers\/([^/]+)\/?$/)?.[1] ?? ""));
  }
  if (LIMIT) urls = urls.slice(0, LIMIT);
  console.log(`sitemap: ${urls.length} lawyer profiles worldwide — walking all of them, keeping Canada`);

  let done = 0;
  let skippedNonCanada = 0;
  let failed = 0;
  const results = await mapLimit(urls, 4, async (url) => {
    const html = await get(url);
    done += 1;
    if (done % 20 === 0 || done === urls.length) {
      process.stdout.write(`\r  fetched ${done}/${urls.length} · canada so far ${done - skippedNonCanada - failed}`);
    }
    if (!html) {
      failed += 1;
      return null;
    }
    try {
      const p = parse(html, url);
      if (!p) skippedNonCanada += 1;
      return p;
    } catch (e) {
      failed += 1;
      console.error(`\n  parse failed ${url}: ${(e as Error).message}`);
      return null;
    }
  });

  const canada = results.filter((r): r is Parsed => !!r);
  console.log(`\n\nCanada: ${canada.length} · other countries: ${skippedNonCanada} · failed: ${failed}`);

  const byProvince = new Map<string, number>();
  for (const l of canada) byProvince.set(l._province ?? "—", (byProvince.get(l._province ?? "—") ?? 0) + 1);
  console.log("by province:", [...byProvince.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(" · "));
  const field = (k: keyof Parsed) => canada.filter((l) => (Array.isArray(l[k]) ? (l[k] as unknown[]).length : l[k])).length;
  console.log(
    `coverage — phone ${field("phones")} · email ${field("email")} · website ${field("website")} · ` +
      `street ${field("street")} · city ${field("city_hint")} · postal ${field("postal_code")} · ` +
      `photo ${field("logo_url")} · description ${field("description")} · instagram ${field("instagram")}`
  );

  const payload: SourceListing[] = canada.map(({ _country, _province, ...rest }) => rest);
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\nwrote ${payload.length} listings -> ${OUT}`);
}

await main();
