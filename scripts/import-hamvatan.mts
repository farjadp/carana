// ============================================================================
// Source: scripts/import-hamvatan.mts
// Version: 1.0.0 — 2026-08-17
// Why: Merge the hamvatan.org export produced by scrape-hamvatan.mts into the
//      directory: enrich listings we already have, insert the ones we don't,
//      and never create a duplicate.
// Env / Identity: Service role (reads apps/web/.env.local). Never a route.
//
// Usage:
//   npx tsx scripts/import-hamvatan.mts <hamvatan.json> [--commit] [--report out.json]
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
  normalizeText,
  normalizeWebsite,
  provinceForCity,
} from "../packages/core/src/import-normalize.ts";
import type { HamvatanListing } from "./scrape-hamvatan.mts";

// ---------------------------------------------------------------------------
const [, , inputPath, ...flags] = process.argv;
const COMMIT = flags.includes("--commit");
const reportIdx = flags.indexOf("--report");
const REPORT = reportIdx >= 0 ? flags[reportIdx + 1] : "hamvatan-import-report.json";

if (!inputPath) {
  console.error("usage: tsx scripts/import-hamvatan.mts <hamvatan.json> [--commit] [--report out.json]");
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
const foldPersian = (s: string) =>
  s
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‌‏‎]/g, " ")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[ً-ٟ]/g, ""); // harakat

const STOP = new Set([
  "the","and","of","inc","ltd","llc","co","corp","company","group","services","service","canada",
  "toronto","studio","centre","center","clinic","shop","store","home","homes",
  "شرکت","خدمات","گروه","مرکز","کلینیک","فروشگاه","دفتر","مشاور","مشاوره","و","در","با","برای","کانادا","تورنتو",
  "دکتر","دکترای","مهندس","خانم","آقای","دندانپزشک","دندانپزشکی","پزشک",
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
const hostKey = (u: string | null | undefined) => {
  if (!u) return null;
  try {
    const h = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, "");
    if (["instagram.com","facebook.com","t.me","wa.me","linktr.ee","google.com","goo.gl"].some((x) => h.endsWith(x))) return null;
    return h;
  } catch { return null; }
};
const instaKey = (u: string | null | undefined) => {
  if (!u) return null;
  const m = u.toLowerCase().match(/instagram\.com\/([a-z0-9._]+)/);
  if (m && m[1] && !["p","reel","explore"].includes(m[1])) return m[1].replace(/\/$/, "");
  const bare = u.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{2,30}$/.test(bare) ? bare : null;
};

// Deterministic Latin fallback for slugs when the model gives nothing usable.
const TRANSLIT: Record<string, string> = {
  ا:"a",آ:"a",ب:"b",پ:"p",ت:"t",ث:"s",ج:"j",چ:"ch",ح:"h",خ:"kh",د:"d",ذ:"z",ر:"r",ز:"z",ژ:"zh",س:"s",ش:"sh",
  ص:"s",ض:"z",ط:"t",ظ:"z",ع:"a",غ:"gh",ف:"f",ق:"gh",ک:"k",گ:"g",ل:"l",م:"m",ن:"n",و:"v",ه:"h",ی:"y",ء:"",ئ:"y",ؤ:"o",
};
function latinSlug(s: string): string {
  const t = foldPersian(s.toLowerCase()).split("").map((c) => TRANSLIT[c] ?? c).join("");
  return t.normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-").slice(0, 60);
}

// ---------------------------------------------------------------------------
type DbRow = {
  id: string; slug: string; name: string; name_en: string | null; category: string; sub_category: string | null;
  city: string; phone: string | null; website: string | null; instagram: string | null; telegram: string | null;
  whatsapp: string | null; postal_code: string | null; address: string | null; tagline: string | null;
  description: string | null; short_description: string | null; social_media: Record<string, unknown> | null;
  verification_notes: string | null;
};

type Decision =
  | { kind: "enrich"; row: DbRow; via: string; patch: Record<string, unknown> }
  | { kind: "insert"; payload: Record<string, unknown> }
  | { kind: "review"; reason: string; listing?: HamvatanListing; db?: Pick<DbRow, "id" | "slug" | "name" | "phone" | "category"> };

async function main() {
  const listings: HamvatanListing[] = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  console.log(`loaded ${listings.length} hamvatan listings`);

  // ---- 1. collapse duplicates inside the export (same phone + overlapping name)
  const collapsed: HamvatanListing[] = [];
  const byPhone = new Map<string, HamvatanListing[]>();
  const richness = (l: HamvatanListing) =>
    [l.description, l.tagline, l.street, l.postal_code, l.website, l.instagram, l.telegram].filter(Boolean).length + l.phones.length;
  outer: for (const l of listings) {
    for (const p of l.phones.map(phoneKey).filter(Boolean) as string[]) {
      for (const prior of byPhone.get(p) ?? []) {
        if (namesOverlap(prior.name, l.name) || hostKey(prior.website) && hostKey(prior.website) === hostKey(l.website)) {
          // Same business listed twice; keep the richer record, union the categories.
          const keep = richness(l) > richness(prior) ? l : prior;
          const drop = keep === l ? prior : l;
          if (!keep.category.includes(drop.category)) keep.category += ` / ${drop.category}`;
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
      .select("id,slug,name,name_en,category,sub_category,city,phone,website,instagram,telegram,whatsapp,postal_code,address,tagline,description,short_description,social_media,verification_notes")
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    db.push(...(page as DbRow[]));
    if (!page || page.length < 1000) break;
  }
  console.log(`existing listings: ${db.length}`);

  const dbByPhone = new Map<string, DbRow[]>();
  const dbByHost = new Map<string, DbRow>();
  const dbByInsta = new Map<string, DbRow>();
  const dbByHamvatanId = new Map<string, DbRow>();
  for (const r of db) {
    const pk = phoneKey(r.phone); if (pk) dbByPhone.set(pk, [...(dbByPhone.get(pk) ?? []), r]);
    const hk = hostKey(r.website); if (hk && !dbByHost.has(hk)) dbByHost.set(hk, r);
    const ik = instaKey(r.instagram); if (ik && !dbByInsta.has(ik)) dbByInsta.set(ik, r);
    const m = r.verification_notes?.match(/hamvatan\.org\/[^#\s]+#biz-item-([A-Za-z0-9]+)/);
    if (m) dbByHamvatanId.set(m[1], r);
  }

  const { data: cats } = await supabase.from("categories").select("slug,name").eq("is_active", true);
  const slugs = (cats ?? []).map((c) => c.slug as string);
  const { data: adminProfile } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();
  if (!adminProfile) { console.error("No admin profile — cannot set created_by."); process.exit(1); }

  // ---- 3. decide per listing
  const decisions: Decision[] = [];
  const toInsert: HamvatanListing[] = [];
  const undecided: { l: HamvatanListing; row: DbRow }[] = [];
  const phoneShared: { new: string; existing: string; why: string }[] = [];

  const enrichPatch = (row: DbRow, l: HamvatanListing) => {
    const patch: Record<string, unknown> = {};
    const set = (col: keyof DbRow, v: unknown) => { if (v && !row[col]) patch[col] = v; };
    set("website", normalizeWebsite(l.website));
    set("instagram", l.instagram);
    set("telegram", l.telegram);
    set("whatsapp", l.whatsapp);
    set("postal_code", l.postal_code);
    set("address", l.street);
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
    // Re-runs: a row that already carries this hamvatan id is this listing.
    const prev = dbByHamvatanId.get(l.hamvatan_id);
    if (prev) { decisions.push({ kind: "enrich", row: prev, via: "hamvatan_id", patch: enrichPatch(prev, l) }); continue; }

    const hk = hostKey(l.website), ik = instaKey(l.instagram);
    const strong = (hk && dbByHost.get(hk)) || (ik && dbByInsta.get(ik)) || null;
    if (strong) { decisions.push({ kind: "enrich", row: strong, via: hk && dbByHost.get(hk) === strong ? "website" : "instagram", patch: enrichPatch(strong, l) }); continue; }

    const phoneRows = l.phones.map(phoneKey).filter(Boolean).flatMap((p) => dbByPhone.get(p!) ?? []);
    if (phoneRows.length === 0) { toInsert.push(l); continue; }

    const byName = phoneRows.find((r) => namesOverlap(r.name, l.name) || (r.name_en && namesOverlap(r.name_en, l.name)));
    if (byName) { decisions.push({ kind: "enrich", row: byName, via: "phone+name", patch: enrichPatch(byName, l) }); continue; }

    undecided.push({ l, row: phoneRows[0] });
  }

  // ---- 3b. phone matches with no name overlap: ask the model, merge only on a confident yes
  console.log(`\nphone-only matches needing adjudication: ${undecided.length}`);
  for (let i = 0; i < undecided.length; i += 20) {
    const chunk = undecided.slice(i, i + 20);
    try {
      // gpt-4o-mini got these wrong in testing (called گرین کیبلز الکتریک and
      // "Green Cables Tech" different businesses), so this one call uses the
      // full model, with descriptions and links, and is told to prefer "unsure".
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({ results: z.array(z.object({ idx: z.number(), same: z.enum(["yes", "no", "unsure"]), why: z.string() })) }),
        prompt: `Two Iranian-Canadian directory records share a phone number. For each pair decide:
- "yes": the SAME business. Persian and English spellings/transliterations/translations of one name count as the same (گرین کیبلز = Green Cables, خانه فرش = Rugs Place, فرامدیا = FARA MEDIA); so does a person's name vs. their business name when the trade matches.
- "no": clearly DIFFERENT businesses that merely share a phone — a person offering two unrelated trades under two names, or clearly different companies.
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

    // Street name beats postal code beats the source's blanket "Toronto" label.
    const city = cityFromAddress(l.street) ?? cityFromPostalCode(l.postal_code) ?? "Toronto";
    const description = normalizeText([l.tagline, l.description].filter(Boolean).join(" — "), 2000);

    decisions.push({
      kind: "insert",
      payload: {
        slug,
        name: normalizeText(l.name, 100),
        name_en: nameEn,
        category,
        sub_category: normalizeText(l.category, 100),
        city,
        city_source: "import",
        province: provinceForCity(city) ?? "Ontario",
        country: "Canada",
        address: l.street,
        postal_code: l.postal_code,
        phone: l.phones[0] ?? null,
        website: normalizeWebsite(l.website),
        instagram: l.instagram,
        telegram: l.telegram,
        whatsapp: l.whatsapp,
        social_media: l.facebook ? { facebook: l.facebook } : null,
        tagline: normalizeText(l.tagline, 160),
        description,
        short_description: normalizeText(l.tagline ?? l.description, 120),
        logo_url: PLACEHOLDER_LOGO,
        status: "PUBLISHED",
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
