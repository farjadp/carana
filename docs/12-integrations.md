# Integrations

Added after the original handover was written. All live and verified.

## Email — Resend

`charana.ca` is a **verified sending domain**, so mail leaves from
`noreply@charana.ca` with SPF and DKIM already in place. Confirmed by sending.

`apps/web/lib/email/send.ts` creates the client **lazily** — reading the key at
module scope would fail the build on any route that transitively imports it
whenever the key is absent. Without a key in development it logs the message
rather than erroring.

| Message | Trigger |
|---|---|
| Verification code | user requests email verification |
| Listing published | admin approves a listing |
| Listing needs changes | admin sets NEEDS_CHANGES or REJECTED |
| Contact form | someone submits `/contact` |

Templates in `apps/web/lib/email/templates.ts`. Persian RTL, inline CSS only,
each with a plain-text part.

**Still to do:** point Supabase's own auth mail at Resend. Confirmation and
password-reset still use Supabase's built-in sender, which throttles to a
handful per hour. Settings → Authentication → SMTP: `smtp.resend.com`, port
465, username `resend`, password = the Resend API key.

## SMS — Twilio

Account **Ashavid**, active. Two numbers; the configured sender is
`+1 249 554 9408`, an **Ontario** number — the other is Michigan, and a local
number delivers better to a Canadian audience.

Authenticated with an **API Key**, not the account auth token, so the
credential can be revoked without touching the account. No SDK: the Twilio REST
endpoint is a form POST and one fetch is less to keep updated.

The destination always comes from `profiles.mobile_number`, **never from the
request** — a caller must not be able to aim a verification code at an
arbitrary handset.

Numbers are normalised to E.164 including Persian and Arabic-Indic digits. See
`09-gotchas.md`; this is the same trap that broke sign-in.

**Not yet checked:** Canadian A2P registration for application-to-person
traffic at volume. Low volume works. Watch for `30034`-class errors as signups
grow.

**Not used:** the account's "My New Marketing Service" messaging service.
Sending OTPs from a marketing sender is both miscategorised and a filtering
risk.

## Brand

The approved **Hidden Č** identity is applied. Master pack in
`apps/web/public/brand/`; the mark is inlined as a component on both platforms
(`components/brand-mark.tsx`) so it inherits colour and costs no request. Both
take a `simple` prop — below ~32px the inner path muddies, which is what the
brand book's 16px variant is for.

| Token | Value |
|---|---|
| Annabi | `#800000` |
| Lajvard | `#0047AB` |
| Text | `#14213D` |
| Background | `#F6F1E8` |
| Gold | `#C9A24B` — **accent only, never a surface** |

Type: **Vazirmatn** (Persian) + **Manrope** (Latin). Cormorant Garamond was
removed. Taglines: "Find with confidence." / "با اطمینان پیدا کن."

App icon, splash, Android adaptive layers and the favicon pack are all
regenerated from the real mark. iOS icon is deliberately **not** pre-rounded —
the system masks it and a rounded source gets masked twice.

`themeColor` is exported from `viewport`, not `metadata`. On `metadata` it is
silently ignored — verified against the Next 16 type definitions.

**Known nit:** the supplied `favicon.ico` contains only a 16×16 frame despite
its README listing 16/32/48. Worth regenerating.

## Mobile account journey

The app previously had no way to sign in at all. Now:

- `src/context/auth.tsx` — the single source of session state
- Login, signup, password reset, presented **modally** so signing in never
  loses the user's place in the directory
- An account tab: signed out it explains what an account is for; signed in it
  holds saved listings, note counts and account actions
- Save, personal rating and private notes on a business profile, plus published
  reviews

Signed-out users see the same controls and are sent to sign in, rather than the
controls being hidden — hiding them hides the reason to create an account.

**Still missing:** the review submission form (display works), a full
"my notes" list, in-app profile editing (links to web), and email confirmation
depends on the Supabase auth URLs being configured.

---

# Added 2026-08-14 (evening)

## Verification & claims

- Schema: `businesses.owner_user_id / verification_method / verified_at /
  verified_until / verified_phone / verified_email /
  verification_reminder_stage+sent_at`; `verification_codes` extended with
  `business_id` and business types; plaintext `code` column dropped.
- Logic lives in `apps/web/lib/verification/status.ts` (single source of
  truth: states, 182-day window, `superseded` on contact change, Persian
  digit folding) and `actions.ts` (claim by SMS to the listed number, daily
  cap 5 listings/account, renewal re-runs the proof).
- UI: `components/verification-badge.tsx`, `verification-renewal-banner.tsx`,
  `/claim` route. Owner dashboard queries `created_by` OR `owner_user_id`.
- Reminders: `/api/cron/verification-reminders`, daily 13:00 UTC via
  `vercel.json` crons; stages 30/7/0 descending; **requires `CRON_SECRET`**
  (timing-safe check; refuses to run unset). Wrapped in `withCronRun`.

## First-party telemetry (replaced Sentry — cost)

- `system_errors`: written by `reportQuietFailure` in
  `lib/observability/report.ts` — never awaited, never throws. Kinds cover
  email/SMS unconfigured+failed, `sms_carrier_rejected` (Twilio 30034 class
  = A2P signal), reminder/cron failures, `request_error` via
  `instrumentation.ts` `onRequestError`.
- `cron_runs`: one row per run **including successes** — absence of recent
  rows is the alert; `hoursSinceLastRun()` is the heartbeat read. Both
  tables RLS-on, no policies (service-role only).

## Profile views

`businesses.view_count` + `increment_business_view(uuid)` SECURITY DEFINER
function (the only anon write; no IP/user/timestamp recorded). Counted
client-side by `components/business/view-counter.tsx` because the page is
ISR-cached — server-side would count regenerations, not visitors.

## Analytics

`@vercel/analytics` in the root layout — cookieless, no consent banner.
Search Console: registered (domain property). GA deliberately rejected.

## Imagery pipeline

`scripts/generate-category-images.py` (12 editorial photos) and
`generate-city-images.py` (8 blue-hour city backgrounds) — OpenAI
`gpt-image-2`, locked SYSTEM art-direction blocks, per-slug re-runs.
Served as WebP from `public/images/{categories,cities}/`; masters in
`charana-category-images/` (untracked). DB `categories.image_url` points at
`.webp` (migration 20260828090000).

## Mobile auth deep link

Signup passes `emailRedirectTo: "charana://auth/confirmed"`; that screen
parses fragment tokens, `setSession`s, greets by first name, CTA to profile.
Custom scheme, not Universal Links (free signing can't hold the
entitlement). **Requires `charana://**` in Supabase Redirect URLs.**
Supabase dashboard work (SMTP, sender name, templates, URLs) documented in
`13-supabase-email-templates.md` — pending Farjad.
