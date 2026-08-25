// ============================================================================
// Source: scripts/check-brand.mjs
// Version: 1.0.0 — 2026-08-18
// Why: Guard against the old brand creeping back into user-facing source after
//      the čārana → GOPLAZA rebrand. Fails CI/`pnpm check:brand` when a
//      forbidden token appears anywhere it is not explicitly allowed.
// Env / Identity: Local tooling only, no network.
// ============================================================================
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Old-brand tokens. Matched case-insensitively. */
const FORBIDDEN = ["čārana", "charana", "چارانا"];

/**
 * Paths where the old token is allowed to remain, each with the reason.
 * Keep this list short and every entry justified — it is the "documented
 * legacy" list from REBRAND_COMPLETE.md.
 */
const ALLOW = [
  // Historical, immutable
  { re: /^supabase\/migrations\//, why: "migration history is immutable" },
  { re: /^docs\/07-session-log\.md$/, why: "narrates the past" },
  { re: /^docs\/06-gotchas\.md$/, why: "narrates the past" },
  { re: /^CHANGELOG\.md$/, why: "release history" },
  { re: /^REBRAND_(AUDIT|PLAN|COMPLETE|EXTERNAL_ACTIONS)\.md$/, why: "the rebrand record itself" },
  { re: /^charana-category-(art|images)\//, why: "AI generation output archive" },
  { re: /^\.claude\//, why: "local tool allowlists" },
  // Live identifiers that must not change (REBRAND_PLAN.md D6)
  { re: /^apps\/mobile\/app\.json$/, why: "bundle id, package, EAS slug, legacy scheme + applinks" },
  { re: /^apps\/mobile\/app\.config\.ts$/, why: "EAS slug fallback" },
  { re: /^apps\/web\/app\/\.well-known\//, why: "bundle id / package name" },
  { re: /^apps\/mobile\/src\/app\/auth\/signup\.tsx$/, why: "comment about the legacy scheme allow-list" },
  { re: /^apps\/web\/app\/api\/events\/route\.ts$/, why: "hash salt fallback kept for stability" },
  { re: /^apps\/web\/lib\/analytics\/visitor\.ts$/, why: "the hash salt fallback moved here, 25 Aug — changing it would make every returning visitor look new for a day" },
  { re: /^apps\/web\/proxy\.ts$/, why: "the charana.ca 301 — the redirect IS the old domain, and it is load-bearing" },
  { re: /^apps\/web\/app\/robots\.ts$/, why: "comment explaining why the dead host: directive was removed" },
  { re: /^apps\/web\/lib\/data\/releases\.ts$/, why: "changelog entries from before the rename" },
  { re: /^docs\/(08-competitors|10-seo-playbook|11-seo-audit-2026-08-24|12-seo-architecture)\.md$/, why: "SEO prose about the two domains and the migration between them" },
  { re: /^packages\/core\/src\/brand\.ts$/, why: "legacyScheme + the rebrand comment" },
  // The rename has to stay machine-readable for years: schema.org
  // alternateName and the llms.txt continuity block are what let a search or
  // answer engine holding "čārana" map it to GOPLAZA. Deleting these would
  // break the migration, not tidy it.
  { re: /^apps\/web\/lib\/seo\/entity\.ts$/, why: "Organization.alternateName carries the old brand" },
  { re: /^apps\/web\/app\/llms\.txt\/route\.ts$/, why: "the name-change block answer engines need" },
  { re: /^apps\/web\/app\/layout\.tsx$/, why: "comment explaining the canonical/rebrand trap" },
  { re: /^SEO_AUDIT\.md$/, why: "the audit record" },
  { re: /^packages\/core\/src\/owner-identity\.ts$/, why: "imports@charana.ca system profile" },
  { re: /^scripts\/(reassign-imports|import-listings|import-businesses)\.mts$/, why: "imports@charana.ca system profile" },
  { re: /^scripts\/seed-stripe-plans\.mts$/, why: "Stripe metadata lookup keys" },
  { re: /^scripts\/check-brand\.mjs$/, why: "this file" },
  { re: /^scripts\/generate-brand-assets\.mjs$/, why: "rebrand comment" },
  { re: /^scripts\/generate-category-(art|images)\.py$/, why: "output dir names of the archive" },
  // Mailboxes stay on the old domain until goplaza.ca is verified in Resend
  { re: /^apps\/web\/lib\/data\/company\.ts$/, why: "mailboxes until Resend verifies goplaza.ca" },
  { re: /^\.env\.example$/, why: "EMAIL_FROM until Resend verifies goplaza.ca" },
  { re: /^apps\/web\/(README|DEPLOYMENT)\.md$/, why: "explains the mailbox/legacy-scheme state" },
  { re: /^DEPLOYMENT\.md$/, why: "explains the mailbox/legacy-scheme state" },
  { re: /^docs\/0[0-5]-.*\.md$|^docs\/09-.*\.md$/, why: "docs name the legacy identifiers on purpose" },
];

const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
const BINARY = /\.(png|jpe?g|webp|gif|ico|zip|woff2?|ttf|otf|pdf|mp4|apk|aab)$/i;

let failures = 0;
for (const f of files) {
  if (BINARY.test(f)) continue;
  if (ALLOW.some((a) => a.re.test(f))) continue;
  const text = fs.readFileSync(path.join(ROOT, f), "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const tok of FORBIDDEN) {
      if (lower.includes(tok)) {
        failures++;
        console.log(`${f}:${i + 1}: ${line.trim().slice(0, 140)}`);
      }
    }
  });
}

if (failures) {
  console.error(`\ncheck-brand: ${failures} forbidden old-brand reference(s). Either fix them or add a justified entry to ALLOW in scripts/check-brand.mjs.`);
  process.exit(1);
}
console.log("check-brand: clean");
