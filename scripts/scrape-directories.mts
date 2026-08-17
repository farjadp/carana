// ============================================================================
// Source: scripts/scrape-directories.mts
// Version: 1.0.0 — 2026-08-17
// Why: Pull every public listing from the other Iranian-Canadian directories
//      (jabeh.ca, taablo.com, bazaarche.ca, farsilink.com, iranbusiness.ca)
//      into SourceListing JSON, one file per source, for import-listings.mts.
//      Read-only against the sources; writes nothing to the DB.
// Env / Identity: No credentials. Polite HTTPS GETs (4 in flight, ~300ms gap).
//
// Usage:
//   npx tsx scripts/scrape-directories.mts --source jabeh|taablo|bazaarche|farsilink|iranbusiness|all [--out-dir .]
//
// Each parser was written after reading that site's real HTML on 17 Aug 2026;
// what a site does not expose is left null, never inferred:
//   jabeh        Laravel app. Discovery: /category/<slug>?page=N (30/page,
//                32 categories from the home menu). Detail: h1, category +
//                city chips, «توضیحات» paragraph, contact card (email:, tel:,
//                website, instagram), one image.
//   taablo       WordPress + HivePress. Discovery: hp_listing sitemaps (also
//                lists Iran-based ads — kept only when the location says
//                Canada). Detail scoped to .hp-listing--view-page: title,
//                category, location, description, tel/mailto/links, image
//                (their default-*.jpg placeholders dropped).
//   bazaarche    WordPress, Google-Places-derived. Discovery: listing-sitemap.
//                Detail: hero (name, category, location, logo) + «Business
//                Information» list (address, phone, website). Their prose is
//                boilerplate («X is a Persian/Iranian Gym serving…»), so it is
//                NOT taken as a description.
//   farsilink    WordPress + ListingPro. Detail pages carry no address or
//                category, so discovery walks /listing-category/<slug>/page/N
//                cards (title, url, address, city, logo, phone) and the detail
//                adds description, website, socials.
//   iranbusiness WordPress + GeoDirectory. Discovery: gd_place-sitemap (72).
//                Detail: a LocalBusiness JSON-LD block with address/phone/
//                image, plus mailto/website links.
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { classifyLinks, clean, cleanPhone, type SourceListing, type SourceName } from "./lib/source-listing.ts";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SOURCE = flag("source", "all");
const OUT_DIR = flag("out-dir", ".");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const NOW = new Date().toISOString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fa,en;q=0.8" }, redirect: "follow" });
      if (res.status === 404 || res.status === 410) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 4) { console.error(`\n  giving up on ${url}: ${(e as Error).message}`); return null; }
      await sleep(1200 * attempt);
    }
  }
  return null;
}
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); await sleep(300); }
  }));
  return out;
}
const sitemapLocs = async (url: string) => ((await get(url)) ?? "").match(/<loc>([^<]+)<\/loc>/g)?.map((m) => m.slice(5, -6).trim()) ?? [];
const base = (l: Partial<SourceListing>): SourceListing => ({
  source: l.source!, source_id: l.source_id!, source_url: l.source_url!, category: l.category ?? null, name: l.name!,
  tagline: l.tagline ?? null, description: l.description ?? null, phones: l.phones ?? [], email: l.email ?? null,
  street: l.street ?? null, city_hint: l.city_hint ?? null, postal_code: l.postal_code ?? null,
  website: l.website ?? null, instagram: l.instagram ?? null, telegram: l.telegram ?? null, whatsapp: l.whatsapp ?? null,
  facebook: l.facebook ?? null, logo_url: l.logo_url ?? null, likes: l.likes ?? null, scraped_at: NOW,
});
const phonesFrom = ($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>) => {
  const s = new Set<string>();
  scope.find('a[href^="tel:"]').each((_, a) => { const p = cleanPhone($(a).attr("href") ?? ""); if (p) s.add(p); });
  return [...s];
};
const emailFrom = ($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>) => {
  let e: string | null = null;
  scope.find('a[href^="mailto:"], a[href^="email:"]').each((_, a) => { const v = ($(a).attr("href") ?? "").replace(/^(mailto|email):/, "").split("?")[0].trim(); if (!e && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) e = v; });
  return e;
};
const hrefsFrom = ($: cheerio.CheerioAPI, scope: cheerio.Cheerio<any>) => { const h: string[] = []; scope.find("a[href]").each((_, a) => { h.push($(a).attr("href") ?? ""); }); return h; };
const postalIn = (s: string | null | undefined) => (s ?? "").match(/\b([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)\b/)?.slice(1, 3).join(" ").toUpperCase() ?? null;

// ---------------------------------------------------------------- jabeh.ca
async function jabeh(): Promise<SourceListing[]> {
  const home = cheerio.load((await get("https://jabeh.ca/")) ?? "");
  const cats = new Map<string, string>();
  home('a[href^="https://jabeh.ca/category/"]').each((_, a) => { const href = home(a).attr("href")!.split("?")[0]; if (!cats.has(href)) cats.set(href, clean(home(a).text()) ?? ""); });
  console.log(`jabeh: ${cats.size} categories`);
  const urls = new Map<string, string>(); // listing url -> category label
  for (const [cat, label] of cats) {
    for (let page = 1; page < 200; page += 1) {
      const html = await get(page === 1 ? cat : `${cat}?page=${page}`);
      if (!html) break;
      const $ = cheerio.load(html);
      let fresh = 0;
      $('a[href^="https://jabeh.ca/listing/"]').each((_, a) => { const u = $(a).attr("href")!.split("?")[0]; if (!urls.has(u)) { urls.set(u, label); fresh += 1; } return undefined; });
      if (fresh === 0) break;
      await sleep(300);
    }
    process.stdout.write(`\r  discovered ${urls.size} listings…   `);
  }
  console.log(`\njabeh: ${urls.size} listing pages to read`);
  let done = 0;
  const rows = await mapLimit([...urls], 4, async ([url, label]) => {
    const html = await get(url); done += 1; process.stdout.write(`\r  read ${done}/${urls.size}`);
    if (!html) return null;
    const $ = cheerio.load(html);
    const name = clean($("h1").first().text());
    if (!name) return null;
    const header = $("h1").first().closest(".card-header");
    const category = clean(header.find(".bi-briefcase").parent().text()) ?? label;
    const city = clean(header.find(".bi-geo-alt").parent().text());
    const descHead = $("h5").filter((_, e) => $(e).text().trim() === "توضیحات").first();
    const description = clean(descHead.closest(".card").find(".card-body").text());
    const contact = $("h3.card-title").filter((_, e) => $(e).text().includes("اطلاعات تماس")).first().closest(".card");
    const links = classifyLinks(hrefsFrom($, contact), "jabeh.ca");
    const img = $("img.visit-card-image").first().attr("src") ?? null;
    return base({ source: "jabeh", source_id: url.split("/listing/")[1], source_url: url, category, name, description, phones: phonesFrom($, contact), email: emailFrom($, contact), city_hint: city, ...links, logo_url: img });
  });
  console.log();
  return rows.filter((r): r is SourceListing => !!r);
}

// ---------------------------------------------------------------- taablo.com
async function taablo(): Promise<SourceListing[]> {
  const urls = [...new Set([...(await sitemapLocs("https://taablo.com/hp_listing-sitemap.xml")), ...(await sitemapLocs("https://taablo.com/hp_listing-sitemap2.xml"))])].filter((u) => u.includes("/listing/"));
  console.log(`taablo: ${urls.length} listing pages (Iran-based ones will be dropped)`);
  let done = 0, dropped = 0;
  const rows = await mapLimit(urls, 4, async (url) => {
    const html = await get(url); done += 1; process.stdout.write(`\r  read ${done}/${urls.length}`);
    if (!html) return null;
    const $ = cheerio.load(html);
    const main = $(".hp-listing--view-page").first();
    const name = clean(main.find("h1.hp-listing__title").first().text());
    if (!name) return null;
    const location = clean(main.find(".hp-listing__location").first().text());
    if (!location || !/canada/i.test(location)) { dropped += 1; return null; }
    const category = clean(main.find(".hp-listing__category a").first().text());
    const description = clean(main.find(".hp-listing__description").first().text());
    // Attributes (phone, email, website…) render in the page's sidebar too, so read them page-wide but exclude other listings' cards.
    const scope = $("body").clone(); scope.find(".hp-listing--view-block, header, footer, nav, .hp-listings").remove();
    const links = classifyLinks(hrefsFrom($, scope), "taablo.com");
    let img = main.find(".hp-listing__image img").first().attr("src") ?? null;
    if (img && /\/default-[a-z-]+\.(jpg|png)/i.test(img)) img = null;
    const cityHint = location.replace(/,\s*canada$/i, "").split(",")[0].trim();
    return base({ source: "taablo", source_id: decodeURIComponent(url.replace(/\/$/, "").split("/listing/")[1]), source_url: url, category, name, description, phones: phonesFrom($, scope), email: emailFrom($, scope), city_hint: cityHint, street: location, ...links, logo_url: img });
  });
  console.log(`\n  dropped ${dropped} outside Canada`);
  return rows.filter((r): r is SourceListing => !!r);
}

// ---------------------------------------------------------------- bazaarche.ca
async function bazaarche(): Promise<SourceListing[]> {
  const urls = (await sitemapLocs("https://bazaarche.ca/listing-sitemap.xml")).filter((u) => u.includes("/listing/"));
  console.log(`bazaarche: ${urls.length} listing pages`);
  let done = 0;
  const rows = await mapLimit(urls, 4, async (url) => {
    const html = await get(url); done += 1; process.stdout.write(`\r  read ${done}/${urls.length}`);
    if (!html) return null;
    const $ = cheerio.load(html);
    const hero = $(".listing-hero").first();
    const name = clean(hero.find("h1").first().text()) ?? clean($("h1").first().text());
    if (!name) return null;
    const category = clean(hero.find(".listing-hero__category").first().text());
    const location = clean(hero.find(".listing-hero__location").first().text());
    const info = $("h2").filter((_, e) => /business information/i.test($(e).text())).first().next("ul");
    const field = (label: RegExp) => { let v: string | null = null; info.find("li").each((_, li) => { if (v) return; const t = $(li).text(); if (label.test(t)) v = clean(t.replace(label, "")); }); return v; };
    const address = clean(info.find("address").first().text()) ?? field(/^\s*Address:/i);
    const businessType = field(/^\s*Business Type:/i);
    const links = classifyLinks(hrefsFrom($, info), "bazaarche.ca");
    const logo = hero.find(".listing-hero__logo img").attr("src") ?? hero.find(".listing-hero__cover img").attr("src") ?? null;
    return base({ source: "bazaarche", source_id: url.replace(/\/$/, "").split("/listing/")[1], source_url: url, category: [category, businessType].filter(Boolean).join(" / ") || null, name, phones: phonesFrom($, info.length ? info : hero), street: address, city_hint: location?.replace(/,\s*canada$/i, "") ?? null, postal_code: postalIn(address), ...links, logo_url: logo });
  });
  console.log();
  return rows.filter((r): r is SourceListing => !!r);
}

// ---------------------------------------------------------------- farsilink.com
async function farsilink(): Promise<SourceListing[]> {
  const home = cheerio.load((await get("https://farsilink.com/")) ?? "");
  const cats = new Map<string, string>();
  home('a[href*="farsilink.com/listing-category/"]').each((_, a) => { const href = home(a).attr("href")!.split("?")[0]; if (!cats.has(href)) cats.set(href, clean(home(a).text()) ?? ""); });
  // The menu shows only some categories; the REST taxonomy lists them all.
  try {
    const rest = JSON.parse((await get("https://farsilink.com/wp-json/wp/v2/listing-category?per_page=100")) ?? "[]") as { slug: string; name: string }[];
    for (const c of rest) { const href = `https://farsilink.com/listing-category/${c.slug}/`; if (!cats.has(href)) cats.set(href, clean(cheerio.load(`<p>${c.name}</p>`)("p").text()) ?? c.slug); }
  } catch { /* menu only */ }
  console.log(`farsilink: ${cats.size} categories`);
  type Card = { url: string; category: string; address: string | null; city: string | null; logo: string | null; name: string | null };
  const cards = new Map<string, Card>();
  for (const [cat, label] of cats) {
    let empty = 0;
    for (let page = 1; page < 100 && empty < 2; page += 1) {
      const html = await get(page === 1 ? cat : `${cat.replace(/\/$/, "")}/page/${page}/`);
      const $ = cheerio.load(html ?? "");
      let onPage = 0;
      $("[data-posturl]").each((_, e) => {
        onPage += 1;
        const url = $(e).attr("data-posturl")!;
        if (cards.has(url)) return;
        cards.set(url, { url, category: label, address: clean($(e).attr("data-postaddress")), city: clean($(e).find(".gaddress").first().text()), logo: $(e).find("img").first().attr("src") ?? null, name: clean($(e).attr("data-title")) });
      });
      // 15 cards a page; a page with none is the end (allow one hiccup).
      empty = onPage === 0 ? empty + 1 : 0;
      await sleep(400);
    }
    process.stdout.write(`\r  discovered ${cards.size} listings…   `);
  }
  // Anything in the sitemap but not on a category page still gets read (category unknown).
  for (const u of await Promise.all([1, 2, 3, 4].map((i) => sitemapLocs(`https://farsilink.com/listing-sitemap${i}.xml`))).then((a) => a.flat()))
    if (u.includes("/listing/") && !cards.has(u)) cards.set(u, { url: u, category: "", address: null, city: null, logo: null, name: null });
  console.log(`\nfarsilink: ${cards.size} listing pages to read`);
  let done = 0;
  const rows = await mapLimit([...cards.values()], 4, async (c) => {
    const html = await get(c.url); done += 1; process.stdout.write(`\r  read ${done}/${cards.size}`);
    if (!html) return null;
    const $ = cheerio.load(html);
    const name = clean($(".lp-listing-name h1").first().text()) ?? c.name;
    if (!name) return null;
    const tagline = clean($(".lp-listing-name-tagline").first().text());
    const desc = $(".lp-listing-desription").first();
    const description = clean(desc.text());
    const side = $(".listing-page-sidebar").first();
    const links = classifyLinks(hrefsFrom($, side.length ? side : $("body")), "farsilink.com");
    let logo = $(".lp-listing-logo img").first().attr("src") ?? c.logo ?? null;
    if (logo && /En_Logo_10_red|website-banner|lp-logo\.png/.test(logo)) logo = c.logo && !/lp-logo\.png/.test(c.logo) ? c.logo.replace(/-\d+x\d+(\.\w+)$/, "$1") : null; // site's own logo, not the business's
    return base({ source: "farsilink", source_id: c.url.replace(/\/$/, "").split("/listing/")[1], source_url: c.url, category: c.category || null, name, tagline, description, phones: phonesFrom($, side.length ? side : $("body")), email: emailFrom($, $("body")), street: c.address, city_hint: c.city, postal_code: postalIn(c.address), ...links, logo_url: logo });
  });
  console.log();
  return rows.filter((r): r is SourceListing => !!r);
}

// ---------------------------------------------------------------- iranbusiness.ca
async function iranbusiness(): Promise<SourceListing[]> {
  const urls = (await sitemapLocs("https://iranbusiness.ca/gd_place-sitemap.xml")).filter((u) => /\/places\/.+\/.+\//.test(u) && !u.endsWith("/places/"));
  console.log(`iranbusiness: ${urls.length} place pages`);
  let done = 0;
  const rows = await mapLimit(urls, 4, async (url) => {
    const html = await get(url); done += 1; process.stdout.write(`\r  read ${done}/${urls.length}`);
    if (!html) return null;
    const $ = cheerio.load(html);
    const decode = (v: unknown) => clean(typeof v === "string" ? cheerio.load(`<p>${v}</p>`)("p").text() : null);
    let ld: any = null;
    $('script[type="application/ld+json"]').each((_, s) => { try { const d = JSON.parse($(s).text()); if (d["@type"] === "LocalBusiness") ld = d; } catch { /* ignore */ } });
    const name = decode(ld?.name) ?? clean($("h1").first().text());
    if (!name) return null;
    const addr = ld?.address ?? {};
    // Contact rows live in Elementor icon lists; the page's other links are the site's own socials and footer.
    const contact = $(".elementor-icon-list-items");
    const links = classifyLinks(hrefsFrom($, contact), "iranbusiness.ca");
    const catFromUrl = url.split("/places/")[1]?.split("/")[3]?.replace(/-\d+$/, "").replace(/-/g, " ") ?? null;
    let img = clean(ld?.image?.url) ?? null; if (img && /irbs_default/.test(img)) img = null;
    return base({ source: "iranbusiness", source_id: url.replace(/\/$/, "").split("/").pop()!, source_url: url, category: catFromUrl, name, ...(((decode(ld?.description) ?? "").length > 160) ? { description: decode(ld?.description) } : { tagline: decode(ld?.description) }), phones: [cleanPhone(ld?.telephone ?? ""), ...phonesFrom($, contact)].filter((p): p is string => !!p), email: emailFrom($, contact), street: clean(addr.streetAddress), city_hint: clean(addr.addressLocality), postal_code: clean(addr.postalCode), ...links, logo_url: img });
  });
  console.log();
  return rows.filter((r): r is SourceListing => !!r);
}

// ----------------------------------------------------------------
const SCRAPERS: Record<Exclude<SourceName, "hamvatan">, () => Promise<SourceListing[]>> = { jabeh, taablo, bazaarche, farsilink, iranbusiness };
async function main() {
  const names = SOURCE === "all" ? (Object.keys(SCRAPERS) as (keyof typeof SCRAPERS)[]) : [SOURCE as keyof typeof SCRAPERS];
  for (const n of names) {
    if (!SCRAPERS[n]) { console.error(`unknown source ${n}`); process.exit(1); }
    const rows = await SCRAPERS[n]();
    // Dedupe by source id inside one export (a listing seen from two categories).
    const uniq = [...new Map(rows.map((r) => [r.source_id, r])).values()];
    const out = path.join(OUT_DIR, `${n}.json`);
    fs.writeFileSync(out, JSON.stringify(uniq, null, 1), "utf8");
    const c = (k: keyof SourceListing) => uniq.filter((r) => { const v = r[k]; return Array.isArray(v) ? v.length : !!v; }).length;
    console.log(`${n}: ${uniq.length} listings -> ${out}   phone ${c("phones")} · email ${c("email")} · website ${c("website")} · street ${c("street")} · city ${c("city_hint")} · postal ${c("postal_code")} · logo ${c("logo_url")} · instagram ${c("instagram")} · description ${c("description")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
