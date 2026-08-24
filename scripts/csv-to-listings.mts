// ============================================================================
// Source: scripts/csv-to-listings.mts
// Version: 1.0.0 — 2026-08-23
// Why: Turn a hand-kept spreadsheet of businesses into the SourceListing shape
//      so it goes through import-listings.mts — the importer that MATCHES
//      against the 5,700 rows we already have — instead of
//      import-businesses.mts, which only de-duplicates inside its own file and
//      then blind-inserts.
//
//      That distinction is the whole reason this file exists. The first
//      spreadsheet handed over this way (businesses_export_all_2026-08-23.csv,
//      721 rows) was **96% already in the database**: 632 of its 633 IranJavan
//      rows had been imported back in August, and 57 of its 87 OCR rows too.
//      Run through import-businesses.mts it would have inserted ~690
//      duplicates under `-2` slugs. Converting instead means the overlap
//      enriches the rows we have and only the genuinely new ones are created.
//
// Columns understood (Persian first, English fallback — same vocabulary as
// packages/core/src/import-normalize.ts): عنوان/title, دسته‌بندی/category,
// شهر/city, تلفن/phone, ایمیل/email, وب‌سایت/website, آدرس/address,
// توضیحات/description, لوگو/logo, source.
//
// Provenance: these rows have no per-record URL. `source_url` is still
// required — import-listings.mts stores it as «imported from X» and reads it
// back with a no-whitespace regex — so each row gets a stable, honest,
// obviously-not-a-URL token: <file>#row-<n>-<source>. It never pretends a web
// page exists that does not.
//
// Env / Identity: Pure text transformation. No credentials, no network, no DB.
//
// Usage:
//   npx tsx scripts/csv-to-listings.mts <file.csv> [--out listings.json]
//   npx tsx scripts/import-listings.mts listings.json            # dry run
//   npx tsx scripts/import-listings.mts listings.json --commit
// ============================================================================
import fs from "node:fs";
import path from "node:path";

import { clean, cleanPhone, type SourceListing, type SourceName } from "./lib/source-listing.ts";

const [, , csvPath, ...flags] = process.argv;
const outIdx = flags.indexOf("--out");
const OUT = outIdx >= 0 ? flags[outIdx + 1] : "csv-listings.json";

if (!csvPath) {
  console.error("usage: tsx scripts/csv-to-listings.mts <file.csv> [--out listings.json]");
  process.exit(1);
}

/** RFC4180-ish: quoted fields, doubled quotes, embedded newlines and commas. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

/** Map the spreadsheet's own `source` label onto a SourceName. */
function sourceName(raw: string): SourceName {
  const s = raw.trim().toLowerCase();
  if (s === "iranjavan") return "iranjavan";
  if (s === "ocr") return "ocr";
  if (s === "hamvatan" || s === "jabeh" || s === "taablo" || s === "bazaarche" || s === "farsilink" || s === "iranbusiness" || s === "iranianlawyer") return s;
  // An unlabelled row is OCR-grade provenance: we know it came in by hand and
  // nothing more. Saying so beats inventing a directory it never came from.
  return "ocr";
}

const pick = (r: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (r[k]?.trim()) return r[k].trim();
  return "";
};

function main() {
  // The file is written by Excel/Sheets, so strip the UTF-8 BOM before the
  // first header name — otherwise the first column key is "﻿عنوان" and
  // every lookup on it silently misses.
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^﻿/, "");
  const table = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length < 2) {
    console.error("no data rows");
    process.exit(1);
  }
  const headers = table[0].map((h) => h.replace(/^"|"$/g, "").trim());
  const records = table.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  console.log(`${csvPath}: ${records.length} rows, columns: ${headers.join(", ")}`);

  const file = path.basename(csvPath);
  const now = new Date().toISOString();
  const listings: SourceListing[] = [];
  let noName = 0;

  records.forEach((r, i) => {
    const name = clean(pick(r, "عنوان", "title", "name"));
    if (!name) {
      noName += 1;
      return;
    }
    const src = sourceName(pick(r, "source", "منبع"));
    const phones = [
      ...new Set(
        pick(r, "تلفن", "phone", "phones")
          .split(/[,،;؛/]| or /i)
          .map((p) => cleanPhone(p))
          .filter((p): p is string => !!p)
      ),
    ];
    const website = clean(pick(r, "وب‌سایت", "وبسایت", "website", "url"));
    listings.push({
      source: src,
      source_id: `${file}#${i + 2}`, // +2: 1-based, and row 1 is the header
      source_url: `${file}#row-${i + 2}-${src}`,
      category: clean(pick(r, "دسته‌بندی", "دسته بندی", "category")),
      name,
      tagline: null,
      description: clean(pick(r, "توضیحات", "description")),
      phones,
      email: clean(pick(r, "ایمیل", "email")),
      street: clean(pick(r, "آدرس", "address")),
      city_hint: clean(pick(r, "شهر", "city")),
      postal_code: null,
      // normalizeWebsite in the importer decides the final shape; a bare host
      // like "example.com" is kept as-is here rather than guessed into https.
      website,
      instagram: clean(pick(r, "اینستاگرام", "instagram")),
      telegram: clean(pick(r, "تلگرام", "telegram")),
      whatsapp: clean(pick(r, "واتساپ", "whatsapp")),
      facebook: clean(pick(r, "فیسبوک", "facebook")),
      logo_url: clean(pick(r, "لوگو", "logo", "logo_url")),
      likes: null,
      scraped_at: now,
    });
  });

  const bySource = new Map<string, number>();
  for (const l of listings) bySource.set(l.source, (bySource.get(l.source) ?? 0) + 1);
  const has = (k: keyof SourceListing) =>
    listings.filter((l) => (Array.isArray(l[k]) ? (l[k] as unknown[]).length : l[k])).length;
  console.log(`converted ${listings.length}${noName ? ` (skipped ${noName} with no name)` : ""}`);
  console.log("by source:", [...bySource].map(([s, n]) => `${s} ${n}`).join(" · "));
  console.log(
    `coverage — phone ${has("phones")} · city ${has("city_hint")} · address ${has("street")} · ` +
      `website ${has("website")} · email ${has("email")} · category ${has("category")}`
  );
  console.log(`rows with no city (would insert as DRAFT): ${listings.length - has("city_hint")}`);

  fs.writeFileSync(OUT, JSON.stringify(listings, null, 2));
  console.log(`\nwrote ${OUT}\nnext: npx tsx scripts/import-listings.mts ${OUT}   (dry run)`);
}

main();
