// ============================================================================
// Source: scripts/scrape-hamvatan.mts
// Version: 1.0.0 — 2026-08-17
// Why: Pull every public listing from hamvatan.org/<city> into one clean JSON
//      file, so import-listings.mts can merge it into the directory without
//      duplicates. Read-only against the source; writes nothing to the DB.
// Env / Identity: No credentials. Plain HTTPS GETs, one request per page.
//
// Usage:
//   npx tsx scripts/scrape-hamvatan.mts [--city toronto] [--out <file.json>]
//
// What the source actually exposes (verified 17 Aug 2026 by reading the HTML,
// not assumed): each category page is server-rendered, 100 cards per page,
// paginated with ?page=N and a <link rel="next">. A card is an
// <article itemtype="http://schema.org/LocalBusiness" id="biz-item-<id>"> with
// name, a one-line tagline, a paragraph, one or more tel: links, street +
// postal code, a website, and facebook / instagram / telegram / whatsapp links.
// There are NO emails, NO logos, NO opening hours and NO per-business page —
// so this script does not invent any of those.
//
// The `?page=` parameter is silently ignored past the last page (it re-serves
// page 1), so pagination follows rel="next" and stops on a repeated card id
// rather than trusting a counter.
// ============================================================================
import fs from "node:fs";
import * as cheerio from "cheerio";
import { classifyLinks, clean, cleanPhone, toLatinDigits, type SourceListing } from "./lib/source-listing.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CITY = flag("city", "toronto");
const OUT = flag("out", `hamvatan-${CITY}.json`);
const BASE = "https://hamvatan.org";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type HamvatanListing = SourceListing;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "fa,en;q=0.8" },
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(1000 * attempt);
    }
  }
  return "";
}


/** Discover the category slugs the city page links to. */
async function discoverCategories(): Promise<{ slug: string; label: string }[]> {
  const $ = cheerio.load(await get(`${BASE}/${CITY}`));
  const seen = new Map<string, string>();
  $(`a[href^="/${CITY}/"]`).each((_, a) => {
    const href = $(a).attr("href")!;
    const slug = decodeURIComponent(href.split("?")[0].split("/")[2] ?? "");
    if (!slug || seen.has(slug)) return;
    seen.set(slug, clean($(a).text()) ?? slug.replace(/[-_]/g, " "));
  });
  return [...seen].map(([slug, label]) => ({ slug, label }));
}

function parseCards(html: string, cat: { slug: string; label: string }, pageUrl: string) {
  const $ = cheerio.load(html);
  const out: HamvatanListing[] = [];
  const now = new Date().toISOString();

  $('article[itemtype="http://schema.org/LocalBusiness"]').each((_, el) => {
    const a = $(el);
    const id = (a.attr("id") ?? "").replace(/^biz-item-/, "");
    if (!id) return;

    const name = clean(a.find('h2[itemprop="name"]').first().text());
    if (!name) return;

    const tagline = clean(a.find('h3[itemprop="description"]').first().text());
    const description = clean(a.find('p[itemprop="description"]').first().text());

    const phones = new Set<string>();
    a.find('a[href^="tel:"]').each((__, t) => {
      const p = cleanPhone($(t).attr("href")!);
      if (p) phones.add(p);
    });

    const street = clean(a.find('span[itemprop="streetAddress"]').first().text());
    const postal = clean(
      a.find('span[itemprop="postalCode"]').first().text()?.replace(/^[\s,]+/, "")
    );

    const hrefs: string[] = [];
    a.find("a[href]").each((__, l) => { hrefs.push($(l).attr("href") ?? ""); });
    const links = classifyLinks(hrefs, "hamvatan.org");

    // Likes: the last standalone number after the word لایک.
    const likesText = toLatinDigits(a.text());
    const m = likesText.match(/لایک\s*(\d+)/);
    const likes = m ? Number(m[1]) : 0;

    out.push({
      source: "hamvatan",
      source_id: id,
      source_url: `${pageUrl}#biz-item-${id}`,
      category: cat.label,
      name,
      tagline,
      description,
      phones: [...phones],
      email: null,
      street,
      city_hint: clean(a.find('meta[itemprop="addressLocality"]').attr("content")),
      postal_code: postal,
      ...links,
      logo_url: null,
      likes,
      scraped_at: now,
    });
  });

  const next = $('link[rel="next"]').attr("href") ?? null;
  const declared = Number($('meta[itemprop="numberOfItems"]').attr("content") ?? "0");
  return { cards: out, next, declared };
}

async function main() {
  const cats = await discoverCategories();
  console.log(`${CITY}: ${cats.length} categories`);

  const all = new Map<string, HamvatanListing>();
  const perCategory: Record<string, { declared: number; got: number; pages: number }> = {};

  for (const cat of cats) {
    let page = 1;
    let url: string | null = `${BASE}/${CITY}/${encodeURIComponent(cat.slug)}`;
    const seenHere = new Set<string>();
    let declared = 0;

    while (url) {
      const html = await get(url);
      const { cards, next, declared: d } = parseCards(html, cat, url.split("?")[0]);
      declared ||= d;

      // The site re-serves page 1 for out-of-range pages; a repeated id means stop.
      const fresh = cards.filter((c) => !seenHere.has(c.source_id));
      if (fresh.length === 0) break;
      for (const c of fresh) {
        seenHere.add(c.source_id);
        // A listing can sit in two categories; keep the first, remember the other.
        const prior = all.get(c.source_id);
        if (prior) {
          if (c.category && !(prior.category ?? "").includes(c.category)) prior.category = [prior.category, c.category].filter(Boolean).join(" / ");
        } else all.set(c.source_id, c);
      }

      process.stdout.write(`\r  ${cat.label.padEnd(24)} page ${page}: ${seenHere.size}/${declared}   `);
      url = next ? (next.startsWith("http") ? next : `${BASE}${next}`) : null;
      page += 1;
      await sleep(400);
    }
    perCategory[cat.label] = { declared, got: seenHere.size, pages: page - 1 };
    process.stdout.write("\n");
  }

  const rows = [...all.values()];
  // 27 cards on 17 Aug had a phone but no name; they are skipped, which is why
  // some categories come out "short" against the declared count.
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1), "utf8");

  console.log("\n--- summary ---");
  let declaredTotal = 0;
  for (const [label, s] of Object.entries(perCategory)) {
    declaredTotal += s.declared;
    const flag = s.got < s.declared ? "  <-- short" : "";
    console.log(`  ${label.padEnd(24)} ${String(s.got).padStart(4)} / ${String(s.declared).padStart(4)}  (${s.pages} pages)${flag}`);
  }
  console.log(`  declared across categories: ${declaredTotal}`);
  console.log(`  unique listings written   : ${rows.length}  -> ${OUT}`);
  console.log(`  with phone   : ${rows.filter((r) => r.phones.length).length}`);
  console.log(`  with website : ${rows.filter((r) => r.website).length}`);
  console.log(`  with street  : ${rows.filter((r) => r.street).length}`);
  console.log(`  with postal  : ${rows.filter((r) => r.postal_code).length}`);
  console.log(`  instagram    : ${rows.filter((r) => r.instagram).length}`);
  console.log(`  telegram     : ${rows.filter((r) => r.telegram).length}`);
  console.log(`  whatsapp     : ${rows.filter((r) => r.whatsapp).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
