# Rebrand complete — čārana → GOPLAZA

Branch `rebrand/goplaza` · 2026-08-18 · 206 files in the diff.
Companions: `REBRAND_AUDIT.md` (what was found), `REBRAND_PLAN.md` (decisions
D1–D6), `REBRAND_EXTERNAL_ACTIONS.md` (dashboards). Read those for the why;
this file is the what.

## 1. Summary

Every user-visible surface — web, mobile, email, SMS, PWA, metadata, JSON-LD,
llms.txt — now says **GOPLAZA** (Latin) / **گوپلازا** (in Persian sentences),
reads its brand facts from one module, carries the new burgundy and the new
G-mark, and points at `https://goplaza.ca`. Nothing that identifies the
installed app, live data or third-party records was renamed. Typecheck, web
build, expo config and a repo-wide brand check pass. Production becomes
GOPLAZA when the external actions are done — the code is ready, the
dashboards are not.

## 2. Files changed (by area)

| area | files | note |
|---|---|---|
| `packages/core` | `src/brand.ts` (new), `index.ts`, `plans.ts`, `owner-identity.ts`, `verification-status.ts`, `package.json` | brand module; `@goplaza/core` |
| `apps/web/app` | ~75 pages/routes | copy, metadata, titles, JSON-LD, llms, feed |
| `apps/web/components` | 12 | header/footer wordmark, BrandMark, auth panel, verification badge, vanity URL |
| `apps/web/lib` | 19 | `data/company.ts`, email templates + sender, SMS, SEO, blog prompts, stripe |
| `apps/web/public` | favicons, touch icons, `brand/goplaza-*.svg` (+6), old `brand/charana-*` (−6) | |
| `apps/mobile` | `app.json`, `app.config.ts`, `assets/images/*` (6 regenerated), `src/**` (30) | display name, schemes, applinks, icons, copy, origins |
| `supabase/migrations` | `20260830270000_rebrand_goplaza.sql` (new) | data-only |
| `scripts` | `generate-brand-assets.mjs` (new), `check-brand.mjs` (new), UA strings, Stripe product names, art-direction hex | |
| root | `package.json`, `pnpm-lock.yaml`, `.env.example`, `README`, `ARCHITECTURE`, `DEPLOYMENT`, `CLAUDE.md`, `.claude/launch.json` | |
| `docs/` | 00–05, 06 (+1 gotcha), 07 (+entry), 08, 09 | |

## 3. User-facing changes

- Wordmark GOPLAZA (GO burgundy, PLAZA navy) in header, footer, auth panel,
  admin sidebar, mobile auth/home; G-mark replaces the Hidden Č everywhere,
  including 404, empty states, loading, hero, profile breadcrumbs.
- Tagline: «کشف کن. وصل شو. رشد کن.» / "Discover. Connect. Grow." (hero H1,
  mobile footer, manifest, brand page).
- ~200 Persian strings: «چارانا» → «گوپلازا» (team, reviewer default, badges,
  onboarding, edit form, claim, jobs, blog, features, pricing, legal metadata…).
- `/about` name paragraph and the whole `/story` brand page rewritten for
  the G-mark identity; ZIP download removed.
- Titles `{Page} | GOPLAZA`, home `GOPLAZA | …`, admin titles de-duplicated.
- `GoPlaza.ca/b/…` shown for vanity URLs.

## 4. Technical changes

- `brand` + `brandUrl()` exported from `@goplaza/core`; `company.ts` derives
  `brand`/`brandFa`/`tagline` from it and gains `email.noreply`.
- Workspace packages `@charana/{core,web,mobile}` → `@goplaza/*` (root
  `goplaza`); imports, `transpilePackages`, turbo filters, lockfile, launch.json.
- `--annabi`/`colors.annabi` `#800000` → `#7A1831`; `#5c0000` → `#5A1124`;
  `rgba(128,0,0,…)` → `rgba(122,24,49,…)`; `themeColor`/`theme_color`;
  Android adaptive-icon background → burgundy. Semantic colours untouched.
- Wordmark CSS: `.brand-name` uses `--font-latin`, tracked caps, `b` = GO.
- Email templates: 12 hard-coded origins → `brand.url`; sender display name
  follows `company.brand` (= GOPLAZA); address unchanged (see §11).
- Mobile: every `"https://charana.ca"` fallback → `brand.url`
  (`EXPO_PUBLIC_API_URL` still wins); `emailRedirectTo` → `${brand.scheme}://auth/confirmed`.
- JSON-LD Organization name/logo; PropertyValue `charana:verified` → `goplaza:verified`.
- Outbound User-Agents `GoplazaBot/1.0 (+https://goplaza.ca)`, `goplaza-importer/1.0`.
- Stripe `appInfo` name/url; seed script product names.
- `pnpm check:brand` added.

## 5. URLs changed

| old | new | where |
|---|---|---|
| `https://charana.ca` | `https://goplaza.ca` | `.env.example`, email templates, mobile fallbacks, Stripe appInfo, prompts, docs |
| `charana.ca/b/…` | `GoPlaza.ca/b/…` | plans, features (web+mobile), vanity editor |
| `charana://auth/confirmed` | `goplaza://auth/confirmed` | mobile signup |
| `/brand/charana-mark-primary.svg` | `/brand/goplaza-symbol.svg` | blog JSON-LD |
| robots / sitemap / canonical / auth callbacks | unchanged code — driven by `NEXT_PUBLIC_BASE_URL` | Vercel env |

## 6. Assets changed

Added `apps/web/public/brand/goplaza-{symbol,symbol-white,symbol-black,logo-horizontal,app-icon,favicon}.svg`;
regenerated `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`,
`apple-touch-icon.png`, `android-chrome-{192,512}.png`, `safari-pinned-tab.svg`;
regenerated `apps/mobile/assets/images/{icon,favicon,splash-icon,android-icon-foreground,android-icon-background,android-icon-monochrome}.png`.
Deleted `brand/charana-*.svg` and `charana-brand-kit.zip` (zero references
remained). Photography under `public/images/**` untouched (not brand-marked).
**All mark geometry is provisional** — traced from the raster board. TODO in
`REBRAND_EXTERNAL_ACTIONS.md §9`.

## 7. Mobile changes

`name`/`CFBundleDisplayName` → GOPLAZA; `scheme` → `["goplaza","charana"]`;
applinks + Android intent hosts add `goplaza.ca`/`www.goplaza.ca` and keep the
old; adaptive icon background burgundy; mic-permission string; ~30 screens'
copy; icons/splash. **Unchanged:** `ca.charana.app`, EAS slug `charana`,
`projectId`. Next native build needs `expo prebuild --clean`.

## 8. SEO changes

Titles/descriptions, PWA manifest, theme colour, JSON-LD Organization,
llms.txt / llms-full.txt, RSS title, breadcrumbs. Canonicals, sitemap and
robots are env-driven and unchanged in code. Equity depends on the external
308 from charana.ca (path-preserving) and Search Console change-of-address.

## 9. Authentication changes

Code: none needed for web (links flow through `env.baseUrl`). Mobile signup
redirect scheme changed → requires `goplaza://**` in Supabase Redirect URLs
**before deploy**. Sessions, storage keys, cookies: untouched.

## 10. Compatibility measures

- `charana://` stays registered; `charana.ca` applinks/intent filters stay.
- Old domain must 308 to the new one indefinitely (external).
- Bundle id / package / EAS identity unchanged → existing installs update in place.
- `imports@charana.ca` system owner unchanged → ownership model untouched.
- Stripe metadata lookup keys unchanged → seed script still finds live products.
- Hash salt fallback in `api/events` unchanged.
- No persisted client keys were renamed (none contained the brand).

## 11. Remaining legacy references (all on the check-brand allow-list)

| reference | why it stays |
|---|---|
| `ca.charana.app` (app.json, AASA, assetlinks) | app identity |
| EAS `slug: charana`, projectId | EAS project identity |
| `charana://` in app.json, signup comment, `brand.legacyScheme` | old installs |
| `*@charana.ca` in `company.ts`, `.env.example`, DEPLOYMENT | goplaza.ca not verified in Resend |
| `imports@charana.ca` (core, 3 scripts, migration comment) | production data identity |
| Stripe `charana_plan`/`charana_interval` metadata | product lookup key |
| `api/events` salt fallback | hash stability |
| `supabase/migrations/*` (old files) | immutable history |
| `docs/06`, `docs/07`, `CHANGELOG` | narrate the past |
| `charana-category-{art,images}/` + two python OUT dirs | generation archives |
| `.claude/settings.local.json` | local tool allow-list |
| REBRAND_*.md, `check-brand.mjs`, `generate-brand-assets.mjs`, `brand.ts` header | the record itself |
| Blog post bodies in the DB | content decision, not code (external §2) |

## 12. External dashboard actions required

See `REBRAND_EXTERNAL_ACTIONS.md`. Blocking before merge: Vercel domains +
env, Supabase Site URL / Redirect URLs, `pnpm db:push`.

## 13. Risks

- Deploying the branch before Supabase allow-lists `goplaza://**` breaks
  mobile signup confirmation for new builds (web unaffected).
- Deploying before `NEXT_PUBLIC_BASE_URL` is flipped ships canonicals/mail
  links to charana.ca — still working, just old.
- The provisional mark is a trace, not the master vector; small-size fidelity
  is acceptable (verified at 16px) but the designer's file should replace it.
- Persian display form «گوپلازا» is a decision (D1); one constant to change.
- Lint has 6 pre-existing errors (React Compiler rules) — unchanged count.
- The auth panel's «+۲۰٬۰۰۰» claim predates this work and is false; flagged.

## 14. Manual QA checklist

- [x] Home: mark, wordmark, tagline, burgundy hero, counters
- [x] Login: side panel mark + GOPLAZA (č badge removed)
- [x] /story, /about copy
- [x] 404, mobile width (375), RTL
- [x] `/manifest.webmanifest`, `/llms.txt`, favicon.ico, `/brand/goplaza-symbol.svg`, AASA
- [ ] Signed-in: dashboard, owner onboarding, admin sidebar (needs a session)
- [ ] Email render (needs Resend send) — templates typecheck and use `brand.url`
- [ ] Mobile app on device after `expo prebuild --clean`

## 15. Deployment checklist

1. External §1 (Vercel domains + env) and §2 (Supabase URLs).
2. `pnpm db:push` (data migration).
3. Merge `rebrand/goplaza` → `main`; confirm build; check `https://goplaza.ca/robots.txt`, `/sitemap.xml`, `/.well-known/apple-app-site-association`.
4. Confirm `https://charana.ca/businesses/<slug>` 308s path-preserving.
5. Search Console change of address; Stripe product rename; Resend domain (then flip mailboxes).
6. `expo prebuild --clean` → new APK 1.3.0; smoke on a device.

## Final table

| OLD | NEW | STATUS | NOTES |
|---|---|---|---|
| čārana / چارانا | GOPLAZA / گوپلازا | done | from `brand.name` / `brand.nameFa` |
| Find with confidence. / با اطمینان پیدا کن. | Discover. Connect. Grow. / کشف کن. وصل شو. رشد کن. | done | `brand.tagline` |
| #800000 (annabi) | #7A1831 | done | token name kept |
| Hidden Č mark | G-mark (provisional geometry) | done | master vector pending |
| `charana-*.svg` + kit ZIP | `goplaza-*.svg` | done | ZIP removed |
| favicons / touch / Expo icons | regenerated | done | `scripts/generate-brand-assets.mjs` |
| https://charana.ca in code | `brand.url` = https://goplaza.ca | done | env still wins |
| `NEXT_PUBLIC_BASE_URL` value | https://goplaza.ca | **external** | Vercel |
| Supabase Site URL / redirects | goplaza.ca, goplaza:// | **external** | keep old too |
| `charana://` | `goplaza://` primary, `charana://` kept | done | |
| applinks / intent hosts | + goplaza.ca | done | old kept |
| App display name "Charana"/"čārana" | GOPLAZA | done | prebuild needed |
| `ca.charana.app` | unchanged | intentional | app identity |
| EAS slug/projectId | unchanged | intentional | |
| `@charana/*` packages | `@goplaza/*` | done | lockfile refreshed |
| Email sender "čārana <noreply@charana.ca>" | "GOPLAZA <noreply@charana.ca>" | done / **external** | address flips after Resend |
| `*@charana.ca` mailboxes | unchanged | **external** | Resend + mailboxes |
| Stripe products "čārana Pro/Featured" | "GOPLAZA Pro/Featured" | script done / **external** | rename live products |
| Stripe metadata `charana_plan` | unchanged | intentional | lookup key |
| `charana:verified` JSON-LD id | `goplaza:verified` | done | |
| Blog seed rows / author default | migration `…270000_rebrand_goplaza.sql` | done / **db:push** | data-only |
| `imports@charana.ca` | unchanged | intentional | ownership model |
| Docs & CLAUDE.md | updated | done | history left as history |
| Brand regression guard | `pnpm check:brand` | done | allow-list justified |
