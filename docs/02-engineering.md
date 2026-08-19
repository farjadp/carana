# Engineering

How the system is put together: repository, data, deployment and the
services it talks to. Read 01-product first if you want to know *what* it is.

---

## Architecture

### Product

GOPLAZA is a Persian-first directory of Iranian businesses in Canada, operated by
**Ashavid Inc.** (Toronto, Ontario). Consumers search for Persian-speaking
lawyers, doctors, restaurants, realtors. Business owners pay for featured
placement and advertising — a B2B advertising service, which is why the App
Store's in-app-purchase rules do not apply (see `05-mobile.md`).

### Repository shape

```
goplaza/  (folder on disk is still Charana/)
├── apps/
│   ├── web/          Next.js 16, App Router — the whole website + admin
│   └── mobile/       Expo SDK 57, Expo Router — consumer app
├── packages/
│   └── core/         Everything genuinely shared by both platforms
├── supabase/
│   └── migrations/   16 SQL migrations, the schema's source of truth
└── scripts/          One-off operational scripts (import, logo re-hosting)
```

Turborepo + pnpm workspaces. `pnpm dev` runs both apps; `pnpm dev:web` and
`pnpm dev:mobile` run one.

### What lives in `packages/core`

Deliberately small. Only things that are true for both platforms:

| File | Contents |
|---|---|
| `database.types.ts` | Generated from the live schema — `pnpm gen:types` |
| `business-schema.ts` | Zod schemas for the 7-step onboarding form |
| `listing-status.ts` | The listing state machine and the private-column list |
| `provinces.ts` | Province taxonomy with Persian names |
| `import-normalize.ts` | Cleaning rules for scraped directory data |
| `slug.ts` | Persian-aware slugify |

A `packages/api` layer was **not** extracted. With no second consumer for it
yet, that would have been speculation. Pull pieces out as mobile screens
actually need them.

### Data flow

```
Browser ──► Next.js server component ──► Supabase (RLS as the caller)
                    │
                    └─► server action ──► Supabase (RLS, or service role
                                           after an explicit role check)

Mobile  ──────────────────────────────► Supabase (anon key, RLS only)
```

The mobile app talks to Supabase **directly**. It never passes through Next.js.
That single fact drives the whole security model — see `02-security.md`.

### Web routes

**Public:** `/`, `/categories`, `/categories/[slug]`, `/provinces`,
`/provinces/[slug]`, `/cities`, `/cities/[slug]`, `/businesses`,
`/businesses/[slug]`, plus the marketing and legal pages.

**Auth:** `/auth/login`, `/auth/signup`, `/auth/forgot-password`,
`/auth/update-password`, `/auth/callback`, `/auth/logout`.

**Owner:** `/dashboard`, `/dashboard/business`, `/dashboard/business/new`,
`/dashboard/business/[id]/edit`, `/dashboard/verify-contact`, `/profile`.

**Admin:** `/admin/login`, `/admin` and the sections under it — listings, users,
categories, reviews, logs, and the CSV importer.

**Machine:** `/robots.txt`, `/sitemap.xml`,
`/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`.

### Mobile screens

Tabs: home, categories, location (province → city), search.
Stack: `/categories/[slug]`, `/cities/[city]`, `/provinces/[slug]`,
`/business/[slug]`.

Auth, saving, private notes and reviews are **not built on mobile yet**. Owner
dashboard and admin are deliberately web-only and should stay that way — the
7-step onboarding form is laptop work.

### Deliberate decisions worth knowing

**RLS is the authorization layer, not the server actions.** Anything enforced
only in a server action does not exist for the mobile client.

**Public queries list their columns explicitly.** Postgres does not apply RLS
per column, so `select("*")` on `businesses` returns the verification fields.
There is a `PRIVATE_BUSINESS_COLUMNS` constant in `packages/core` naming them.

**The owner dashboard and admin stay on web.** Mobile is consumer-only, which
also keeps every payment surface out of the app and away from App Store
in-app-purchase rules.

---

## Database

Supabase Postgres. Project ref `flrpuzmqsqgrfutzoyop`.
Schema source of truth is `supabase/migrations/` — 16 files, all applied,
history in sync (`npx supabase db push --dry-run` reports `upToDate: true`).

### Live data, 2026-08-24

| | |
|---|---|
| businesses | 677, all `PUBLISHED` |
| — with a real city | 268 |
| — with `city = 'نامشخص'` | 409 (see `the Data import section below`) |
| categories | 12, all active |
| profiles | 2 |
| public_reviews | 0 |
| logos on our storage | 618 |
| logos using the placeholder | 59 |
| logos hotlinked elsewhere | **0** |

### Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user. Role, contact, verification timestamps. Created by trigger on `auth.users` insert. |
| `businesses` | Listings. Status machine, contact, media, hours, services, branches. |
| `business_memberships` | Who may manage which listing. Built, unused. |
| `business_claims` | Claim requests. Built, unused. |
| `categories` | Admin-managed taxonomy. 12 rows. |
| `user_business_interactions` | Private per-user notes, ratings, saved state, media. |
| `public_reviews` | Public reviews, moderated before publication. |
| `business_change_reviews` | Audit trail of every edit-classification decision. |
| `user_activity_logs` | Login, logout, role change, moderation. Includes IP. |
| `verification_codes` | Hashed contact OTPs. Server-only, no client policy. |

### Listing state machine

```
DRAFT ──▶ SUBMITTED ──▶ APPROVED / PUBLISHED
            ▲  │
            │  ├──▶ NEEDS_CHANGES ──┐
            └──┤                     │
               └──▶ REJECTED ────────┘
```

An owner may only ever leave a row in `DRAFT` or `SUBMITTED`. Moving to
`APPROVED` or `PUBLISHED` is admin-only, enforced in RLS.

Editing a row that is already live is blocked at the RLS level entirely; it
goes through the server action and the change classifier.

### Helper functions

All are `SECURITY DEFINER` with `search_path = public`. This matters: without
it, `is_admin()` reads `public.profiles`, whose own policies call `is_admin()`,
and the recursion made it return false — silently disabling every admin policy
in the schema.

| Function | Returns |
|---|---|
| `is_admin(uuid)` | true for `admin` or `moderator` |
| `has_business_access(business, user)` | membership check |
| `current_user_role()` | the caller's role, for the "role must not change" check |
| `business_current_status(uuid)` | pre-update status, used inside `WITH CHECK` |
| `review_current_status(uuid)` | same, for reviews |

The `*_current_status` helpers are `STABLE`, so inside an `UPDATE` they see the
snapshot from statement start and return the **old** value. That is what lets a
policy say "the status may stay as it is, or move to one of these".

### Migrations

| File | What it did |
|---|---|
| `20260811_auth_roles` | First schema: profiles, businesses, memberships, claims, RLS |
| `20260812_activity_logs` | Audit log |
| `20260813_businesses_expansion` | Status enum, ~30 listing columns |
| `20260813010000_services_branches` | JSONB services and branches |
| `20260813020000_storage_buckets` | `businesses` bucket |
| `20260814_user_interactions` | Interactions and public reviews |
| `20260815_user_profiles_expansion` | Mobile, birth date, avatar |
| `20260816_categories` | Categories table + 10 seed rows |
| `20260817_fix_approved_status` | Data fix, APPROVED → PUBLISHED |
| `20260818_interaction_media` | Private media + `user-media` bucket |
| `20260818010000_add_business_media` | `social_media` column |
| `20260819_contact_verification` | OTP table |
| `20260820_security_hardening` | **The big one** — see `02-security.md` |
| `20260821_change_review` | Change-review table, closed the edit bypass |
| `20260822_categories_v2` | Added `automotive` and `digital-it`, new artwork paths |
| `20260823_province_backfill` | Province normalisation, published the backlog, indexes |

### Two rules learned the hard way

**Never apply SQL by hand in the dashboard.** The migration history table drifts
from the real schema, and the next `db:push` tries to replay everything from the
beginning. That is what had happened here: 13 migrations were applied by hand
and the history table was empty. Repairing it took `supabase migration repair`
plus a column-by-column comparison against the live database, which turned up
**two migrations that had never actually run** — contact verification and
`businesses.social_media`.

**Migration versions must be unique.** Three files shared the prefix `20260813`
and two shared `20260818`. `db:push` failed on a duplicate primary key in
`schema_migrations`. Use a full `YYYYMMDDHHMMSS_name.sql` prefix.

### Commands

```bash
pnpm db:push          # apply pending migrations
pnpm db:diff          # see drift
pnpm gen:types        # regenerate packages/core/src/database.types.ts
```

Regenerate and commit the types after any schema change — both apps import them.

---

## Deployment

### Vercel

The repo is a pnpm + Turborepo monorepo. Point the Vercel project at
**`apps/web`** and let the Next.js preset do the rest — `apps/web/vercel.json`
carries only redirects and headers, no build wiring.

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Framework Preset | Next.js (auto-detected) |
| Build Command | leave empty — Vercel runs `next build` |
| Install Command | leave empty — Vercel installs from the workspace root |
| Node version | 22.x |

Vercel detects the pnpm workspace and Turborepo on its own and installs from
the repository root, so `apps/web` can still import `/core`.

Do **not** set a custom `outputDirectory`. With the Next.js preset Vercel uses
its own builder and resolves `.next` relative to the Root Directory; a manual
override pointed it somewhere the builder never looks, which produced a build
that succeeded and then failed to deploy.

#### Environment variables

Set these in Vercel → Settings → Environment Variables, for **Production** and
**Preview**:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | safe to expose |
| `SUPABASE_URL` | |
| `SUPABASE_PUBLISHABLE_KEY` | |
| `SUPABASE_SECRET_KEY` | **server only** — never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_JWKS_URL` | |
| `OPENAI_API_KEY` | server only |
| `RESEND_API_KEY` | server only — transactional email |
| `TWILIO_ACCOUNT_SID` | server only |
| `TWILIO_API_KEY_SID` | server only |
| `TWILIO_API_KEY_SECRET` | server only |
| `TWILIO_FROM_NUMBER` | `+12495549408` — the Canadian number |
| `EMAIL_FROM` | e.g. `GOPLAZA <noreply@charana.ca>` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | restrict by HTTP referrer in Google Cloud |
| `NEXT_PUBLIC_BASE_URL` | `https://goplaza.ca` — the build fails without it |
| `APPLE_TEAM_ID` | once the Apple account exists |
| `ANDROID_SHA256_FINGERPRINT` | after the first EAS Android build |

`SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` must be absent or `false` in
production. It creates pre-confirmed accounts through the admin API.

#### Domains

- `goplaza.ca` — primary
- `www.goplaza.ca` — redirect to apex
- `carana.ca`, `www.carana.ca` — add to the same project; `vercel.json`
  308-redirects them to `goplaza.ca` so the directory is never indexed twice

### Supabase

#### Migrations

Migration history is in sync with the live schema. To apply new work:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
pnpm db:push
```

Two rules learned the hard way:

1. **Never apply SQL by hand in the dashboard.** The history table then drifts
   from the schema, and the next `db:push` tries to replay everything from the
   beginning. Repairing that drift is what `supabase migration repair` is for.
2. **Migration versions must be unique.** Three files once shared the prefix
   `20260813`, which broke `db:push` outright. Use a full
   `YYYYMMDDHHMMSS_name.sql` prefix.

#### Auth configuration

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://goplaza.ca`
- **Redirect URLs**:
  - `https://goplaza.ca/auth/callback`
  - `https://goplaza.ca/auth/update-password`
  - `goplaza://**` and `charana://**` — required for the mobile app (new + legacy scheme)
  - `http://localhost:3000/**` — local development

Password reset and email confirmation links break without these.

#### Types

After any schema change, regenerate the shared types and commit them:

```bash
pnpm gen:types
```

They land in `packages/core/src/database.types.ts` and are consumed by both web
and mobile.

### Email

Transactional mail goes through **Resend**. `goplaza.ca` is already a verified
sending domain, so mail leaves from `noreply@charana.ca` with SPF/DKIM in place.

What the app sends today:

| Message | Trigger |
|---|---|
| Verification code | user requests email verification |
| Listing published | admin approves a listing |
| Listing needs changes | admin sets NEEDS_CHANGES or REJECTED |
| Contact form | someone submits the form on /contact |

**Supabase auth emails are separate.** Confirmation and password-reset mail
still goes through Supabase's built-in sender, which is rate limited to a
handful per hour and sends from a supabase.co address. Point it at Resend:

Supabase Dashboard → Project Settings → Authentication → SMTP Settings

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key |
| Sender email | `noreply@charana.ca` |
| Sender name | `GOPLAZA` |

Until that is done, signup confirmation will throttle as soon as more than a
few people register in an hour.

### SMS

Phone verification sends through **Twilio**, using an API Key rather than the
account auth token so the credential can be revoked on its own.

Two numbers are on the account. `+1 249 554 9408` is an **Ontario** number and
is the configured sender — a local number delivers better to a Canadian
audience than the Michigan one.

The destination always comes from `profiles.mobile_number`, never from the
request. A caller must not be able to aim a verification code at an arbitrary
handset.

Phone numbers are normalised to E.164 before sending, including Persian and
Arabic-Indic digits: the product runs RTL, the keyboard opens in Persian, and a
number typed there contains none of the characters an ASCII digit check looks
for.

**Not yet checked:** whether the account needs Canadian A2P registration for
application-to-person traffic at volume. Low volume works; watch for
`30034`-class errors as signups grow.

### Post-deploy checklist

- [ ] `https://goplaza.ca/robots.txt` resolves and points at the sitemap
- [ ] `https://goplaza.ca/sitemap.xml` lists published businesses only
- [ ] `https://goplaza.ca/.well-known/apple-app-site-association` returns JSON
      with the real `APPLE_TEAM_ID`
- [ ] `https://carana.ca` redirects to `https://goplaza.ca`
- [ ] Signup → confirmation email → callback completes
- [ ] Password reset email links to the production domain, not localhost
- [ ] An anonymous request returns zero `DRAFT` listings

### Known limitation

Rate limiting for the AI endpoints (`lib/utils/rate-limit.ts`) is in-memory. It
resets on deploy and is not shared between serverless instances, so it stops
accidental hammering but not a determined attacker. Move it to Supabase or
Upstash Redis before opening the AI features to a wide audience.

---

## Integrations

Added after the original handover was written. All live and verified.

### Email — Resend

`goplaza.ca` is a **verified sending domain**, so mail leaves from
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

### SMS — Twilio

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
`06-gotchas.md`; this is the same trap that broke sign-in.

**Not yet checked:** Canadian A2P registration for application-to-person
traffic at volume. Low volume works. Watch for `30034`-class errors as signups
grow.

**Not used:** the account's "My New Marketing Service" messaging service.
Sending OTPs from a marketing sender is both miscategorised and a filtering
risk.

### Brand

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

### Mobile account journey

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

### Verification & claims

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

### First-party telemetry (replaced Sentry — cost)

- `system_errors`: written by `reportQuietFailure` in
  `lib/observability/report.ts` — never awaited, never throws. Kinds cover
  email/SMS unconfigured+failed, `sms_carrier_rejected` (Twilio 30034 class
  = A2P signal), reminder/cron failures, `request_error` via
  `instrumentation.ts` `onRequestError`.
- `cron_runs`: one row per run **including successes** — absence of recent
  rows is the alert; `hoursSinceLastRun()` is the heartbeat read. Both
  tables RLS-on, no policies (service-role only).

### Profile views

`businesses.view_count` + `increment_business_view(uuid)` SECURITY DEFINER
function (the only anon write; no IP/user/timestamp recorded). Counted
client-side by `components/business/view-counter.tsx` because the page is
ISR-cached — server-side would count regenerations, not visitors.

### Analytics

`@vercel/analytics` in the root layout — cookieless, no consent banner.
Search Console: registered (domain property). GA deliberately rejected.

### Imagery pipeline

`scripts/generate-category-images.py` (12 editorial photos) and
`generate-city-images.py` (8 blue-hour city backgrounds) — OpenAI
`gpt-image-2`, locked SYSTEM art-direction blocks, per-slug re-runs.
Served as WebP from `public/images/{categories,cities}/`; masters in
`charana-category-images/` (untracked). DB `categories.image_url` points at
`.webp` (migration 20260828090000).

### Mobile auth deep link

Signup passes `emailRedirectTo: "goplaza://auth/confirmed"` (via `brand.scheme`); that screen
parses fragment tokens, `setSession`s, greets by first name, CTA to profile.
Custom scheme, not Universal Links (free signing can't hold the
entitlement). **Requires `goplaza://**` (and `charana://**` for old builds) in Supabase Redirect URLs.**
Supabase dashboard work (SMTP, sender name, templates, URLs) documented in
`13-supabase-email-templates.md` — pending Farjad.

---

## Auth email templates

Paste-ready replacements for the default Supabase auth emails, which arrive
in Persian users' inboxes as English text from "Supabase Auth" — anonymous,
unbranded, and (combined with the shared IP of the built-in sender) reliably
in the junk folder.

**Where:** Supabase dashboard → Authentication → **Email Templates**. Each
template below goes in its named tab. Set the subject line too — the subject
field is above the HTML editor.

These match the shell in `apps/web/lib/email/templates.ts`: cream ground,
maroon brand, `dir="rtl"` on the body (the attribute Outlook actually
honours), everything inline because mail clients strip `<style>`.

`{{ .ConfirmationURL }}` is Supabase's variable — leave it exactly as is.

Sender identity ("Supabase Auth" → GOPLAZA) is **not** set here; it comes from
the SMTP settings. See `12-integrations.md` and the SMTP mission in Notion.

---

### Confirm signup

**Subject:** `تایید ایمیل شما در گوپلازا`

```html
<div dir="rtl" style="margin:0;padding:0;background:#f6f1e8;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;color:#800000;">GOPLAZA</span>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;color:#14213d;font-size:15px;line-height:2;text-align:right;">
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">به گوپلازا خوش آمدید. برای فعال شدن حسابتان کافی است روی دکمه‌ی زیر بزنید:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#800000;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:bold;font-size:15px;">تایید ایمیل و ورود</a>
      </div>
      <p style="margin:0 0 10px;color:#5f6472;font-size:13px;">اگر دکمه کار نکرد، این نشانی را در مرورگر باز کنید:</p>
      <p style="margin:0 0 18px;font-size:12px;direction:ltr;text-align:left;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0047ab;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:0;color:#5f6472;font-size:13px;">اگر شما در گوپلازا ثبت‌نام نکرده‌اید، این ایمیل را نادیده بگیرید — بدون این تایید هیچ حسابی فعال نمی‌شود.</p>
    </div>
    <div style="text-align:center;margin-top:20px;color:#5f6472;font-size:12px;line-height:1.9;">
      <div>گوپلازا — دایرکتوری کسب‌وکارهای ایرانی کانادا</div>
      <div style="margin-top:6px;">
        <a href="https://goplaza.ca/privacy" style="color:#5f6472;">حریم خصوصی</a> ·
        <a href="https://goplaza.ca/support" style="color:#5f6472;">پشتیبانی</a>
      </div>
    </div>
  </div>
</div>
```

---

### Reset password

**Subject:** `بازنشانی رمز عبور گوپلازا`

```html
<div dir="rtl" style="margin:0;padding:0;background:#f6f1e8;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;color:#800000;">GOPLAZA</span>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;color:#14213d;font-size:15px;line-height:2;text-align:right;">
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">درخواست بازنشانی رمز عبور برای حساب شما ثبت شد. برای انتخاب رمز جدید روی دکمه‌ی زیر بزنید:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#800000;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:bold;font-size:15px;">انتخاب رمز جدید</a>
      </div>
      <p style="margin:0;color:#5f6472;font-size:13px;">اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید — رمز شما بدون این لینک تغییر نمی‌کند.</p>
    </div>
    <div style="text-align:center;margin-top:20px;color:#5f6472;font-size:12px;line-height:1.9;">
      <div>گوپلازا — دایرکتوری کسب‌وکارهای ایرانی کانادا</div>
      <div style="margin-top:6px;">
        <a href="https://goplaza.ca/privacy" style="color:#5f6472;">حریم خصوصی</a> ·
        <a href="https://goplaza.ca/support" style="color:#5f6472;">پشتیبانی</a>
      </div>
    </div>
  </div>
</div>
```

---

### Magic link — only if magic-link login is ever enabled

Same shell; headline «ورود به گوپلازا», button label «ورود», and the
"ignore this" line: «اگر شما درخواست ورود نداده‌اید، این ایمیل را نادیده
بگیرید.»

---

### The other half of the fix

Templates fix how the mail **looks**. Three more dashboard settings fix
everything else that was wrong with the screenshot from 14 August:

| Problem | Fix | Where |
| --- | --- | --- |
| Lands in junk | Custom SMTP through Resend (own domain, own reputation) | Project Settings → Auth → SMTP |
| Sender reads "Supabase Auth" | Sender name `GOPLAZA`, sender `noreply@charana.ca` | Same SMTP form |
| Link opens localhost | Site URL `https://goplaza.ca` | Auth → URL Configuration |
| App signups should reopen the app | Add `goplaza://**` and `charana://**` to Redirect URLs | Auth → URL Configuration |

The app side is already done in code: mobile signup passes
`emailRedirectTo: "goplaza://auth/confirmed"`, and that screen greets the
person by name, hands them a session, and points them at their profile.

---

## Data import

### What is in the database

677 published listings, imported from a 678-row CSV export of an existing
Persian directory (IranJavan, Greater Toronto).

| | |
|---|---|
| Rows parsed | 678 |
| After de-duplication | 676 |
| Published | 677 (676 imported + 1 pre-existing test row) |
| With a real city | 268 |
| With `city = 'نامشخص'` | **409** |

### The 409 rows with no city

The source export had no city for 410 rows and no address for 405 of them.
They are all in Ontario and published — they appear on the province page,
in categories, and in search, but on **no city page**, because the city
listings filter out `نامشخص`.

This is the largest outstanding data task. Filling those cities in would move
409 listings onto city pages, which is where most local search traffic lands.

There is no admin screen for it yet. Suggested: a queue that shows name,
description and phone and asks only for a city — a person could clear a few
hundred in an evening.

### What the import actually fixes

The CSV parser and the AI categoriser were both fine. Three defects in the
field mapping were producing bad data without ever raising an error:

**`website` fell back to the source's link column.** Only 9 rows had a real
website. For 650 rows the fallback was the business's profile page **on
iranjavan.org**. Importing that would have published a competing directory as
each business's own website. It now goes into a provenance note instead.

**Slugs were built with a function that strips non-ASCII.** Every Persian name
collapsed to `business`, `business-1`, `business-2`. For an SEO-driven
directory that is fatal. The project's existing Persian-aware `slugify` moved
into `packages/core` and is used now: `/نادر-شیرانیان`.

**Cities were dirty.** `TORONTO` vs `Toronto` vs `Toronto Ontario` counted as
three cities, and the literal string `Enter a location` had leaked in from a
form. Normalised to 23 canonical cities with province derived.

Also fixed: multi-number phone fields (`905-…; 416-…`) now keep the first, and
marketing copy sitting in the address column is dropped unless it contains a
digit.

### Categories

12 categories. `automotive` and `digital-it` were added during the import —
the classifier was pushing web design into "رویدادها" for want of anywhere
better. Those two took 94 listings between them.

Distribution after import:

```
skilled-trades       175      medical-clinic        47
real-estate-mortgage  81      events                42
legal-immigration     71      digital-it            35
accounting-tax        70      beauty-wellness       23
automotive            59      restaurant-cafe       13
education             50      iranian-grocery       10
```

### Logos

618 images were downloaded from the source server and re-hosted into our own
Supabase storage bucket under `imported/<business-id>/logo.<ext>`. Four could
not be fetched — two oversized, one AVIF that failed twice — and use the
placeholder. 59 rows never had a logo.

**Nothing points at an external host any more.** Hotlinking would have broken
the moment the source reorganised, and every page view leaked a referrer to a
competing directory.

### Running another import

```bash
npx tsx scripts/import-businesses.mts <file.csv>            # dry run
npx tsx scripts/import-businesses.mts <file.csv> --commit   # apply
```

Dry run prints the full plan: row counts, the published/draft split, and the
category distribution. Nothing is written without `--commit`.

Policy: rows with a city are published; rows without are inserted as DRAFT so
the public directory stays clean until someone fills the location in. The 409
already in the database were later moved to Ontario and published deliberately,
once province-level browsing existed to hold them.

Re-hosting logos:

```bash
npx tsx scripts/rehost-logos.mts             # dry run, shows hosts
npx tsx scripts/rehost-logos.mts --commit
```

Idempotent — skips the placeholder and anything already re-hosted, so a re-run
only retries what genuinely still lives elsewhere.

### Scraped directories (17 Aug, `2384aa5` → `34185f5`)

```bash
npx tsx scripts/scrape-hamvatan.mts --out hamvatan-toronto.json              # hamvatan.org
npx tsx scripts/scrape-directories.mts --source all --out-dir .              # jabeh, taablo, bazaarche, farsilink, iranbusiness
npx tsx scripts/import-listings.mts <source>.json --report <source>-report.json          # dry run
npx tsx scripts/import-listings.mts <source>.json --report <source>-report.json --commit
npx tsx scripts/rehost-logos.mts --commit                                    # repeat until 0 remain (1000-row cap)
```

Every scraper emits `SourceListing[]` (`scripts/lib/source-listing.ts`) and
writes only what the source renders — no emails, logos or hours are inferred.
`import-listings.mts` is idempotent (a row already carrying the source URL in
`verification_notes` is matched first) and merges by, in order: unique
website host or instagram handle; phone + a non-generic name token; phone-only
or shared-host matches go to gpt-4o with both full records and merge only on
a confident yes ("unsure" = held, not inserted). Enrichment fills empty
columns only. City: street → postal FSA (`cityFromPostalCode`) → the address's
"…, City, ON" segment → the source's city label; no city → DRAFT. Province is
never defaulted. Reports list every merge, insert, hold and skipped
outside-Canada row.

Traps met and encoded (see `06-gotchas`): platform hosts shared by many agents,
category words counted as name overlap, PostgREST's 1000-row cap, paging by
`created_at`, hamvatan's ignored `?page=`, taablo's Kafka lorem ipsum.

### Provenance and takedown### Provenance and takedown

Imported rows carry `verification_notes` of the form
`imported from <source url>`. The privacy policy discloses that some listings
were gathered from public sources, and `/support` tells owners how to claim,
correct or remove theirs. Expect requests; honour them quickly.
