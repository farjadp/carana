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
