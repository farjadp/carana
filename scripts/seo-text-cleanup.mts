// ============================================================================
// Source: scripts/seo-text-cleanup.mts
// Version: 1.0.0 — 2026-08-24
// Why: Two text defects from bulk imports leak straight into <title>, meta
//      descriptions and JSON-LD, where they are the first thing a searcher
//      sees and the thing the search index matches against:
//
//      1. Latin and Persian names concatenated with no separator — 9 rows,
//         e.g. "Aryana Bakeryآریانا", "Persian Church of Newmarketکلیسای
//         فارسی زبان نیومارکت". Renders as one unreadable word.
//      2. Arabic ي (U+064A) and ك (U+0643) where Persian ی (U+06CC) and
//         ک (U+06A9) belong — 228 rows. Different codepoints, so «صرافي»
//         never matches a search for «صرافی».
//
//      Both are mechanical repairs to imported text, not rewrites of anything
//      a business owner typed: #1 only inserts a space at a script boundary,
//      #2 only swaps a character for its Persian equivalent. Nothing else is
//      touched — no ZWNJ stripping, no diacritic removal, no case changes.
//      Display text stays the author's.
//
// Env / Identity: Service role from apps/web/.env.local. Read-only unless
//      --apply is passed.
//
// Usage:
//   npx tsx scripts/seo-text-cleanup.mts            # report only
//   npx tsx scripts/seo-text-cleanup.mts --apply    # write
// ============================================================================
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const env = Object.fromEntries(
  fs.readFileSync("apps/web/.env.local", "utf8").split("\n").filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i), l.slice(i + 1)];
  })
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * LETTERS only — deliberately not the whole Arabic block. Persian punctuation
 * (، U+060C, ؛, ؟) and the diacritics (U+064B–U+0652) live in that block too,
 * and treating them as letters put a space before the comma in
 * "Parmin Skincare، خدمات پوست پارمین".
 */
const PERSIAN_LETTER = "\\u0621-\\u063A\\u0641-\\u064A\\u0671-\\u06D3\\u06F0-\\u06F9";
const LATIN = "A-Za-z";

/** Insert a single space where a Latin run runs straight into a Persian one. */
function separateScripts(s: string): string {
  return s
    // A diacritic with no letter before it is import noise, not orthography —
    // "ُSadri Custom Renovation" carries a stray damma. Spacing it would keep
    // the garbage and add a space; drop it instead.
    .replace(new RegExp(`^[\\u064B-\\u0652]+`), "")
    .replace(new RegExp(`([${LATIN}])([${PERSIAN_LETTER}])`, "g"), "$1 $2")
    .replace(new RegExp(`([${PERSIAN_LETTER}])([${LATIN}])`, "g"), "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Arabic yeh/kaf → Persian yeh/keh. Nothing else. */
function persianLetters(s: string): string {
  return s.replace(/ي/g, "ی").replace(/ك/g, "ک");
}

type Row = { id: string; slug: string | null; name: string; short_description: string | null };

const rows: Row[] = [];
for (let f = 0; ; f += 1000) {
  const { data, error } = await sb
    .from("businesses")
    .select("id, slug, name, short_description")
    .eq("status", "PUBLISHED")
    .order("id")
    .range(f, f + 999);
  if (error) throw error;
  if (!data?.length) break;
  rows.push(...(data as Row[]));
  if (data.length < 1000) break;
}
console.log(`scanned ${rows.length} published rows\n`);

const edits: { id: string; slug: string | null; field: string; before: string; after: string; kind: string }[] = [];

for (const r of rows) {
  // name: script separation, then letter normalisation
  const sep = separateScripts(r.name);
  if (sep !== r.name) edits.push({ id: r.id, slug: r.slug, field: "name", before: r.name, after: sep, kind: "script-join" });
  const base = sep;
  const fixed = persianLetters(base);
  if (fixed !== base) edits.push({ id: r.id, slug: r.slug, field: "name", before: base, after: fixed, kind: "arabic-letter" });

  if (r.short_description) {
    const d = persianLetters(r.short_description);
    if (d !== r.short_description)
      edits.push({ id: r.id, slug: r.slug, field: "short_description", before: r.short_description, after: d, kind: "arabic-letter" });
  }
}

const byKind: Record<string, number> = {};
for (const e of edits) byKind[`${e.kind}:${e.field}`] = (byKind[`${e.kind}:${e.field}`] ?? 0) + 1;
console.log("proposed edits:", byKind);

console.log("\n— script-join (all of them) —");
for (const e of edits.filter((x) => x.kind === "script-join")) console.log(`  ${e.slug}\n    ${e.before}\n → ${e.after}`);

console.log("\n— arabic-letter, first 10 —");
for (const e of edits.filter((x) => x.kind === "arabic-letter").slice(0, 10))
  console.log(`  ${e.slug} [${e.field}]\n    ${e.before.slice(0, 80)}\n → ${e.after.slice(0, 80)}`);

if (!APPLY) {
  console.log(`\n${edits.length} edits proposed. Nothing written — pass --apply to write.`);
  process.exit(0);
}

// Collapse to one update per row so a name with both defects writes once.
const perRow = new Map<string, { slug: string | null; name?: string; short_description?: string }>();
for (const e of edits) {
  const cur = perRow.get(e.id) ?? { slug: e.slug };
  (cur as Record<string, unknown>)[e.field] = e.after;
  perRow.set(e.id, cur);
}

let ok = 0, failed = 0;
for (const [id, patch] of perRow) {
  const { slug, ...fields } = patch;
  const { error } = await sb.from("businesses").update(fields).eq("id", id);
  if (error) { failed++; console.error("  FAILED", slug, error.message); } else ok++;
}
console.log(`\nupdated ${ok} rows, ${failed} failed`);
