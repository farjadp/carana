# Deployment

## Vercel

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

### Environment variables

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
| `EMAIL_FROM` | e.g. `čārana <noreply@charana.ca>` |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | restrict by HTTP referrer in Google Cloud |
| `NEXT_PUBLIC_BASE_URL` | `https://charana.ca` — the build fails without it |
| `APPLE_TEAM_ID` | once the Apple account exists |
| `ANDROID_SHA256_FINGERPRINT` | after the first EAS Android build |

`SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` must be absent or `false` in
production. It creates pre-confirmed accounts through the admin API.

### Domains

- `charana.ca` — primary
- `www.charana.ca` — redirect to apex
- `carana.ca`, `www.carana.ca` — add to the same project; `vercel.json`
  308-redirects them to `charana.ca` so the directory is never indexed twice

## Supabase

### Migrations

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

### Auth configuration

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://charana.ca`
- **Redirect URLs**:
  - `https://charana.ca/auth/callback`
  - `https://charana.ca/auth/update-password`
  - `charana://**` — required for the mobile app
  - `http://localhost:3000/**` — local development

Password reset and email confirmation links break without these.

### Types

After any schema change, regenerate the shared types and commit them:

```bash
pnpm gen:types
```

They land in `packages/core/src/database.types.ts` and are consumed by both web
and mobile.

## Email

Transactional mail goes through **Resend**. `charana.ca` is already a verified
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
| Sender name | `čārana` |

Until that is done, signup confirmation will throttle as soon as more than a
few people register in an hour.

## SMS

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

## Post-deploy checklist

- [ ] `https://charana.ca/robots.txt` resolves and points at the sitemap
- [ ] `https://charana.ca/sitemap.xml` lists published businesses only
- [ ] `https://charana.ca/.well-known/apple-app-site-association` returns JSON
      with the real `APPLE_TEAM_ID`
- [ ] `https://carana.ca` redirects to `https://charana.ca`
- [ ] Signup → confirmation email → callback completes
- [ ] Password reset email links to the production domain, not localhost
- [ ] An anonymous request returns zero `DRAFT` listings

## Known limitation

Rate limiting for the AI endpoints (`lib/utils/rate-limit.ts`) is in-memory. It
resets on deploy and is not shared between serverless instances, so it stops
accidental hammering but not a determined attacker. Move it to Supabase or
Upstash Redis before opening the AI features to a wide audience.
