// ============================================================================
// Source: packages/core/src/link.check.mts
// Version: 1.0.0 — 2026-08-25
// Why: The repo has no test runner, and introducing one was more change than
//      this step had earned. This is the same idea in a shape the repo
//      already uses (scripts/check-brand.mjs): a plain file that asserts and
//      exits non-zero. Run it with `npx tsx src/link.check.mts` from
//      packages/core, or `pnpm --filter @goplaza/core check`.
//
//      Every assertion here exists because getting it wrong is expensive:
//        * the Persian-digit fold — this class of bug has already broken
//          sign-in and phone verification;
//        * the OR inside hasLinkPro — if it ever became an AND, Starter at
//          $21 would stop dominating Link Pro at $13 and the pricing would be
//          quietly wrong;
//        * lapsed plans — entitlement is recomputed, never trusted, so a late
//          webhook costs nobody anything;
//        * the two analytics subjects — the first version of
//          analyticsWindowFor answered for both at once and leaked a
//          listing's promised 30 days into the link page's 7;
//        * HANDLE_RE against the SQL CHECK — if those drift, the server
//          accepts what the database rejects and the user gets a 500 instead
//          of a sentence.
// Env / Identity: Pure. No IO, no network, no database.
// ============================================================================
import {
  validateHandle,
  normalizeHandle,
  fallbackHandle,
  shortLink,
  bioUrl,
  linkLimitsFor,
  analyticsWindowFor,
  showsFooter,
  HANDLE_RE,
} from "./link.js";
import { hasLinkPro } from "./entitlements.js";

let fail = 0;
const is = (label: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fail++;
    console.log(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok   ${label}`);
  }
};

// --- Persian digits must fold, or the field rejects what the user can see
is("persian digits fold", normalizeHandle("کباب۲۲"), "کباب22");
is("arabic-indic fold", normalizeHandle("shop٤٥"), "shop45");

// --- handle format
is("valid handle", validateHandle("Kabab-Sara").ok, true);
is("valid handle is lowercased", (validateHandle("Kabab-Sara") as { handle: string }).handle, "kabab-sara");
is("persian letters rejected", (validateHandle("کباب") as { reason: string }).reason, "format");
is("leading hyphen rejected", (validateHandle("-abc") as { reason: string }).reason, "format");
is("trailing hyphen rejected", (validateHandle("abc-") as { reason: string }).reason, "format");
is("too short", (validateHandle("ab") as { reason: string }).reason, "too_short");
is("too long", (validateHandle("a".repeat(31)) as { reason: string }).reason, "too_long");
is("empty", (validateHandle("  ") as { reason: string }).reason, "empty");
is("digits only ok", validateHandle("4821").ok, true);
is("30 chars ok", validateHandle("a".repeat(30)).ok, true);

// --- the fallback handle, deliberately ugly
is("fallback", fallbackHandle(4821), "g-4821");
is("fallback folds persian digits", fallbackHandle("۴۸۲۱"), "g-4821");

// --- links
is("short link", shortLink("b", 4821), "https://gplz.link/b/4821");
is("bio url", bioUrl("kababsara"), "https://gplz.link/kababsara");

const soon = new Date(Date.now() + 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();

// --- the OR that makes $21 dominate $13
is("free has no link pro", hasLinkPro({ plan: "free" }), false);
is("standalone link pro", hasLinkPro({ plan: "free", link_pro_until: soon }), true);
is("expired standalone", hasLinkPro({ plan: "free", link_pro_until: past }), false);
is("paid directory plan grants it", hasLinkPro({ plan: "pro", plan_until: soon }), true);
is("LAPSED directory plan does not", hasLinkPro({ plan: "pro", plan_until: past }), false);
is("platinum grants it", hasLinkPro({ plan: "platinum", plan_until: soon }), true);

// --- packaging
is("free custom link cap", linkLimitsFor({ plan: "free" }).customLinks, 5);
is("pro is unlimited", linkLimitsFor({ plan: "free", link_pro_until: soon }).customLinks, null);
is("free handle is not custom", linkLimitsFor({ plan: "free" }).customHandle, false);

// --- the two analytics subjects are not the same question
is("link page · free = 7d", analyticsWindowFor({ plan: "free" }, "link_page"), 7);
is("link page · link pro = 90d", analyticsWindowFor({ plan: "free", link_pro_until: soon }, "link_page"), 90);
is("link page · premium = 90d", analyticsWindowFor({ plan: "featured", plan_until: soon }, "link_page"), 90);
is("link page · lapsed = 7d", analyticsWindowFor({ plan: "featured", plan_until: past }, "link_page"), 7);
is("business · free = 30d (plans.ts bullet)", analyticsWindowFor({ plan: "free" }, "business"), 30);
is("business · starter = 90d (plans.ts bullet)", analyticsWindowFor({ plan: "pro", plan_until: soon }, "business"), 90);
is("business · lapsed starter = 30d", analyticsWindowFor({ plan: "pro", plan_until: past }, "business"), 30);
is("business · link pro alone does NOT widen it", analyticsWindowFor({ plan: "free", link_pro_until: soon }, "business"), 30);

// --- the footer is an advertisement, so it comes back when the plan lapses
is("footer stays on free even if hiding was requested", showsFooter({ plan: "free" }, true), true);
is("footer removable when paid", showsFooter({ plan: "free", link_pro_until: soon }, true), false);
is("footer returns when the plan lapses", showsFooter({ plan: "free", link_pro_until: past }, true), true);

// --- code and database must agree on what a handle looks like.
//
// NOTE what this assertion is worth. The first version of it passed: both
// regexes were byte-identical. Both were also wrong in the same two ways —
// no minimum length, and citext made the database side case-insensitive so it
// accepted `Kabab-Sara`. An equality assertion proves the two sides agree; it
// cannot prove they are right. Only calling handle_available() against the
// real database found that, in about a minute. Keep this line, and keep
// running the function too.
is(
  "regex matches 20260830360000_handle_format_fix.sql",
  HANDLE_RE.source,
  /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.source,
);

// The cases that were wrong in production for eleven minutes on 25 Aug, kept
// here so they can never silently come back.
is("two chars rejected (was accepted by the DB)", validateHandle("ab").ok, false);
is("single char rejected", validateHandle("a").ok, false);
is("three chars accepted", validateHandle("abc").ok, true);
is("capitals are lowercased, not rejected here", (validateHandle("KABAB") as { handle: string }).handle, "kabab");
is("regex itself rejects capitals", HANDLE_RE.test("Kabab-Sara"), false);

console.log(fail ? `\n${fail} FAILED` : `\nall passed`);
process.exit(fail ? 1 : 0);
