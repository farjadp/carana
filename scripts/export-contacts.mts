// ============================================================================
// Source: scripts/export-contacts.mts
// Version: 1.0.0 — 2026-08-23
// Why: Produce a contact list the newsletter importer at
//      /admin/newsletter/import will actually accept. That tool needs a header
//      row with an `email` column and recognises `first_name`, `last_name`,
//      `company` and `locale`; anything else becomes a custom merge field. A
//      Persian-headed export (نام/ایمیل/تلفن) is rejected outright with
//      "No rows found".
//
//      `businesses` has ONE `name` column and no notion of a person, so
//      first/last cannot be read off it — roughly half of the legal-immigration
//      rows are firm names ("Abedi Law", «دفتر حقوقی عادل زارعی») and the rest
//      are people. The split is a judgement call, so the model makes it, and
//      anything it is not confident about stays a `company` rather than being
//      guessed into somebody's surname. A wrong last_name is worse than a
//      blank one: it goes out in the greeting of a real email.
//
//      Rows with no email are dropped — they are not contacts. Addresses are
//      lower-cased and de-duplicated, and a cell holding two addresses becomes
//      two rows.
//
// Env / Identity: Service role + OPENAI_API_KEY from apps/web/.env.local.
//      Read-only against the database; writes only the CSV.
//
// Usage:
//   npx tsx scripts/export-contacts.mts --category legal-immigration --out contacts.csv
// ============================================================================
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const args = process.argv.slice(2);
const flag = (n: string, d: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const CATEGORY = flag("category", "legal-immigration");
const OUT = flag("out", "contacts.csv");

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

type Row = { name: string; name_en: string | null; contact_email: string | null; phone: string | null; city: string | null };

async function main() {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("businesses")
      .select("name,name_en,contact_email,phone,city")
      .eq("category", CATEGORY)
      .not("contact_email", "is", null)
      .order("name")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  console.log(`${CATEGORY}: ${rows.length} rows with an email`);

  // ---- classify: person or company -----------------------------------------
  const Schema = z.object({
    results: z.array(
      z.object({
        rowId: z.number(),
        kind: z.enum(["person", "company", "unsure"]),
        first_name: z.string(),
        last_name: z.string(),
        company: z.string(),
      })
    ),
  });
  const decided = new Map<number, z.infer<typeof Schema>["results"][number]>();
  for (let i = 0; i < rows.length; i += 30) {
    const chunk = rows.slice(i, i + 30);
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: Schema,
        prompt:
          `Each item is the name of a business in an Iranian-Canadian directory of lawyers and ` +
          `immigration consultants. The names are Persian or English.\n\n` +
          `For each one decide whether the NAME NAMES A PERSON or A COMPANY.\n` +
          `- person  -> give first_name and last_name in the SAME script the name is written in ` +
          `(Persian stays Persian). Leave company "".\n` +
          `- company -> give company as the name, cleaned of nothing. Leave first_name and last_name "".\n` +
          `- unsure  -> treat it as a company: put the whole name in company, leave the name fields "".\n\n` +
          `Rules: never invent a surname; never split a company name into a person; drop honorifics ` +
          `(Dr/دکتر/مهندس) from first_name; a name like "Abedi Law" or «دفتر حقوقی عادل زارعی» is a ` +
          `COMPANY even though a family name appears inside it. Prefer "unsure" over a guess.\n\n` +
          JSON.stringify(chunk.map((r, k) => ({ rowId: i + k, name: r.name, name_en: r.name_en })), null, 1),
      });
      for (const r of object.results) decided.set(r.rowId, r);
    } catch (e) {
      console.error(`  batch at ${i} failed: ${(e as Error).message}`);
    }
    process.stdout.write(`\r  classified ${Math.min(i + 30, rows.length)}/${rows.length}`);
  }
  console.log();

  // ---- expand to one row per address, de-duplicated -------------------------
  const seen = new Set<string>();
  const out: { email: string; first_name: string; last_name: string; company: string; phone: string; city: string }[] = [];
  let noDecision = 0;
  rows.forEach((r, k) => {
    const d = decided.get(k);
    if (!d) noDecision += 1;
    // No classification => company, never a guessed personal name.
    const person = d?.kind === "person";
    for (const raw of String(r.contact_email ?? "").split(/[,;،]/)) {
      const email = raw.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) continue;
      if (seen.has(email)) continue;
      seen.add(email);
      out.push({
        email,
        first_name: person ? (d?.first_name ?? "").trim() : "",
        last_name: person ? (d?.last_name ?? "").trim() : "",
        company: person ? "" : (d?.company || r.name || "").trim(),
        phone: r.phone ?? "",
        city: r.city ?? "",
      });
    }
  });

  const cols = ["email", "first_name", "last_name", "company", "phone", "city"] as const;
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // NO BOM. Excel wants one, but a byte-order mark in front of the header makes
  // the first column read as "﻿email" in a naive parser, and the importer
  // is looking for exactly "email".
  const csv = [cols.join(","), ...out.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
  fs.writeFileSync(OUT, csv, "utf8");

  const people = out.filter((r) => r.first_name).length;
  console.log(`\nunique addresses: ${out.length}`);
  console.log(`  with a person's name: ${people} · company only: ${out.length - people}`);
  if (noDecision) console.log(`  ${noDecision} rows got no model answer and were written as company`);
  console.log(`wrote ${OUT}`);
}

await main();
