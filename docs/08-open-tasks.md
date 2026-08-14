# Open tasks

Ordered by what unblocks the most. Each is scoped so you can pick one up cold.

---

## Do these first — minutes each, high consequence

**Configure Supabase auth URLs.** Signup and password reset are broken in
production until this is set. Four fields. → `04-deployment.md`

**Point carana.ca nameservers at Vercel.** The redirect is already configured;
DNS just does not resolve. Registrar-side.

**Delete `GEMINI_API_KEY` from Vercel.** Nothing reads it. An unused key is
only ever a liability.

---

## Critical path to the App Store

**D-U-N-S for Ashavid Inc.** — free, but takes days to weeks and everything
else waits on it. Check whether one already exists before applying:
`developer.apple.com/enroll/duns-lookup`

Then: Apple Developer Program (Organization, ~$99/yr) and Google Play Console
(Organization, ~$25 once).

Once the Apple account exists:
- Set `APPLE_TEAM_ID` on Vercel — the apple-app-site-association file is already
  serving and just needs the real value
- First EAS build → take the SHA-256 fingerprint → set
  `ANDROID_SHA256_FINGERPRINT`
- TestFlight replaces the 7-day free-signing workaround entirely

Also needed and not started: **store screenshots**, and the **expo.dev
organisation slug** for `owner` in `app.json` — without it builds go under a
personal account rather than Ashavid.

---

## The logo

Still a placeholder `č`. Worth paying a designer. Brief and four
ready-to-paste image-model prompts are in `07-design.md`.

---

## Data

**409 listings have no city.** They are live and appear on the province page,
in categories and in search, but on no city page — which is where most local
search traffic lands. This is the biggest single data win available.

Suggested: an admin queue showing name, description and phone, asking only for
a city. A person could clear a few hundred in an evening. No screen exists yet.

---

## Mobile

Pick a path from `05-mobile.md` — development build on a device, or stay on the
simulator until TestFlight.

Then, in rough order of value:
1. Auth (login, signup) — SecureStore is already wired
2. Save / bookmark
3. Private notes and ratings
4. Submit and read reviews
5. User profile

---

## Engineering debt

**Rate limiting is in-memory.** Resets on deploy, not shared between instances.
Move to Supabase or Upstash before the AI features see real traffic.

**No tests.** Not one. Everything in `02-security.md` was verified by hand
against the live database, which does not protect against regressions. The RLS
rules are the highest-value thing to cover.

**`businesses.category` is free text**, not a foreign key to `categories`.

**Two sources of truth for categories:** `lib/data/category-details.ts` has
names that differ from the database rows. Slugs match; labels do not.

**Drop `verification_codes.code`** — the old plaintext column, superseded by
`code_hash`, nothing writes it.

**Four ESLint errors** in `hooks/use-voice-recorder.ts` and
`use-video-recorder.ts` — React Compiler memoization. Pre-existing, non-fatal,
but those two hooks miss compiler optimisation.

**`ai@7` with `@ai-sdk/openai@4`** — the versions do not match.

**`globals.css` is ~2,700 lines**; `onboarding-form.tsx` is ~1,400.

**`business_claims` / `business_memberships`** exist but the claim workflow was
never built.

---

## Product decisions waiting on you

**Do edits to a published listing need re-review?** Currently: identity and
trust fields always do, free text and links get an AI check, operational fields
publish immediately. The field lists in
`apps/web/lib/moderation/change-review.ts` are the entire policy and are a
one-line change either way.

**Should mobile ever carry the owner dashboard?** Currently web-only, which
keeps every payment surface out of the app and away from Apple's in-app-purchase
rules. Adding a "buy" button to the app would pull the whole thing under the
15–30% commission.

**Photography for category cards.** Real photos would look far better than any
icon set. Needs licensed images.
