# Rebrand — external actions (dashboards, not code)

Nothing in this list can be done from the repository. Ordered by what breaks
if it is skipped. `[BEFORE DEPLOY]` items must be done before the
`rebrand/goplaza` branch reaches production.

## 1. Vercel `[BEFORE DEPLOY]`
- [ ] Add domains `goplaza.ca` (primary) and `www.goplaza.ca` (redirect to apex).
- [ ] Keep `charana.ca` + `www.charana.ca` on the project and set them to
      **308 redirect → goplaza.ca, path-preserving**. Do not remove them —
      SEO equity, installed-app Universal Links and every shared link depend on it.
- [ ] `carana.ca` → same redirect.
- [ ] Env: `NEXT_PUBLIC_BASE_URL=https://goplaza.ca` (Production, Preview, Development).
- [ ] Env: `EMAIL_FROM="GOPLAZA <noreply@charana.ca>"` for now (see §3).
- [ ] Confirm the project's build command / root directory does not pin the
      old workspace name (`--filter=@charana/web`). It is now `@goplaza/web`.
- [ ] Project display name — cosmetic; rename when convenient.

## 2. Supabase Auth `[BEFORE DEPLOY]`
Authentication → URL Configuration:
- [ ] Site URL → `https://goplaza.ca`
- [ ] Redirect URLs — **add**, do not replace:
      `https://goplaza.ca/auth/callback`, `https://goplaza.ca/auth/update-password`,
      `https://goplaza.ca/**`, `goplaza://**`.
      Keep `https://charana.ca/**` and `charana://**` for old links and old installs.
- [ ] Email templates (if customised in the dashboard rather than Resend SMTP): sender name `GOPLAZA`.
- [ ] Run the new migration: `pnpm db:push` (adds `20260830270000_rebrand_goplaza.sql`, data-only).
- [ ] Optional data task, your call: existing generated blog posts contain
      "چارانا" in `blog_posts.body_md`. Left untouched — a bulk replace in prose
      is a content decision.

## 3. Resend (mail)
- [ ] Add and verify `goplaza.ca` as a sending domain (SPF + DKIM).
- [ ] Create/route mailboxes: `hello@`, `support@`, `privacy@`, `partners@`, `noreply@` on goplaza.ca.
- [ ] Then flip `apps/web/lib/data/company.ts` `email.*` and Vercel `EMAIL_FROM`
      to the new addresses, and remove `company.ts` / `.env.example` from the
      allow-list in `scripts/check-brand.mjs`.
- [ ] Until then mail is sent as **GOPLAZA <noreply@charana.ca>** — correct name, old domain.

## 4. Stripe
- [ ] Rename live products "čārana Pro" / "čārana Featured" → "GOPLAZA Pro" /
      "GOPLAZA Featured" (Dashboard → Products). The seed script now writes the
      new names, but it only *creates* when the `charana_plan` metadata lookup
      finds nothing, so existing products keep their name until renamed.
- [ ] Do **not** change the `charana_plan` / `charana_interval` metadata keys.
- [ ] Business/branding settings (statement descriptor, receipt logo/name) → GOPLAZA.

## 5. Twilio
- [ ] SMS bodies now say «کد تایید گوپلازا». If an alphanumeric sender ID or
      messaging-service friendly name says Charana, rename it.

## 6. Expo / EAS / stores
- [ ] EAS project slug stays `charana` (projectId `ddda648e-…`). Renaming would
      orphan the project. Cosmetic display name in expo.dev can change.
- [ ] Bundle id / package `ca.charana.app` stays. A new id = a new app.
- [ ] Next APK/store build: `expo prebuild --clean` so the regenerated native
      projects pick up the display name, icons, adaptive-icon background and
      the second URL scheme. `app.json` is already at **1.3.0**.
- [ ] When that 1.3.0 build exists, update `apps/web/lib/data/releases.ts` in
      one commit: `APP_VERSION`, `STORES.apkDirect` / `apkVersion` /
      `apkSizeMb` / `apkBuiltAt`, and a new `RELEASES` entry. Until then the
      download page correctly still offers 1.2.0 — the last binary that exists.
- [ ] Store listings (when they exist): name GOPLAZA, new icon, new screenshots.
- [ ] Android App Links: `assetlinks.json` is served from goplaza.ca automatically
      once the domain points at Vercel; the app declares both hosts.
- [ ] iOS Universal Links: AASA is served from goplaza.ca; requires the paid
      Apple account (unchanged blocker) and `APPLE_TEAM_ID`.

## 7. Google
- [ ] Search Console: add property `goplaza.ca`; use **Change of Address** from
      `charana.ca` once the 308 is live.
- [ ] Maps API key: add `goplaza.ca/*` to HTTP referrer restrictions.
- [ ] Analytics/Tag Manager if any: property name.

## 8. Social / brand handles
- [ ] The X/Twitter handle `@charana` and display name "Charana"
      (docs/03-security.md) — rename or register `@goplaza`.

## 9. Brand assets `[ASK FARJAD]`
- [ ] Supply the **master vector** of the G-mark and lockup. Everything in
      `apps/web/public/brand/goplaza-*` and both `brand-mark.tsx` files is
      geometry traced from the raster board; replace the two path strings in
      `scripts/generate-brand-assets.mjs` + the two components, run the script.
- [ ] Wordmark font: the board's geometric sans is not in the repo. Header/
      footer set GOPLAZA in Manrope 800 with tracking; the lockup SVG uses
      Montserrat with system fallback. Confirm the licensed face.

## 10. Notion
- [ ] Rename the 🧿 Charana workspace/page titles when convenient.
