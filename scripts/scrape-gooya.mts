// ============================================================================
// Source: scripts/scrape-gooya.mts
// Version: 1.0.0 — 2026-08-24
// Why: gooyalisting.ca is the ninth directory and by far the largest single
//      Persian-Canadian source we have found — 7,471 published listings, an
//      order of magnitude more than any previous scrape.
//
// Read of the real site on 24 Aug 2026:
//   · WordPress 7.1 + the Wilcity listing theme. CPT `listing`, taxonomies
//     `listing_cat`, `listing_location`, `listing_tag`.
//   · DISCOVERY IS THE REST API, NOT THE SITEMAP. Yoast splits the listings
//     across listing-sitemap1..8.xml, but sitemap1 serves an EMPTY urlset and
//     the eight together carry only 5,471 URLs, while
//     /wp-json/wp/v2/listings answers X-WP-Total: 7,471. The sitemap silently
//     hides 2,000 businesses; the REST collection is the honest enumeration.
//     Note the rest_base is `listings` (plural) — /wp/v2/listing 404s.
//   · Contact details are postmeta and are NOT in `meta` on the REST record
//     (it is an empty array), so every detail page still has to be fetched.
//     They live in one sidebar box, `.wilcity-sidebar-item-business-info`,
//     as `.wil-listing-email` / `.wil-listing-phone` / `.wil-listing-website`
//     plus a strip of social anchors. Scoping to that box is mandatory: the
//     site FOOTER carries the directory operator's own phone, email and
//     Thornhill address on every single page, so a document-wide `tel:` sweep
//     would stamp +1 647 556 4811 / info@fantasticabranding.ca onto all
//     7,471 records.
//   · Phones render as "14506391629+" — the plus is at the END. That is the
//     RTL layout leaking into the stored string, not a suffix; it is moved
//     back to the front here.
//   · Addresses are nearly worthless here and must not be trusted. `oAddress`
//     is false on every listing the theme's own card API returns, and the
//     detail page's `.wil-listing-address` is a free-text Google-Maps *search*
//     link that in ~39 of 40 sampled listings says nothing more specific than
//     "Toronto, Ontario, Canada". So `street` is only filled when the text
//     actually contains a street token, never when it is just a city name —
//     the real location signal is the `listing_location` term.
//   · The body is WPBakery output — [vc_row]/[vc_column_text] shortcodes with
//     an embedded Google Maps iframe. Both are stripped before the text.
//
// What is deliberately NOT carried over: the "N بازدید" view counter. It is a
// view count, not a like, and SourceListing.likes is a like — writing one into
// the other is exactly the unbacked-number problem the house rules forbid.
// Star ratings render as "-" (no reviews) and are skipped for the same reason.
//
// Env / Identity: no credentials, read-only, /listing/ is allowed by robots.
// Polite: 5 in flight, 250ms gap, backoff on 429.
//
// Usage:
//   npx tsx scripts/scrape-gooya.mts [--out gooya.json] [--limit N]
// ============================================================================
import fs from "node:fs";
import * as cheerio from "cheerio";

import { classifyLinks, clean, toLatinDigits, type SourceListing } from "./lib/source-listing.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const OUT = flag("out", "gooya.json");
const LIMIT = Number(flag("limit", "0")) || 0;
// Repair mode: re-fetch only the URLs a previous run gave up on (its log
// carries one "giving up on <url>" line each) and merge them into OUT, so a
// transient 503 costs a minute instead of silently dropping businesses.
const REPAIR = flag("repair", "");
const ORIGIN = "https://gooyalisting.ca";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const NOW = new Date().toISOString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string, asJson = false): Promise<any> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fa,en;q=0.8" },
        redirect: "follow",
      });
      if (res.status === 404 || res.status === 410) return null;
      // 429 and 503 both mean "you are going too fast"; the generic 1.2s
      // backoff is far too short for either. The first full run lost roughly
      // 1% of pages to bare 503s before this branch existed.
      if (res.status === 429 || res.status === 503) {
        await sleep(15_000 * attempt);
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return asJson ? await res.json() : await res.text();
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

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
        await sleep(250);
      }
    })
  );
  return out;
}

/** Term id → term name, for the three listing taxonomies. */
async function loadTerms(tax: string): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (let page = 1; page <= 20; page += 1) {
    const rows = await get(`${ORIGIN}/wp-json/wp/v2/${tax}?per_page=100&page=${page}`, true);
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const t of rows) map.set(t.id, decodeEntities(String(t.name)));
    if (rows.length < 100) break;
  }
  return map;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&#0?38;|&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…");

/** WPBakery body → readable text. */
function bodyToText(rendered: string): string | null {
  const stripped = rendered
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/\[\/?[a-z0-9_]+[^\]]*\]/gi, " ");
  const $ = cheerio.load(`<div>${stripped}</div>`);
  $("h1,h2,h3,h4,p,br,li,div").each((_, el) => {
    $(el).append("\n");
  });
  const text = decodeEntities($.root().text())
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return text.length > 1 ? text : null;
}

/**
 * "14506391629+" is a +1 number whose plus has been dragged to the end by the
 * RTL layout. Anything else is normalised the usual way. Returns null unless
 * at least 10 digits survive, so the site's stray "0" and "-" entries drop.
 */
function normalisePhone(raw: string): string | null {
  let p = toLatinDigits(raw.replace(/^tel:/i, "")).replace(/[^\d+]/g, "");
  if (p.endsWith("+") && !p.startsWith("+")) p = `+${p.slice(0, -1)}`;
  const lead = p.startsWith("+") ? "+" : "";
  p = lead + p.replace(/\+/g, "");
  if (p.replace(/\D/g, "").length < 10) return null;
  return p;
}

/** `listing_location` mixes provinces in with the cities; these are not cities. */
const PROVINCE_TERMS = new Set([
  "انتاریو",
  "اونتاریو",
  "بریتیش کلمبیا",
  "کبک",
  "آلبرتا",
  "کانادا",
]);

const CA_POSTAL = /\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/;
const postalOf = (addr: string | null) => {
  const m = addr ? CA_POSTAL.exec(addr) : null;
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
};
/**
 * Drop the city/province/country tail so `street` is a street. "Toronto,
 * Ontario, Canada" has no street part at all and must come back null rather
 * than pretend the city is an address.
 */
const TAIL =
  /^(canada|ontario|on|quebec|qc|british columbia|bc|alberta|ab|manitoba|mb|saskatchewan|sk|nova scotia|ns|new brunswick|nb|toronto|north york|scarborough|etobicoke|mississauga|markham|richmond hill|thornhill|vaughan|newmarket|aurora|oakville|ottawa|montreal|montréal|laval|vancouver|north vancouver|west vancouver|burnaby|richmond|coquitlam|surrey|calgary|edmonton|winnipeg|halifax|quebec city)$/i;
function splitStreet(addr: string | null): string | null {
  if (!addr) return null;
  const parts = addr
    .replace(CA_POSTAL, "")
    .split(",")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  while (parts.length && TAIL.test(parts[parts.length - 1])) parts.pop();
  const street = parts.join(", ").replace(/[,\s]+$/, "");
  return street && /\d|st\.|street|ave|road|rd\.|blvd|dr\.|unit|suite/i.test(street) ? street : null;
}

type Enumerated = {
  id: number;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  content: string;
  cats: number[];
  locs: number[];
  tags: number[];
};

async function enumerateListings(limit = 0): Promise<Enumerated[]> {
  const fields = "id,slug,link,title,excerpt,content,listing_cat,listing_location,listing_tag";
  const out: Enumerated[] = [];
  for (let page = 1; page <= 400; page += 1) {
    const rows = await get(
      `${ORIGIN}/wp-json/wp/v2/listings?per_page=100&page=${page}&orderby=id&order=asc&_fields=${fields}`,
      true
    );
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      out.push({
        id: r.id,
        slug: r.slug,
        link: r.link,
        title: decodeEntities(r.title?.rendered ?? ""),
        excerpt: r.excerpt?.rendered ?? "",
        content: r.content?.rendered ?? "",
        cats: r.listing_cat ?? [],
        locs: r.listing_location ?? [],
        tags: r.listing_tag ?? [],
      });
    }
    process.stdout.write(`\r  enumerated ${out.length}`);
    if (limit && out.length >= limit) break;
    if (rows.length < 100) break;
    await sleep(200);
  }
  process.stdout.write("\n");
  return out;
}

/** The contact box only. Never the footer — see the header note. */
function parseDetail(html: string) {
  const $ = cheerio.load(html);
  const box = $(".wilcity-sidebar-item-business-info").first();

  const email =
    clean(
      box
        .find(".wil-listing-email a[href^='mailto:']")
        .first()
        .attr("href")
        ?.replace(/^mailto:/i, "")
    ) ?? null;

  const phones = box
    .find(".wil-listing-phone a[href^='tel:'], .wil-listing-phone .icon-box-1_text__3R39g")
    .map((_, el) => $(el).attr("href") ?? $(el).text())
    .get()
    .map((v) => normalisePhone(v))
    .filter((v): v is string => Boolean(v));

  // `.wil-listing-address` is a Google-Maps *search* link — its text is the
  // address exactly as typed by whoever filed the listing, which ranges from a
  // full street line to just "Toronto, Ontario, Canada". Only the part before
  // the city/province/country tail is worth calling a street.
  const addressText = clean(box.find(".wil-listing-address .icon-box-1_text__3R39g").first().text());

  const hrefs = [
    ...box.find(".wil-listing-website a[href]").map((_, el) => $(el).attr("href")!).get(),
    ...box.find("a.social-icon_item__3SLnb[href]").map((_, el) => $(el).attr("href")!).get(),
  ];
  const links = classifyLinks(hrefs, "gooyalisting.ca");

  const tagline = clean($(".listing-detail_tagline__3u_9y").first().text());
  const ogImage = $('meta[property="og:image"]').attr("content") ?? null;
  // Every page falls back to the directory's own banner; that is not a logo.
  const logo_url = ogImage && !/Gooya-listing-for-web/i.test(ogImage) ? ogImage : null;

  return { email, phones: [...new Set(phones)], ...links, tagline, logo_url, addressText };
}

/** One listing by slug, through the same REST collection used for enumeration. */
async function enumerateOne(slug: string): Promise<Enumerated | null> {
  const fields = "id,slug,link,title,excerpt,content,listing_cat,listing_location,listing_tag";
  const rows = await get(`${ORIGIN}/wp-json/wp/v2/listings?slug=${encodeURIComponent(slug)}&_fields=${fields}`, true);
  const r = Array.isArray(rows) ? rows[0] : null;
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    link: r.link,
    title: decodeEntities(r.title?.rendered ?? ""),
    excerpt: r.excerpt?.rendered ?? "",
    content: r.content?.rendered ?? "",
    cats: r.listing_cat ?? [],
    locs: r.listing_location ?? [],
    tags: r.listing_tag ?? [],
  };
}

async function main() {
  console.log("gooyalisting.ca → SourceListing");
  console.log("· loading taxonomies");
  const [cats, locs, tags] = await Promise.all([
    loadTerms("listing_cat"),
    loadTerms("listing_location"),
    loadTerms("listing_tag"),
  ]);
  console.log(`  ${cats.size} categories, ${locs.size} locations, ${tags.size} tags`);

  let rows: Enumerated[];
  if (REPAIR) {
    // The failed URLs are the only record of what a run dropped, so they are
    // read back out of its log rather than re-crawled blind.
    const log = fs.readFileSync(REPAIR, "utf8");
    const urls = [...new Set([...log.matchAll(/giving up on (https?:\/\/\S+?):\s/g)].map((m) => m[1]))];
    console.log(`· repair: ${urls.length} URLs the previous run gave up on`);
    const slugs = urls.map((u) => u.replace(/\/$/, "").split("/").pop()!).filter(Boolean);
    rows = (await mapLimit(slugs, 3, (sl) => enumerateOne(sl))).filter((r): r is Enumerated => Boolean(r));
    console.log(`  ${rows.length} of them still exist`);
  } else {
    console.log("· enumerating listings via REST (the sitemap is short by ~2,000)");
    rows = await enumerateListings(LIMIT);
    if (LIMIT) rows = rows.slice(0, LIMIT);
  }
  console.log(`  ${rows.length} listings to fetch`);

  let done = 0;
  let missed = 0;
  const collected: (SourceListing | null)[] = [];
  const buildOne = async (row: Enumerated): Promise<SourceListing | null> => {
    const html = (await get(row.link)) as string | null;
    if (!html) return null;
    const d = parseDetail(html);
    const category = row.cats.map((id) => cats.get(id)).filter(Boolean).join(" / ") || null;
    // `listing_location` is flat: a listing can carry both the province term
    // (انتاریو) and one or more city terms. Joining them with "/" would be
    // thrown away downstream — import-listings nulls any city hint containing
    // a slash — so the province is dropped here and the first real city wins.
    const locNames = row.locs.map((id) => locs.get(id)).filter(Boolean) as string[];
    const cityNames = locNames.filter((n) => !PROVINCE_TERMS.has(n));
    const cityHint = cityNames[0] ?? null;
    const tagNames = row.tags.map((id) => tags.get(id)).filter(Boolean);

    const description = bodyToText(row.content);
    const excerpt = clean(bodyToText(row.excerpt) ?? "");
    const listing: SourceListing = {
      source: "gooya",
      source_id: row.slug || String(row.id),
      source_url: row.link,
      category,
      name: clean(row.title) ?? row.slug,
      // The theme's tagline field is the one-liner; the WP excerpt is just the
      // body's first 55 words, so it is only a fallback.
      tagline: d.tagline ?? (excerpt ? excerpt.slice(0, 160) : null),
      description: tagNames.length
        ? [description, `برچسب‌ها: ${tagNames.join("، ")}`].filter(Boolean).join("\n\n")
        : description,
      phones: d.phones,
      email: d.email,
      street: splitStreet(d.addressText),
      // The `listing_location` term is the site's own curated city; the free
      // text address is only a fallback for the listings that carry no term.
      city_hint: cityHint ?? d.addressText,
      postal_code: postalOf(d.addressText),
      website: d.website,
      instagram: d.instagram,
      telegram: d.telegram,
      whatsapp: d.whatsapp,
      facebook: d.facebook,
      logo_url: d.logo_url,
      likes: null, // the site shows views, not likes
      scraped_at: NOW,
    };
    return listing;
  };

  const listings = await mapLimit(rows, 5, async (row) => {
    const listing = await buildOne(row);
    done += 1;
    if (!listing) missed += 1;
    else collected.push(listing);
    if (done % 25 === 0 || done === rows.length) {
      process.stdout.write(`\r  detail ${done}/${rows.length} (${missed} unreachable)`);
    }
    if (done % 250 === 0) {
      // A full run is ~7,500 fetches. Checkpoint so a mid-run failure costs
      // minutes, not the whole crawl.
      fs.writeFileSync(`${OUT}.partial`, JSON.stringify(collected, null, 2));
    }
    return listing;
  });

  let kept = listings.filter((l): l is SourceListing => Boolean(l));
  process.stdout.write("\n");
  if (REPAIR && fs.existsSync(OUT)) {
    // Merge, never replace: a repair run holds only the handful of records the
    // main run missed.
    const existing: SourceListing[] = JSON.parse(fs.readFileSync(OUT, "utf8"));
    const have = new Set(existing.map((l) => l.source_url));
    const added = kept.filter((l) => !have.has(l.source_url));
    kept = [...existing, ...added];
    console.log(`  merged ${added.length} recovered records into ${existing.length} existing`);
  }
  fs.writeFileSync(OUT, JSON.stringify(kept, null, 2));
  fs.rmSync(`${OUT}.partial`, { force: true });

  const withPhone = kept.filter((l) => l.phones.length).length;
  const withEmail = kept.filter((l) => l.email).length;
  const withSite = kept.filter((l) => l.website).length;
  const withInsta = kept.filter((l) => l.instagram).length;
  const withCity = kept.filter((l) => l.city_hint).length;
  const withLogo = kept.filter((l) => l.logo_url).length;
  console.log(`\nwrote ${kept.length} → ${OUT}`);
  console.log(`  phone ${withPhone} · email ${withEmail} · website ${withSite} · instagram ${withInsta}`);
  console.log(`  city ${withCity} · logo ${withLogo} · unreachable ${missed}`);
}

await main();
