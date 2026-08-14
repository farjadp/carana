# Open tasks

Ordered by what unblocks the most. Each is scoped so you can pick one up cold.

---

## Do these first — minutes each, high consequence

**Configure Supabase auth URLs.** Signup and password reset are broken in
production until this is set. Four fields. → `04-deployment.md`

**Set the Resend and Twilio variables on Vercel.** Production has neither.
`RESEND_API_KEY`, `EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`,
`TWILIO_API_KEY_SECRET`, `TWILIO_FROM_NUMBER` — the ten that *are* set are all
Supabase, Maps and the AI keys. Neither sender throws when unconfigured; both
return `sent: false` and log. So on production today the contact form accepts a
message that is never delivered and phone verification never sends a code, and
nothing on the page says so. → `12-integrations.md`

**Check `SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` on Vercel.** It is
present in the **Production** scope. At `"true"`, `POST /api/auth/signup` takes
the admin-SDK branch and creates every account with `email_confirm: true` — no
address is ever verified. Read the value; if it is `"true"`, remove it from
Production and keep it in Preview only.

**Point carana.ca nameservers at Vercel.** The registrar (GoDaddy) already
delegates to `ns1/ns2.vercel-dns.com`, but those servers answer REFUSED — the
zone was never created on Vercel, so the name does not resolve at all. Either
create the DNS zone on Vercel or drop the delegation and set
`A carana.ca 76.76.21.21` at GoDaddy. `charana.ca` is unaffected and serving.

**Delete `GEMINI_API_KEY` from Vercel.** Nothing reads it. An unused key is
only ever a liability.

---

## Shipping to users right now and wrong

**The report button lies.** `handleReport` in
`apps/web/app/businesses/[slug]/business-profile-client.tsx` shows a toast
saying the report reached support and does nothing else. No request, no row, no
email. `/admin/reports` is a static empty state with no query behind it, and the
admin sidebar carries a hardcoded badge of `۲`. Either build it — a
`business_reports` table plus a queue reusing the `moderateReview` pattern — or
delete the button. A directory sells trust; a trust mechanism that only pretends
to work converts a suspicious user into a reassured one while the listing stays
up.

**The claim button leads to a 404.** Every unclaimed profile renders
`<Link href={`/claim?businessId=${business.id}`}>`, and there is no
`app/claim` directory. Verified live: `GET /claim?businessId=… → 404`. With 677
imported listings, almost every profile shows this button, so owner acquisition
walks into a dead end. The pieces around it already exist — `business_claims`,
`business_memberships`, an admin queue at `/admin/claims`, and contact
verification for proving ownership. Only the public route is missing. Build it
or hide the button.

**Nothing counts the conversion moment.** Call, WhatsApp, website and directions
are bare `<a href>` anchors. No event, no row, no number. Featured listings and
advertising cannot be sold on this, because an owner who pays for visibility
will ask what it bought.

Note for anyone who assumes otherwise: there is **no telemetry table**.
`user_business_interactions` is a self-reported personal CRM written only when a
signed-in user deliberately saves something, and `user_activity_logs` covers
only auth and role events. Owner analytics needs a new table, not a new query.

Both were found by tracing one journey through every layer —
see the Service Blueprint in Notion.

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

## Configure Supabase SMTP

Auth mail still uses Supabase's built-in sender and throttles to a handful per
hour. Resend is already configured for everything else. Settings in
`12-integrations.md`. **Do this before any real signup volume.**

---

## Data

**409 listings have no city.** They are live and appear on the province page,
in categories and in search, but on no city page — which is where most local
search traffic lands. This is the biggest single data win available.

Suggested: an admin queue showing name, description and phone, asking only for
a city. A person could clear a few hundred in an evening. No screen exists yet.

---

## Mobile

Auth, profile, save, private notes and review display are **done**. Remaining:

1. Review **submission** form (display already works)
2. A full "my notes" list — the count is shown, the list is not
3. In-app profile editing (currently links to web)
4. Device install or TestFlight — see `05-mobile.md`

---

## Engineering debt

**Rate limiting is in-memory.** Resets on deploy, not shared between instances.
Now also guards the contact form, so this matters more than it did.
Move to Supabase or Upstash.

**Canadian A2P registration for Twilio** is unverified. Low volume works; watch
for `30034`-class errors as signups grow.

**Category artwork** is the weakest asset in the project. Hand it to the
designer who did the logo.

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
