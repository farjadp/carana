// ============================================================================
// Source: scripts/import-businesses.mts
// Version: 1.0.0 — 2026-08-22
// Why: One-off bulk import of a scraped directory export.
// Env / Identity: Runs with the service role, so it must never be exposed as a
//      route. Reads credentials from apps/web/.env.local.
//
// Usage:
//   npx tsx scripts/import-businesses.mts <file.csv> [--commit]
//
// Without --commit it is a dry run: it parses, normalises, categorises and
// prints the plan, but writes nothing.
//
// Policy:
//   rows with a city  -> PUBLISHED
//   rows without one  -> DRAFT, so the public directory stays clean until an
//                        admin fills the location in
// ============================================================================
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

import { normalizeImportRow, type NormalizedImportRow } from "../packages/core/src/import-normalize.ts";
import { slugify } from "../packages/core/src/slug.ts";

// ---------------------------------------------------------------------------
const [, , csvPath, ...flags] = process.argv;
const COMMIT = flags.includes("--commit");

if (!csvPath) {
  console.error("usage: tsx scripts/import-businesses.mts <file.csv> [--commit]");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
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
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"') {
      if (quoted && n === '"') {
        val += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      cur.push(val.trim());
      val = "";
    } else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && n === "\n") i += 1;
      cur.push(val.trim());
      if (cur.some((f) => f !== "")) rows.push(cur);
      cur = [];
      val = "";
    } else val += c;
  }
  if (val || cur.length) {
    cur.push(val.trim());
    if (cur.some((f) => f !== "")) rows.push(cur);
  }

  const headers = rows[0].map((h) => h.replace(/^"|"$/g, "").trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (r[i] || "").replace(/^"|"$/g, "").trim()));
    return o;
  });
}

// ---------------------------------------------------------------------------
async function categorise(rows: NormalizedImportRow[], slugs: string[]) {
  const BATCH = 25;
  const assigned = new Map<number, string>();

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);

    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
          results: z.array(z.object({ rowId: z.number(), category: z.string() })),
        }),
        prompt: `Assign each business exactly one category slug from this list:
${slugs.join("\n")}

Guidance:
- trades/construction/HVAC/electrical/painting/plumbing -> skilled-trades
- insurance, accounting, tax, bookkeeping, financial advice -> accounting-tax
- auto repair, body shop, mechanic, car sales, towing -> automotive
- web design, software, IT support, digital marketing, networks -> digital-it
- gym, spa, salon, barber, massage -> beauty-wellness
- immigration consultants and lawyers -> legal-immigration
Return the slug only, never invent one.

Businesses:
${JSON.stringify(
  chunk.map((r, k) => ({
    rowId: i + k,
    name: r.name,
    description: r.description,
    source_category: r.source_category,
  })),
  null,
  1
)}`,
      });

      for (const res of object.results) {
        if (slugs.includes(res.category)) assigned.set(res.rowId, res.category);
      }
    } catch (error) {
      console.error(`  batch ${i} failed:`, (error as Error).message);
    }

    process.stdout.write(`\r  categorised ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }

  process.stdout.write("\n");
  return assigned;
}

// ---------------------------------------------------------------------------
async function main() {
  const raw = parseCSV(fs.readFileSync(csvPath, "utf8"));
  console.log(`parsed ${raw.length} rows from ${csvPath}`);

  const rows = raw
    .map(normalizeImportRow)
    .filter((r): r is NormalizedImportRow => r !== null);
  console.log(`normalised ${rows.length} rows`);

  // Drop duplicates within the file, keeping the richer record.
  const byKey = new Map<string, NormalizedImportRow>();
  for (const r of rows) {
    const key = `${r.name}|${r.city ?? ""}`;
    const existing = byKey.get(key);
    const score = (x: NormalizedImportRow) =>
      [x.phone, x.description, x.address, x.website].filter(Boolean).length;
    if (!existing || score(r) > score(existing)) byKey.set(key, r);
  }
  const unique = [...byKey.values()];
  console.log(`after de-duplication: ${unique.length}`);

  const { data: cats } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);
  const slugs = (cats ?? []).map((c) => c.slug as string);
  console.log(`target categories: ${slugs.length}`);

  console.log("categorising with AI…");
  const assigned = await categorise(unique, slugs);

  // Reserve slugs against what is already stored.
  const { data: existingRows } = await supabase.from("businesses").select("slug");
  const taken = new Set((existingRows ?? []).map((r) => r.slug as string));

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!adminProfile) {
    console.error("No admin profile found — cannot set created_by.");
    process.exit(1);
  }

  const payload = unique.map((r, i) => {
    const base = slugify(r.name) || "business";
    let slug = base;
    let n = 1;
    while (taken.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    taken.add(slug);

    return {
      slug,
      name: r.name,
      category: assigned.get(i) ?? "skilled-trades",
      city: r.city ?? "نامشخص",
      province: r.province,
      address: r.address,
      phone: r.phone,
      website: r.website,
      contact_email: r.contact_email,
      description: r.description,
      short_description: r.short_description,
      logo_url: r.logo_url ?? PLACEHOLDER_LOGO,
      // No city means it cannot appear on a city page, so it waits for an admin.
      status: r.city ? "PUBLISHED" : "DRAFT",
      created_by: adminProfile.id,
      verification_notes: r.source_url ? `imported from ${r.source_url}` : null,
    };
  });

  const published = payload.filter((p) => p.status === "PUBLISHED").length;
  const drafts = payload.length - published;

  console.log("\n--- plan ---");
  console.log(`  PUBLISHED : ${published}`);
  console.log(`  DRAFT     : ${drafts}`);
  const byCat = new Map<string, number>();
  for (const p of payload) byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  console.log("  by category:");
  for (const [c, n] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.padEnd(22)} ${n}`);
  }

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit to apply.");
    return;
  }

  console.log("\nwriting…");
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += BATCH) {
    const { data, error } = await supabase
      .from("businesses")
      .insert(payload.slice(i, i + BATCH))
      .select("id");

    if (error) {
      console.error(`  batch ${i} failed:`, error.message);
      console.error(`  stopped after ${inserted} rows`);
      process.exit(1);
    }
    inserted += data?.length ?? 0;
    process.stdout.write(`\r  inserted ${inserted}/${payload.length}`);
  }
  console.log(`\ndone: ${inserted} rows`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
