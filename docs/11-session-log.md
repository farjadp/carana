# Session log — 2026-08-23/24

14 commits, from a codebase that would not build to a live site.

## Commits, oldest first

```
 1. 63edb79 Harden authorization, fix the build, and sync migration history
 2. 1b36fdb Convert to a Turborepo monorepo and add the Expo mobile app
 3. 89933ea Import the directory, rebuild the mobile app, redraw the category art
 4. 79a6cdd Repair category image paths broken by the artwork swap
 5. b3c3497 Add the pages the App Store requires and fix outstanding web defects
 6. 49ea0e5 Browse by province, re-host imported logos, and add the app icon
 7. 16075d0 Fix the Vercel build: declare env in turbo.json, derive the base URL
 8. 3e01141 Promote the Supabase URL and publishable key into the client bundle
 9. ec98681 Fail the build early and say exactly which Supabase variables are missing
10. e03e28c Use Vercel's standard monorepo layout instead of hand-wired build paths
11. 2b4ae59 Resolve the domain redirect loop; charana.ca is canonical
12. 1ea3d37 Rebuild the site header and add the missing /businesses index
13. d39c4a4 Add the native iOS project so the app can run on a real device
```

## What changed, in order

**Review.** Read the whole solution — 11 migrations, every server action, API
route, and the auth layer. Found a hard-coded `SUPABASE_SECRET_KEY` in four
repo-root scripts, a privilege-escalation path to `admin` through signup, and
a production build that had never succeeded.

**Phase 0.** Rotated and revoked the leaked key. Moved authorization into RLS.
Fixed the build. Discovered the Supabase migration history was empty while the
schema had been applied by hand, repaired it, and found two migrations that had
never run at all.

**Mobile strategy.** Settled on Expo over native and Flutter; established that
featured listings sold to business owners are a B2B advertising service and sit
outside Apple's in-app-purchase rules, provided the purchase stays on the web.

**Monorepo.** Converted to Turborepo. Next.js moved to `apps/web` unchanged;
`packages/core` took the generated database types, the Zod schemas and the
listing state machine. Scaffolded `apps/mobile` with Expo Router.

**Import.** 676 listings from a scraped CSV. The parser and the AI categoriser
were fine; the field mapping was not — it would have published a competing
directory as each business's website, and collapsed every Persian name to the
slug `business`.

**Change review.** Edits to a live listing now run through a classifier:
deterministic rules for identity and trust fields, an AI check for free text
and links, immediate publication for operational fields. Fails closed. RLS
forbids owners from updating a published row, so the classifier cannot be
skipped.

**App Store readiness.** Real privacy policy and terms — both had been
placeholder text. Self-service account deletion, which Guideline 5.1.1(v)
requires and whose absence means rejection. A support page. Real company
identity throughout.

**Deployment.** Four separate causes, in sequence: Turborepo stripping
undeclared environment variables; a base-URL guard that failed the build it was
meant to protect; `NEXT_PUBLIC_*` inlining; and Vercel dashboard overrides
that beat the repo. Then a redirect loop between apex and www. Live at
charana.ca.

**Province hierarchy.** Geography is province → city on both platforms, which
gave the 409 city-less listings somewhere to live. 618 logos moved off the
source server onto our own storage.

**Header.** The main nav linked to a page that 404'd and hid itself entirely
below the `md` breakpoint with no replacement — no navigation at all on a
phone, for a local directory. Rebuilt with a real mobile menu and active state,
and built the missing `/businesses` index.

**Native iOS.** Expo Go on the App Store is pinned at SDK 54; the project is 57.
Prepared a development build: entitlement stripping for free signing, the
CocoaPods locale fix, and the Xcode project naming. Device install not finished.

## What I got wrong

**Category artwork, twice.** The first set used a pointed arch and an
eight-pointed shamseh — Islamic architecture, not Iranian identity. The second
was better but the illustration was still weak. Hand-coding SVG path data works
for geometry and badly for pictures. The right answer was to use a professional
icon set, which took two rejections to reach.

**The logo is still a placeholder.** Worth paying a designer; brief is in
`07-design.md`.

**Told you the original logos were not imported.** They were — 621 of them,
hotlinked. Corrected in the same session and since re-hosted.

**Trusted `api.expo.dev` over the App Store** on which Expo Go version exists.
Your screenshot was right.

---

# Session: 2026-08-14 (the long one)

One conversation, morning to evening. The theme that emerged: **silent
failure** — things that report success while doing nothing.

## Infrastructure

- **Auto-deploy had been dead a day.** Every git push failed on a `"//"` key
  in `vercel.json` (the Git integration validates strictly; the CLI does
  not). Production was quietly running from laptop deploys. Fixed; pipeline
  since verified over many pushes.
- Farjad set Twilio + Resend env vars; email and SMS became real.
- Sentry was added, then **removed the same day** (price) and replaced with
  first-party telemetry: `system_errors` (quiet failures via
  `reportQuietFailure`) and `cron_runs` (heartbeat by presence — a job that
  stops running writes nothing, so success is recorded too).
- Vercel Web Analytics (cookieless, no consent banner needed); Search
  Console registered by Farjad. GA rejected deliberately: cookie wall on a
  trust product.

## The verification system (core of the day)

Two paths: `self_onboarded` (own email+phone proven) and `claimed` — SMS to
the number **already published on the listing**; the claimant never chooses
the destination, receiving the code *is* the proof. 182-day expiry; renewal
re-runs the original proof; countdown public only in the last 30 days
(owners always see it). Editing the proven phone/email **voids** the badge
(`superseded`), with Persian-digit folding so RTL input doesn't void itself.
`/claim` route built — it had linked to a 404 on every unclaimed profile.
Reminder cron at 30/7/0 days, stage-bucketed so it can't nag; refuses to run
without `CRON_SECRET` (unset — the remaining blocker).

## Honesty purge

Found and removed a family of UI lies: the home page called all 677 imported
listings "تایید شده" with an **unconditional** chip under a heading claiming
team review; category/city cards read `is_verified`, a column in no
migration; the fallback category FAQ claimed "all reviewed"; "most visited"
sorted by nonexistent `view_count` (section could never render — now backed
by a real counter + `increment_business_view`); the report button still
lies (open task). Rule recorded in 00-START-HERE.

## Home page + imagery

Home rebuilt as a discovery surface: shared `BusinessCard` (whole card is
the link, CTA «دیدن اطلاعات و تماس»), newest + most-visited sections, city
cards with generated blue-hour photos, app section with a **live miniature
of the real app UI** (first version — dead phone on wallpaper — rejected),
nav decluttered. Category art: after 4 failed art directions (icon clichés →
unreadable medallions → pixel edges → photography too stock), landed on
editorial object photography, Iranian identity in art direction not
subjects. 12 categories + 8 cities, one campaign, WebP (24 MB → <1 MB).
Scripts in `scripts/generate-*.py` with locked SYSTEM blocks.

## Mobile

Phone build unblocked through the full error chain: signing (Apple ID),
**iOS platform download** (the "ineligible destination" trap — gotcha
recorded), react-native-svg 15.13→15.15.4 (Fabric API mismatch), prebuild,
Developer Mode. **App now runs on Farjad's iPhone.** First real signup
exposed the auth-email chain (junk / "Supabase Auth" / English / localhost
link) → `charana://auth/confirmed` deep-link welcome screen built; RTL
branded templates written (`docs/13`); dashboard settings documented and
waiting on Farjad.

## Process

Notion Mission Control became the operational board: ~50 missions, `Hands`
column (Farjad/Claude/Both), per-task instructions for every Farjad-owned
card, Done log backfilled from the whole git history. Standing rule in
memory: all work is recorded there.

## What I got wrong today

- Audited the badge system across profile/category/city surfaces and
  declared it clean — **without checking the home page**, which was the one
  surface lying. Lesson recorded: enumerate from sitemap.xml.
- Called the deploy pipeline broken when it was merely slow; the empty
  re-trigger commit was unnecessary.
- Four rounds of image art direction rejected before understanding the
  actual requirement (identity in direction, not in subjects).
- Left the events section's `view_count` assumption unverified for hours
  while it silently rendered nothing.
