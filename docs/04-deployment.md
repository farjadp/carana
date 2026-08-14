# Deployment runbook

## Current state

**Live:** https://charana.ca — deploying from `main` on every push.
**Vercel project:** `carana`, team `ashavidproject`, plan Pro.
**Last verified:** all routes 200, 404 page works, sitemap lists 677 businesses
and zero drafts, security headers present.

## Vercel settings

These were wrong and are now fixed. If a deployment ever fails again, check
these first — the dashboard overrides beat anything in the repo.

| Setting | Value |
|---|---|
| Root Directory | `apps/web` |
| Framework Preset | Next.js |
| Build Command | **empty** (no override) |
| Install Command | **empty** (no override) |
| Output Directory | **empty** (no override) |
| Include files outside root | Enabled |
| Node | 24.x |

`apps/web/vercel.json` carries only headers now. No build wiring, and no host
redirects — those are configured at the domain level.

### Environment variables

Set for Production, Preview **and** Development.

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | |
| `SUPABASE_PUBLISHABLE_KEY` | |
| `SUPABASE_SECRET_KEY` | **server only** — never prefix with `NEXT_PUBLIC_` |
| `SUPABASE_JWKS_URL` | |
| `OPENAI_API_KEY` | server only |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | restrict by HTTP referrer in Google Cloud |
| `NEXT_PUBLIC_BASE_URL` | optional — falls back to Vercel's own domain vars |
| `APPLE_TEAM_ID` | once the Apple account exists |
| `ANDROID_SHA256_FINGERPRINT` | after the first EAS Android build |

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are **not**
required — `next.config.ts` promotes the unprefixed values into the public
namespace at build time. Setting them explicitly still wins.

**`SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` must be absent or `false`
in production.** It creates pre-confirmed accounts through the admin API.

**`GEMINI_API_KEY` is set on Vercel and read by nothing.** Delete it.

### Domains

| Domain | Behaviour |
|---|---|
| `charana.ca` | canonical, serves the site |
| `www.charana.ca` | 308 → charana.ca |
| `carana.ca` | 308 → charana.ca — **DNS not pointed yet** |
| `www.carana.ca` | 308 → charana.ca — **DNS not pointed yet** |

Redirects are configured on the Vercel domains, not in `vercel.json`. Putting
them in both directions caused a redirect loop where `/` worked and every other
path bounced.

**To finish carana.ca:** point its nameservers at Vercel in the registrar. The
redirect is already configured and will work as soon as DNS resolves.

## Supabase auth configuration — NOT DONE

**Signup and password reset are broken in production until this is set.**

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://charana.ca`
- **Redirect URLs:**
  - `https://charana.ca/auth/callback`
  - `https://charana.ca/auth/update-password`
  - `charana://**` (mobile)
  - `http://localhost:3000/**` (local dev)

## Deploying

Push to `main`. Vercel builds automatically.

To deploy from the terminal (the CLI is already linked to the project):

```bash
npx vercel --prod --yes
```

## Post-deploy checks

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://charana.ca/
curl -s https://charana.ca/robots.txt
curl -s https://charana.ca/sitemap.xml | grep -c "<url>"
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.charana.ca/privacy
```

Expect 200, a robots file naming `https://charana.ca`, ~720 sitemap URLs, and a
308 from www to the apex.

## Note on preview URLs

Deployment Protection is on, so `*.vercel.app` URLs sit behind Vercel SSO. Fine
for the production domain, but anyone you send a preview link to needs access
to the Vercel team.
