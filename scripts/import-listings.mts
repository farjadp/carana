// ============================================================================
// Source: scripts/import-listings.mts
// Version: 1.1.0 — 2026-08-17 (1.0.0 was import-hamvatan.mts, hamvatan-only)
// Why: Merge a scraped directory export (SourceListing[] from
//      scrape-hamvatan.mts or scrape-directories.mts) into the directory:
//      enrich listings we already have, insert the ones we don't, and never
//      create a duplicate.
// Env / Identity: Service role (reads apps/web/.env.local). Never a route.
//
// Usage:
//   npx tsx scripts/import-listings.mts <listings.json> [--commit] [--report out.json]
//
// Without --commit it is a dry run: matches, categorises, prints the plan and
// writes the report, but changes nothing in the database.
//
// Matching rules, strongest first — each one was chosen after looking at the
// real data, where the same phone number is shared by genuinely different
// listings (a realtor who also runs a construction company):
//   1. same website host, or same instagram handle          -> same business
//   2. same phone AND names share a meaningful token          -> same business
//   3. same phone, names share nothing                        -> ask the model
//        ("same business?" with both records); only a confident yes merges,
//        anything else goes to the review list and is NOT inserted, so a
//        wrong guess can produce neither a duplicate nor a bad merge.
//   4. otherwise                                              -> new listing
//
// Enrichment fills only empty columns on an existing row (phone stays as the
// owner or the earlier import wrote it); it never overwrites.
// ============================================================================
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

import {
  cityFromAddress,
  cityFromPostalCode,
  normalizeCity,
  normalizeImageUrl,
  normalizeText,
  normalizeWebsite,
  provinceForCity,
} from "../packages/core/src/import-normalize.ts";
// latinSlug and foldPersian moved into core on 18 Aug so the jobs board builds
// its English slugs with exactly this transliteration and not a second copy.
import { foldPersian, latinSlug } from "../packages/core/src/slug.ts";
import type { SourceListing } from "./lib/source-listing.ts";
type HamvatanListing = SourceListing; // historical name inside this file

// ---------------------------------------------------------------------------
const [, , inputPath, ...flags] = process.argv;
const COMMIT = flags.includes("--commit");
const reportIdx = flags.indexOf("--report");
const REPORT = reportIdx >= 0 ? flags[reportIdx + 1] : "hamvatan-import-report.json";

if (!inputPath) {
  console.error("usage: tsx scripts/import-listings.mts <listings.json> [--commit] [--report out.json]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync("apps/web/.env.local", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  })
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
const PLACEHOLDER_LOGO = "/images/categories/business-placeholder.svg";

// ---------------------------------------------------------------------------
// Normalisers used only for matching (never written to the DB).

const STOP = new Set([
  "the","and","of","inc","ltd","llc","co","corp","company","group","services","service","canada",
  "toronto","studio","centre","center","clinic","shop","store","home","homes",
  "شرکت","خدمات","گروه","مرکز","کلینیک","فروشگاه","دفتر","مشاور","مشاوره","و","در","با","برای","کانادا","تورنتو",
  "دکتر","دکترای","مهندس","خانم","آقای","دندانپزشک","دندانپزشکی","پزشک",
  // Category words: two realtors both called «مشاور املاک …» are not the same person.
  "املاک","مسکن","وام","کارگزار","کارشناس","نماینده","بیمه","رستوران","کیترینگ","حسابداری","حسابدار","مالیاتی","مهاجرت","مهاجرتی","وکیل","حقوقی",
  "آموزشگاه","موسیقی","مدرسه","زیبایی","سالن","آرایشگاه","آرایشگر","لیزر","دندان","صرافی","سوپرمارکت","سوپر","مارکت","کافه","شیرینی","نانوایی","نان",
  "ساختمانی","نقاشی","برق","لوله","کشی","تعمیرات","تعمیر","اتومبیل","خودرو","فروش","عکاسی","عکاس","استودیو","فیزیوتراپی","تغذیه","روانشناس","داروخانه",
  "real","estate","realty","realtor","mortgage","broker","agent","insurance","restaurant","catering","accounting","accountant","tax","dental","dentistry","dentist",
  "law","lawyer","legal","immigration","consultant","consulting","beauty","salon","spa","medical","academy","school","music","driving","exchange","currency",
  "supermarket","market","bakery","cafe","pizza","grill","kabob","kebab","construction","renovation","plumbing","electric","auto","repair","photography","photo",
  "design","travel","agency","pharmacy","physio","therapy","clinic","office","specialist","team","professional","corporation","persian","iranian","canadian",
]);

function nameTokens(name: string): Set<string> {
  return new Set(
    foldPersian(name.toLowerCase())
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(" ")
      .filter((t) => t.length >= 3 && !STOP.has(t))
  );
}
const namesOverlap = (a: string, b: string) => {
  const ta = nameTokens(a), tb = nameTokens(b);
  for (const t of ta) if (tb.has(t)) return true;
  return false;
};

const phoneKey = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/[۰-۹]/g, (x) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x))).replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
};
// Hosts where many independent agents share one domain and only the path tells them apart. A host match
// on these is not identity — the first import merged five RBC mortgage agents into one listing this way.
const PLATFORM_HOSTS = ["mortgage.rbc.com","century21.ca","mortgagealliance.com","rightathomerealty.com","royallepage.ca","remax.ca","homelife.ca","kw.com","exprealty.com","exprealty.ca","dominionlending.ca","mortgagecentre.com","centum.ca","mortgagespecialist.bmo.com","mms.tdcanadatrust.com","scotiabank.com","cibc.com","td.com","zil.ink","linktr.ee","iranstar.com","facebook.com","instagram.com","t.me","wa.me","google.com","goo.gl","yelp.ca","yelp.com","sites.google.com","wixsite.com","business.site"];
const hostKey = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    const h = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, "");
    if (PLATFORM_HOSTS.some((x) => h === x || h.endsWith(`.${x}`))) return null;
    return h;
  } catch { return null; }
};
/** host + path, for the case where a host is shared by several listings on either side. */
const urlKey = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    const x = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const path = x.pathname.replace(/\/+$/, "").toLowerCase();
    return `${x.hostname.toLowerCase().replace(/^www\./, "")}${path && path !== "/" ? path : ""}`;
  } catch { return null; }
};
const instaKey = (u: string | null | undefined) => {
  if (!u) return null;
  const m = u.toLowerCase().match(/instagram\.com\/([a-z0-9._]+)/);
  if (m && m[1] && !["p","reel","explore"].includes(m[1])) return m[1].replace(/\/$/, "");
  const bare = u.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{2,30}$/.test(bare) ? bare : null;
};

const PROVINCE_CODES: Record<string, string> = { ON: "Ontario", BC: "British Columbia", AB: "Alberta", QC: "Quebec", MB: "Manitoba", SK: "Saskatchewan", NS: "Nova Scotia", NB: "New Brunswick", NL: "Newfoundland and Labrador", PE: "Prince Edward Island" };
function provinceFromAddress(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/\b(ON|BC|AB|QC|MB|SK|NS|NB|NL|PE)\b(?=[\s,]|$)/) ?? s.match(/\b(Ontario|British Columbia|Alberta|Quebec|Qu\u00e9bec|Manitoba|Saskatchewan|Nova Scotia|New Brunswick)\b/i);
  if (!m) return null;
  return PROVINCE_CODES[m[1].toUpperCase()] ?? Object.values(PROVINCE_CODES).find((v) => v.toLowerCase() === m[1].toLowerCase().replace("é", "e")) ?? null;
}

const CITY_PROVINCE: Record<string, string> = {
  montreal: "Quebec", "montréal": "Quebec", laval: "Quebec", westmount: "Quebec", candiac: "Quebec", brossard: "Quebec", longueuil: "Quebec", "quebec city": "Quebec", gatineau: "Quebec",
  vancouver: "British Columbia", "north vancouver": "British Columbia", "west vancouver": "British Columbia", burnaby: "British Columbia", coquitlam: "British Columbia", "port coquitlam": "British Columbia", "port moody": "British Columbia", surrey: "British Columbia", richmond: "British Columbia", "new westminster": "British Columbia", victoria: "British Columbia", kelowna: "British Columbia", langley: "British Columbia", "maple ridge": "British Columbia", abbotsford: "British Columbia",
  calgary: "Alberta", edmonton: "Alberta", winnipeg: "Manitoba", halifax: "Nova Scotia", saskatoon: "Saskatchewan", regina: "Saskatchewan",
  ottawa: "Ontario", mississauga: "Ontario", brampton: "Ontario", hamilton: "Ontario", london: "Ontario", kitchener: "Ontario", waterloo: "Ontario", whitby: "Ontario", oshawa: "Ontario", ajax: "Ontario", pickering: "Ontario", burlington: "Ontario", milton: "Ontario", "king city": "Ontario", stouffville: "Ontario", "bradford west gwillimbury": "Ontario", bradford: "Ontario", innisfil: "Ontario", york: "Ontario", windsor: "Ontario", kingston: "Ontario",
};
const provinceForKnownCity = (city: string | null) => (city ? CITY_PROVINCE[city.toLowerCase()] ?? null : null);

const postalIn = (a: string | null | undefined) => (a ?? "").match(/\b([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)\b/)?.slice(1, 3).join(" ").toUpperCase() ?? null;

/** "7330 Yonge St, Thornhill, ON L4J 7Y6, Canada" → "Thornhill" (the token before the province code). */
function cityFromCanadianAddress(a: string | null | undefined): string | null {
  const m = (a ?? "").match(/,\s*([A-Za-z][A-Za-z .'-]{2,40}?)\s*,\s*(?:ON|BC|AB|QC|MB|SK|NS|NB|NL|PE|Ontario|British Columbia|Alberta|Quebec|Qu\u00e9bec)\b/);
  return m ? normalizeCity(m[1]) : null;
}

// ---------------------------------------------------------------------------
type DbRow = {
  id: string; slug: string; name: string; name_en: string | null; category: string; sub_category: string | null;
  city: string; phone: string | null; website: string | null; instagram: string | null; telegram: string | null;
  whatsapp: string | null; postal_code: string | null; address: string | null; tagline: string | null;
  description: string | null; short_description: string | null; social_media: Record<string, unknown> | null;
  verification_notes: string | null; contact_email: string | null; logo_url: string | null;
};

type Decision =
  | { kind: "enrich"; row: DbRow; via: string; patch: Record<string, unknown> }
  | { kind: "insert"; payload: Record<string, unknown> }
  | { kind: "review"; reason: string; listing?: HamvatanListing; db?: Pick<DbRow, "id" | "slug" | "name" | "phone" | "category"> };

async function main() {
  const loaded: HamvatanListing[] = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  // This is a directory of businesses in Canada; some sources also carry Iran-based ads.
  const OUTSIDE = /\b(iran|tehran|esfahan|isfahan|shiraz|mashhad|tabriz|karaj|dubai|istanbul|turkey|germany|usa|united states)\b/i;
  const outside = loaded.filter((l) => OUTSIDE.test(`${l.city_hint ?? ""} ${l.street ?? ""}`) || (l.phones.length > 0 && l.phones.every((p) => /^\+?98/.test(p) && !/^\+?1/.test(p))));
  const listings = loaded.filter((l) => !outside.includes(l));
  console.log(`loaded ${loaded.length} listings from ${inputPath}; ${outside.length} outside Canada skipped`);

  // ---- 1. collapse duplicates inside the export (same phone + overlapping name)
  //
  // NAMES MUST OVERLAP. Until 23 Aug 2026 a shared website host counted as
  // identity on its own, and that silently deleted people: iranianlawyer.org
  // lists each lawyer separately, so three pairs of genuinely different
  // lawyers who share a firm's reception number and firm website (Beygi /
  // Yeganeh at englobelaw.com, Baghshahi / Naseri at mohajerbal.com,
  // Haghighi / Samiei at sc-law.ca) collapsed into one record each and three
  // real lawyers vanished with no entry in the report. A firm's switchboard
  // and homepage are not an identity — the same lesson the phone rule already
  // learned. Dropping the host clause is the safe direction: a listing that
  // really is a duplicate still meets the DB-matching stage below, which
  // adjudicates shared-phone cases with the model and can route to `review`
  // instead of deleting anything.
  const collapsed: HamvatanListing[] = [];
  const droppedInFile: { kept: string; dropped: string; why: string }[] = [];
  const byPhone = new Map<string, HamvatanListing[]>();
  const richness = (l: HamvatanListing) =>
    [l.description, l.tagline, l.street, l.postal_code, l.website, l.instagram, l.telegram].filter(Boolean).length + l.phones.length;
  outer: for (const l of listings) {
    for (const p of l.phones.map(phoneKey).filter(Boolean) as string[]) {
      for (const prior of byPhone.get(p) ?? []) {
        if (namesOverlap(prior.name, l.name)) {
          // Same business listed twice; keep the richer record, union the categories.
          const keep = richness(l) > richness(prior) ? l : prior;
          const drop = keep === l ? prior : l;
          if (drop.category && !(keep.category ?? "").includes(drop.category)) keep.category = [keep.category, drop.category].filter(Boolean).join(" / ");
          // A collapse removes a record from the run; say so in the report, so
          // "189 in, 186 planned" is never an unexplained three.
          droppedInFile.push({ kept: keep.source_url, dropped: drop.source_url, why: `shared phone ${p} and overlapping names` });
          if (keep !== prior) {
            collapsed[collapsed.indexOf(prior)] = keep;
            for (const pp of prior.phones.map(phoneKey).filter(Boolean) as string[]) {
              const arr = byPhone.get(pp)!; arr[arr.indexOf(prior)] = keep;
            }
          }
          continue outer;
        }
      }
    }
    collapsed.push(l);
    for (const p of l.phones.map(phoneKey).filter(Boolean) as string[]) byPhone.set(p, [...(byPhone.get(p) ?? []), l]);
  }
  console.log(`after in-file de-duplication: ${collapsed.length} (dropped ${listings.length - collapsed.length})`);

  // ---- 2. load what we already have
  // PostgREST caps a response at 1000 rows, so page through explicitly.
  const db: DbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("businesses")
      .select("id,slug,name,name_en,category,sub_category,city,phone,website,instagram,telegram,whatsapp,postal_code,address,tagline,description,short_description,social_media,verification_notes,contact_email,logo_url")
      .order("id", { ascending: true }) // a unique key: ordering by created_at ties across pages and drops or repeats rows
      .range(from, from + 999);
    if (error) throw error;
    db.push(...(page as DbRow[]));
    if (!page || page.length < 1000) break;
  }
  console.log(`existing listings: ${db.length}`);

  const dbByPhone = new Map<string, DbRow[]>();
  const dbByHost = new Map<string, DbRow>();
  const dbByInsta = new Map<string, DbRow>();
  const dbBySourceUrl = new Map<string, DbRow>();
  // A host used by more than one listing (on either side) identifies a platform, not a business.
  const hostCount = new Map<string, number>();
  for (const r of db) { const hk = hostKey(r.website); if (hk) hostCount.set(hk, (hostCount.get(hk) ?? 0) + 1); }
  for (const l of collapsed) { const hk = hostKey(l.website); if (hk) hostCount.set(hk, (hostCount.get(hk) ?? 0) + 1); }
  const dbByUrl = new Map<string, DbRow>();
  for (const r of db) {
    const pk = phoneKey(r.phone); if (pk) dbByPhone.set(pk, [...(dbByPhone.get(pk) ?? []), r]);
    const hk = hostKey(r.website); if (hk && (hostCount.get(hk) ?? 0) <= 2 && !dbByHost.has(hk)) dbByHost.set(hk, r);
    const uk = urlKey(r.website); if (uk && !dbByUrl.has(uk)) dbByUrl.set(uk, r);
    const ik = instaKey(r.instagram); if (ik && !dbByInsta.has(ik)) dbByInsta.set(ik, r);
    for (const m of (r.verification_notes ?? "").matchAll(/(?:imported from|also listed at) (\S+)/g)) dbBySourceUrl.set(m[1], r);
  }

  const { data: cats } = await supabase.from("categories").select("slug,name").eq("is_active", true);
  const slugs = (cats ?? []).map((c) => c.slug as string);
  // Imports are owned by the system account, never by a person's profile — otherwise that person's
  // dashboard lists thousands of "my businesses". Create it once with scripts/reassign-imports.mts.
  const { data: adminProfile } = await supabase.from("profiles").select("id").eq("email", "imports@charana.ca").maybeSingle();
  if (!adminProfile) { console.error("No imports@charana.ca profile — run scripts/reassign-imports.mts --commit first."); process.exit(1); }

  // ---- 3. decide per listing
  const decisions: Decision[] = [];
  const toInsert: HamvatanListing[] = [];
  const undecided: { l: HamvatanListing; row: DbRow }[] = [];
  const phoneShared: { new: string; existing: string; why: string }[] = [];

  const enrichPatch = (row: DbRow, l: HamvatanListing) => {
    const patch: Record<string, unknown> = {};
    const set = (col: keyof DbRow, v: unknown) => { if (v && !row[col]) patch[col] = v; };
    set("website", normalizeWebsite(l.website));
    set("contact_email", normalizeText(l.email, 120));
    if (l.logo_url && (!row.logo_url || row.logo_url === PLACEHOLDER_LOGO)) patch.logo_url = normalizeImageUrl(l.logo_url);
    set("instagram", l.instagram);
    set("telegram", l.telegram);
    set("whatsapp", l.whatsapp);
    set("postal_code", l.postal_code ?? postalIn(l.street));
    set("address", l.street && /\d/.test(l.street) ? normalizeText(l.street, 250) : null);
    set("tagline", normalizeText(l.tagline, 160));
    set("description", normalizeText([l.tagline, l.description].filter(Boolean).join(" — "), 2000));
    set("short_description", normalizeText(l.tagline ?? l.description, 120));
    set("sub_category", normalizeText(l.category, 100));
    if (l.facebook && !(row.social_media as Record<string, unknown> | null)?.facebook)
      patch.social_media = { ...(row.social_media ?? {}), facebook: l.facebook };
    if (!row.verification_notes?.includes(l.source_url))
      patch.verification_notes = [row.verification_notes, `also listed at ${l.source_url}`].filter(Boolean).join("\n");
    return patch;
  };

  for (const l of collapsed) {
    // Re-runs: a row that already carries this source URL is this listing.
    const prev = dbBySourceUrl.get(l.source_url);
    if (prev) { decisions.push({ kind: "enrich", row: prev, via: "source_url", patch: enrichPatch(prev, l) }); continue; }

    const hk = hostKey(l.website), ik = instaKey(l.instagram), uk = urlKey(l.website);
    // Unique host → identity. Shared host → only the exact URL (host + path) counts, and only with a name
    // in common or a shared phone, since a brokerage site lists many agents.
    const byHost = hk && (hostCount.get(hk) ?? 0) <= 2 ? dbByHost.get(hk) : null;
    const byUrl = !byHost && uk ? dbByUrl.get(uk) : null;
    const urlOk = byUrl && (namesOverlap(byUrl.name, l.name) || (byUrl.name_en && namesOverlap(byUrl.name_en, l.name)) || (phoneKey(byUrl.phone) && l.phones.map(phoneKey).includes(phoneKey(byUrl.phone))));
    const sameName = (r: DbRow) => namesOverlap(r.name, l.name) || (!!r.name_en && namesOverlap(r.name_en, l.name)) || (!!phoneKey(r.phone) && l.phones.map(phoneKey).includes(phoneKey(r.phone)));
    const strong = byHost || (urlOk ? byUrl : null) || (ik && dbByInsta.get(ik)) || null;
    if (strong) {
      // A shared website with nothing else in common can be a clinic and one of its dentists, a dealership
      // and a salesperson — the model decides, same as a phone-only match, rather than assuming.
      if (!sameName(strong)) { undecided.push({ l, row: strong }); continue; }
      decisions.push({ kind: "enrich", row: strong, via: strong === byHost ? "website" : strong === byUrl ? "website+path" : "instagram", patch: enrichPatch(strong, l) }); continue;
    }

    const phoneRows = l.phones.map(phoneKey).filter(Boolean).flatMap((p) => dbByPhone.get(p!) ?? []);
    if (phoneRows.length === 0) { toInsert.push(l); continue; }

    const byName = phoneRows.find((r) => namesOverlap(r.name, l.name) || (r.name_en && namesOverlap(r.name_en, l.name)));
    if (byName) { decisions.push({ kind: "enrich", row: byName, via: "phone+name", patch: enrichPatch(byName, l) }); continue; }

    undecided.push({ l, row: phoneRows[0] });
  }

  // ---- 3b. phone matches with no name overlap: ask the model, merge only on a confident yes
  console.log(`\nphone-only / website-only matches needing adjudication: ${undecided.length}`);
  for (let i = 0; i < undecided.length; i += 20) {
    const chunk = undecided.slice(i, i + 20);
    try {
      // gpt-4o-mini got these wrong in testing (called گرین کیبلز الکتریک and
      // "Green Cables Tech" different businesses), so this one call uses the
      // full model, with descriptions and links, and is told to prefer "unsure".
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({ results: z.array(z.object({ idx: z.number(), same: z.enum(["yes", "no", "unsure"]), why: z.string() })) }),
        prompt: `Two Iranian-Canadian directory records share a phone number or a website. For each pair decide:
- "yes": the SAME business. Persian and English spellings/transliterations/translations of one name count as the same (گرین کیبلز = Green Cables, خانه فرش = Rugs Place, فرامدیا = FARA MEDIA); so does a person's name vs. their business name when the trade matches.
- "no": clearly DIFFERENT listings that merely share a phone or website — a person offering two unrelated trades under two names, clearly different companies, or an organisation (clinic, dealership, brokerage, agency) versus one named individual who works there — a directory lists the person and the organisation separately.
- "unsure": anything else. Prefer "unsure" over guessing; a wrong "no" creates a duplicate listing.
${JSON.stringify(chunk.map(({ l, row }, k) => ({ idx: i + k,
  a: { name: row.name, name_en: row.name_en, category: row.category, sub_category: row.sub_category, description: row.short_description, website: row.website, instagram: row.instagram, address: row.address },
  b: { name: l.name, category: l.category, tagline: l.tagline, description: l.description?.slice(0, 200), website: l.website, instagram: l.instagram, address: l.street } })), null, 1)}`,
      });
      for (const r of object.results) {
        const u = undecided[r.idx]; if (!u) continue;
        if (r.same === "yes") decisions.push({ kind: "enrich", row: u.row, via: "phone+model", patch: enrichPatch(u.row, u.l) });
        else if (r.same === "no") { toInsert.push(u.l); phoneShared.push({ new: u.l.name, existing: u.row.slug, why: r.why }); }
        else decisions.push({ kind: "review", reason: `shares phone with ${u.row.slug}, model unsure: ${r.why}`, listing: u.l, db: { id: u.row.id, slug: u.row.slug, name: u.row.name, phone: u.row.phone, category: u.row.category } });
      }
      const answered = new Set(object.results.map((r) => r.idx));
      chunk.forEach(({ l, row }, k) => { if (!answered.has(i + k)) decisions.push({ kind: "review", reason: `shares phone with ${row.slug}, no model answer`, listing: l, db: { id: row.id, slug: row.slug, name: row.name, phone: row.phone, category: row.category } }); });
    } catch (e) {
      for (const { l, row } of chunk) decisions.push({ kind: "review", reason: `shares phone with ${row.slug}, adjudication failed: ${(e as Error).message}`, listing: l, db: { id: row.id, slug: row.slug, name: row.name, phone: row.phone, category: row.category } });
    }
    process.stdout.write(`\r  adjudicated ${Math.min(i + 20, undecided.length)}/${undecided.length}`);
  }
  if (undecided.length) process.stdout.write("\n");

  // ---- 4. categorise + English name for the new ones
  console.log(`\nnew listings to categorise: ${toInsert.length}`);
  const assigned = new Map<number, { category: string; name_en: string }>();
  for (let i = 0; i < toInsert.length; i += 25) {
    const chunk = toInsert.slice(i, i + 25);
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({ results: z.array(z.object({ rowId: z.number(), category: z.string(), name_en: z.string() })) }),
        prompt: `For each business: (1) pick exactly one category slug from this list — never invent one:
${slugs.join("\n")}
Guidance: construction/renovation/HVAC/electrical/plumbing/moving/cleaning -> skilled-trades; insurance, accounting, tax, exchange (صرافی), mortgage -> accounting-tax unless it is clearly a realtor -> real-estate-mortgage; auto -> automotive; web/software/IT/marketing/photography/design -> digital-it; salon, spa, gym, wellness -> beauty-wellness; doctor, dentist, therapist, pharmacy -> medical-clinic; lawyer, immigration -> legal-immigration; restaurant, catering, cafe, sweets, bakery -> restaurant-cafe; grocery, supermarket, food products, flowers -> iranian-grocery; school, tutoring, music lessons, driving school -> education; events, weddings, entertainment -> events.
Nothing may be left without a category — when nothing fits, take the closest: travel agencies -> events; financial planning, investment, wealth, mortgage agents -> accounting-tax; charities, community and religious centres, media -> events; shipping, cargo, moving, cleaning -> skilled-trades; pet services -> beauty-wellness; art galleries -> education.
(2) give name_en: the business name in Latin letters — the English name if it has one, else a faithful transliteration of the Persian name (e.g. "صرافی میلیون" -> "Sarrafi Million"). Keep it under 60 characters.
Businesses:
${JSON.stringify(chunk.map((l, k) => ({ rowId: i + k, name: l.name, source_category: l.category, tagline: l.tagline, description: l.description?.slice(0, 200) })), null, 1)}`,
      });
      for (const r of object.results) if (slugs.includes(r.category)) assigned.set(r.rowId, { category: r.category, name_en: r.name_en.trim() });
    } catch (e) {
      console.error(`\n  batch ${i} failed:`, (e as Error).message);
    }
    process.stdout.write(`\r  categorised ${Math.min(i + 25, toInsert.length)}/${toInsert.length}`);
  }
  if (toInsert.length) process.stdout.write("\n");
  // One retry for rows a failed batch left behind, in smaller chunks.
  const missing = toInsert.map((_, i) => i).filter((i) => !assigned.has(i));
  for (let j = 0; j < missing.length; j += 10) {
    const idx = missing.slice(j, j + 10);
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({ results: z.array(z.object({ rowId: z.number(), category: z.string(), name_en: z.string() })) }),
        prompt: `Pick exactly one category slug per business from: ${slugs.join(", ")}. Nothing may be left out — choose the closest (exchange/صرافی/insurance/mortgage/financial -> accounting-tax; events/venues/candles/decor -> events; travel -> events). Also give name_en (English name or Latin transliteration, <60 chars).\n${JSON.stringify(idx.map((i) => ({ rowId: i, name: toInsert[i].name, source_category: toInsert[i].category, tagline: toInsert[i].tagline })))}`,
      });
      for (const r of object.results) if (slugs.includes(r.category)) assigned.set(r.rowId, { category: r.category, name_en: r.name_en.trim() });
    } catch (e) { console.error(`  retry batch failed: ${(e as Error).message}`); }
  }

  // ---- 5. build insert payloads with unique English slugs
  const taken = new Set(db.map((r) => r.slug));
  toInsert.forEach((l, i) => {
    const ai = assigned.get(i);
    const category = ai?.category;
    if (!category) {
      decisions.push({ kind: "review", reason: "no category from the model", listing: l });
      return;
    }
    const isLatin = /^[\x00-\x7F]*$/.test(l.name);
    const nameEn = isLatin ? null : ai.name_en || null;
    const base = latinSlug(isLatin ? l.name : nameEn || l.name) || "business";
    let slug = base, n = 1;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);

    // Street name beats postal code beats the source's own city label. No city
    // at all → DRAFT, same policy as import-businesses.mts, so the public
    // directory never shows a listing nobody can place.
    // A city hint that is really a street fragment, a country, or a region label is not a city.
    let cityHint = l.city_hint;
    if (cityHint && (/\d|unit|suite|brokerage|^canada$|^ca$|municipality|region\b|province|county|^metro /i.test(cityHint))) cityHint = /metro vancouver/i.test(cityHint) ? "Vancouver" : null;
    if (cityHint && /^willowdale$/i.test(cityHint)) cityHint = "North York";
    // Province names, slashes and mixed-script labels are not cities either.
    if (cityHint && (/^(ontario|british columbia|alberta|quebec|québec|manitoba|saskatchewan|nova scotia|new brunswick|montérégie|canada)$/i.test(cityHint.trim()) || /[\/|]/.test(cityHint))) cityHint = null;
    if (cityHint) cityHint = cityHint.replace(/[،,]\s*qc$/i, "").trim();
    const city = cityFromAddress(l.street) ?? cityFromPostalCode(l.postal_code ?? postalIn(l.street)) ?? cityFromCanadianAddress(l.street) ?? normalizeCity(cityHint);
    // Never default a province: a Montréal listing filed as Ontario is exactly the kind of quiet lie the house rule forbids.
    const province = provinceForCity(city) ?? provinceFromAddress(l.street) ?? provinceFromAddress(l.city_hint) ?? provinceForKnownCity(city);
    // Some sources open the description by repeating the name (or hold only the name); drop that echo.
    // Lorem-ipsum filler (Taablo has one Kafka excerpt) is not a description either.
    let rawDesc = l.description && l.description.trim().startsWith(l.name.trim()) ? l.description.trim().slice(l.name.trim().length).replace(/^[\s\-–—:،,.]+/, "") : l.description;
    if (rawDesc) rawDesc = rawDesc.replace(/^\|\S*\s*/, ""); // «|تورنتو» residue of a stripped title suffix
    if (rawDesc && /lorem ipsum|گرگور سامسا|Gregor Samsa/i.test(rawDesc)) rawDesc = null;
    if (rawDesc && !rawDesc.trim()) rawDesc = null;
    const description = normalizeText([l.tagline, rawDesc].filter(Boolean).join(" — "), 2000);

    decisions.push({
      kind: "insert",
      payload: {
        slug,
        name: normalizeText(l.name, 100),
        name_en: nameEn,
        category,
        sub_category: normalizeText(l.category, 100),
        city: city ?? "نامشخص",
        city_source: city ? "import" : null,
        province,
        country: "Canada",
        // A "street" with no digit is a locality label, not an address (same rule as import-normalize).
        address: l.street && /\d/.test(l.street) ? normalizeText(l.street, 250) : null,
        postal_code: l.postal_code ?? postalIn(l.street),
        phone: l.phones[0] ?? null,
        website: normalizeWebsite(l.website),
        contact_email: normalizeText(l.email, 120),
        instagram: l.instagram,
        telegram: l.telegram,
        whatsapp: l.whatsapp,
        social_media: l.facebook ? { facebook: l.facebook } : null,
        tagline: normalizeText(l.tagline, 160),
        description,
        short_description: normalizeText(l.tagline ?? rawDesc, 120),
        logo_url: normalizeImageUrl(l.logo_url) ?? PLACEHOLDER_LOGO,
        status: city ? "PUBLISHED" : "DRAFT",
        created_by: adminProfile.id,
        verification_notes: `imported from ${l.source_url}`,
      },
    });
  });

  // ---- 6. plan
  const enrich = decisions.filter((d): d is Extract<Decision, { kind: "enrich" }> => d.kind === "enrich");
  const inserts = decisions.filter((d): d is Extract<Decision, { kind: "insert" }> => d.kind === "insert");
  const reviews = decisions.filter((d): d is Extract<Decision, { kind: "review" }> => d.kind === "review");
  const enrichWithChanges = enrich.filter((d) => Object.keys(d.patch).length > 0);

  console.log("\n--- plan ---");
  console.log(`  matched existing : ${enrich.length}  (${enrichWithChanges.length} gain data)`);
  const via = new Map<string, number>(); for (const d of enrich) via.set(d.via, (via.get(d.via) ?? 0) + 1);
  for (const [k, v] of via) console.log(`      via ${k.padEnd(12)} ${v}`);
  const cols = new Map<string, number>();
  for (const d of enrichWithChanges) for (const c of Object.keys(d.patch)) cols.set(c, (cols.get(c) ?? 0) + 1);
  for (const [k, v] of [...cols].sort((a, b) => b[1] - a[1])) console.log(`      fills ${k.padEnd(18)} ${v}`);
  console.log(`  new listings     : ${inserts.length}`);
  const byCat = new Map<string, number>(); for (const d of inserts) byCat.set(d.payload.category as string, (byCat.get(d.payload.category as string) ?? 0) + 1);
  for (const [c, n] of [...byCat].sort((a, b) => b[1] - a[1])) console.log(`      ${c.padEnd(22)} ${n}`);
  const byCity = new Map<string, number>(); for (const d of inserts) byCity.set(d.payload.city as string, (byCity.get(d.payload.city as string) ?? 0) + 1);
  console.log(`      cities: ${[...byCity].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", ")}`);
  console.log(`  needs review     : ${reviews.length}  (not written)`);

  fs.writeFileSync(REPORT, JSON.stringify({
    generated_at: new Date().toISOString(), commit: COMMIT, input: inputPath,
    enrich: enrichWithChanges.map((d) => ({ id: d.row.id, slug: d.row.slug, name: d.row.name, via: d.via, patch: d.patch })),
    matched_no_change: enrich.length - enrichWithChanges.length,
    inserts: inserts.map((d) => d.payload),
    inserted_despite_shared_phone: phoneShared,
    skipped_outside_canada: outside.map((l) => ({ name: l.name, city_hint: l.city_hint, source_url: l.source_url })),
    collapsed_in_file: droppedInFile,
    review: reviews,
  }, null, 1), "utf8");
  console.log(`  report -> ${REPORT}`);

  if (!COMMIT) { console.log("\nDRY RUN — nothing written. Re-run with --commit to apply."); return; }

  // ---- 7. write
  console.log("\nwriting…");
  let updated = 0;
  for (const d of enrichWithChanges) {
    const { error: e } = await supabase.from("businesses").update(d.patch).eq("id", d.row.id);
    if (e) { console.error(`  update ${d.row.slug} failed: ${e.message}`); continue; }
    updated += 1;
    process.stdout.write(`\r  enriched ${updated}/${enrichWithChanges.length}`);
  }
  if (enrichWithChanges.length) process.stdout.write("\n");

  let inserted = 0;
  const payloads = inserts.map((d) => d.payload);
  for (let i = 0; i < payloads.length; i += 50) {
    const { data, error: e } = await supabase.from("businesses").insert(payloads.slice(i, i + 50)).select("id");
    if (e) { console.error(`\n  insert batch ${i} failed: ${e.message}\n  stopped after ${inserted} rows`); process.exit(1); }
    inserted += data?.length ?? 0;
    process.stdout.write(`\r  inserted ${inserted}/${payloads.length}`);
  }
  console.log(`\ndone: ${updated} enriched, ${inserted} inserted, ${reviews.length} left for review`);
}

main().catch((e) => { console.error(e); process.exit(1); });
