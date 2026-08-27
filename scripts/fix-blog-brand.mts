// ============================================================================
// Source: scripts/fix-blog-brand.mts
// Version: 1.0.0 — 2026-08-26
// Why: `pnpm check:brand` scans SOURCE. It has never scanned the database, and
//      the blog is content: 23 of 74 published posts were still telling readers
//      "با چارانا ..." eight days after the rebrand, live on goplaza.ca. The
//      gap surfaced when the Telegram channel broadcast one of those excerpts
//      verbatim — a rebrand is not finished while the rows still say the old
//      name.
//
//      Scope is deliberately narrow. Only the reader-facing text fields of
//      `blog_posts` are rewritten, and only the bare brand noun. Nothing here
//      touches slugs (a published URL must not move), `charana.ca` (it 308s to
//      goplaza.ca and is a real, working address), or any of the identifiers
//      REBRAND_COMPLETE.md keeps on purpose — the bundle id, the EAS slug, the
//      `charana://` scheme, `imports@charana.ca`, Stripe metadata keys.
//
//      Idempotent, and dry by default: run it, read the diff, then `--apply`.
//
// Usage:
//   npx tsx scripts/fix-blog-brand.mts            # report only
//   npx tsx scripts/fix-blog-brand.mts --apply
//
// Env / Identity: SUPABASE_URL + SUPABASE_SECRET_KEY (service role — RLS would
//      otherwise hide the review queue and forbid the write).
// ============================================================================
import { createClient } from "@supabase/supabase-js";

import { brand } from "../packages/core/src/brand.ts";

const APPLY = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

/**
 * The brand name is never typed by hand — house rule, and the reason the
 * replacement targets are read from brand.ts rather than written here.
 *
 * `چارانا` matches inside `چارانا،` and `چاراناست` and both come out correct
 * (`پلازا،`, `پلازاست`), which is why the pattern has no word boundary.
 * A boundary would also be wrong for Persian, where the letter classes are
 * not what \b thinks they are.
 */
const RULES: { find: RegExp; replace: string }[] = [
  { find: /چارانا/g, replace: brand.nameFa },
  { find: /čārana/gi, replace: brand.name },
  { find: /charana/gi, replace: brand.name },
];

/** Reader-facing text only. `slug` is absent on purpose: URLs do not move. */
const TEXT_FIELDS = ["title", "title_en", "excerpt", "key_takeaway", "summary_en", "body_md", "cover_alt", "author_name"] as const;

// A URL or an email that happens to contain the old token is a working
// address, not a brand mention. Skip any match sitting inside one.
const PROTECTED = /(?:https?:\/\/[^\s)"']+|[\w.+-]+@[\w.-]+)/g;

// The placeholder is delimited by NUL bytes, which cannot occur in article
// text. The first version stashed each URL as a space-delimited number and
// restored on / (\d+) /, which would have written a stashed URL over any bare
// " 5 " already present in a post — a silent corruption, caught only because
// the dry run was read before the write.
const NUL = String.fromCharCode(0);
const mask = (i: number) => `${NUL}${i}${NUL}`;
const MASK_RE = new RegExp(`${NUL}(\\d+)${NUL}`, "g");

function rewrite(text: string): string {
  const keep: string[] = [];
  let out = text.replace(PROTECTED, (m) => mask(keep.push(m) - 1));
  for (const { find, replace } of RULES) out = out.replace(find, replace);
  out = out.replace(MASK_RE, (_m, i) => keep[Number(i)]);
  if (out.includes(NUL)) throw new Error("placeholder survived the round trip — refusing to write");
  return out;
}

const rewriteJson = (v: unknown): unknown =>
  typeof v === "string"
    ? rewrite(v)
    : Array.isArray(v)
      ? v.map(rewriteJson)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rewriteJson(x)]))
        : v;

const { data, error } = await supabase
  .from("blog_posts")
  .select(`id, slug, status, tags, faq, ${TEXT_FIELDS.join(", ")}`)
  .limit(1000);
if (error) throw error;

let changed = 0;
let fields = 0;
for (const post of (data ?? []) as Record<string, unknown>[]) {
  const patch: Record<string, unknown> = {};

  for (const f of TEXT_FIELDS) {
    const v = post[f];
    if (typeof v !== "string") continue;
    const next = rewrite(v);
    if (next !== v) patch[f] = next;
  }
  const tags = post.tags as string[] | null;
  if (tags?.length) {
    const next = tags.map(rewrite);
    if (next.some((t, i) => t !== tags[i])) patch.tags = next;
  }
  if (post.faq) {
    const next = rewriteJson(post.faq);
    if (JSON.stringify(next) !== JSON.stringify(post.faq)) patch.faq = next;
  }
  if (!Object.keys(patch).length) continue;

  changed++;
  fields += Object.keys(patch).length;
  console.log(`${APPLY ? "fix" : "would fix"} [${post.status}] ${post.slug} — ${Object.keys(patch).join(", ")}`);

  if (APPLY) {
    const { error: upErr } = await supabase.from("blog_posts").update(patch).eq("id", post.id as string);
    if (upErr) console.error(`  FAILED: ${upErr.message}`);
  }
}

console.log(`\n${changed} posts, ${fields} fields ${APPLY ? "updated" : "would change"} (of ${data?.length ?? 0} scanned).`);
if (!APPLY && changed) console.log("Re-run with --apply to write.");
