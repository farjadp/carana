# Mobile

Expo SDK 57, Expo Router, TypeScript. Lives in `apps/mobile`.

## Parity with the website (26 Aug)

Re-checked 26 Aug by enumerating `apps/mobile/src/app` against the web routes
and grepping the mobile source for each new subsystem. **The 24 Aug catch-up
has already lapsed.** Since `4f04073` ("Mobile catches up with the web",
24 Aug) there have been **59 commits touching `apps/web` and 2 touching
`apps/mobile`** — one of those two only made the lint gate green again. Three
whole products shipped on the web in that window and none of them exists on
native.

### Still true from the 24 Aug pass

| Web feature | Mobile |
|---|---|
| Ranked Persian-aware search (`search_businesses`) | yes — same RPC |
| Announcement search (`search_announcements`) | yes, 24 Aug — same RPC, called directly |
| Smart search (LLM query expansion) | yes, 24 Aug — via `/api/mobile/search/smart`, which returns terms only |
| Random default listing order + 89% featured boost | yes, 24 Aug — shared `weightedRandomOrder` |
| «ویژه» chip | yes, 24 Aug — shipped in the same change as the boost, deliberately |
| Four listing sorts (views / saved / new / verified) | yes, 24 Aug |
| Four plan tiers incl. **پلاتینیوم** + live prices | yes, 24 Aug — `PAID_PLANS` drives the tier list and the prices. Platinum's *prose* rows are deliberately absent on both surfaces: its exclusive list is not decided, so the screen shows only its confirmed bullets from the plan table |
| Jobs board — read side (board, detail, home rail, profile section) | yes — posting stays on web by decision |
| Blog article read count | yes, 26 Aug (`cd4ac3a`) — both surfaces call the same `increment_blog_post_view` RPC |
| Owner controls (edit, insights, billing, announcement + job writing) | **no — still the single biggest gap** |
| Push notifications | no infrastructure at all |
| Admin | web-only by decision |

### Opened since 24 Aug — nothing on native

Verified absent: grepping `apps/mobile/src` for `channel` / `standing` /
`loyalty` / `link_page` / `correction` returns no hits from these features.
(The `ChannelCard` in `register/verify.tsx` is the contact-channel picker for
verification — a different concept, not the channels directory.)

| Web feature | Shipped | Mobile | Shared logic already in `@goplaza/core`? |
|---|---|---|---|
| **Channels directory** — `/channels`, `/channels/[slug]`, `/channels/category/[slug]`, `/channels/submit`, the home band that replaced the «چرا گوپلازا؟» grid | 26 Aug | **no** — no screen, no card, no route | yes — `channels.ts` (activity thresholds, `memberLineFa()`) is app-agnostic |
| **Standing & loyalty** — `/standing`, `/profile/standing`, the standing badge on the public `/businesses/[slug]`, the loyalty card in owner billing, the Stripe discount | 26 Aug | **no** — including the reader-facing badge, which is not an owner control and has no reason to be web-only | yes — `standing.ts`, `loyalty.ts` |
| **GPLZ Link** — `/link/[handle]` on `gplz.link` + the owner editor | 25 Aug | **no** | yes — `link.ts` |
| **Correction dialog** on the business profile | 26 Aug | **no** — the app has `report-sheet.tsx` only, so a reader can report a listing but not fix one | n/a (UI + `/api/corrections`) |
| **Header rebuilt** — eight top-level triggers → five, nav order is data | 26 Aug | n/a — native uses a five-tab bar, not the web nav |
| **`/profile` redesign** (stat strip of five counted queries, writable `bio`) | 26 Aug | **no** — the mobile profile tab is the pre-redesign shape |
| **`/auth/signup-success`** welcome page reading the account's own facts | 26 Aug | **no** — native signup ends at `auth/confirmed.tsx` |

Three of these — channels, standing, GPLZ Link — already have their rules in
`@goplaza/core`, so the gap is screens, not logic. That is the whole point of
the package: see `charana-mobile-lags-web`. A fix that lives in `apps/web` is
a fix in one app.

**Shipped versions are a separate question from source, and today they agree.**
`app.json` is `1.4.0`, the APK `/download` serves is `1.4.0` (EAS build
`6f8b7259`, 24 Aug, 110 MB), and `APP_VERSION` in `lib/data/releases.ts` is
`1.4.0`. That is the state the 1.3.0 lesson asked for — the rebrand once sat in
`app.json` for six days without a build, so every installed app said čārana
while the site said GOPLAZA. Whenever `app.json` moves, either build it or
record why not — `releases.ts` is a download promise, not a statement of
intent. **But matching version numbers are not parity:** someone running
1.4.0 today is missing two days of product.

## What works

Runs on the **iOS simulator** with live data from production Supabase, and as
a sideloaded **Android APK** (1.4.0, EAS `6f8b7259`).

Screen list enumerated from `apps/mobile/src/app`, 26 Aug — not from memory.

| Screen | State |
|---|---|
| Home — hero, counter, categories, newest, cities, jobs rail | done |
| Categories — full list with counts | done |
| Location — provinces with cities nested | done |
| Search — name, English name, description + category filter, smart search | done |
| Category listing `/categories/[slug]` | done |
| City listing `/cities/[city]` | done |
| Province listing `/provinces/[slug]` | done |
| Business profile — call, WhatsApp, directions, services, hours, branches | done |
| Auth — login, signup, forgot password, confirmed | done |
| Profile tab — saved businesses, private notes, jobs section, account row | done |
| Account edit | done |
| Save / notify / private note on a business (`interaction-bar.tsx`) | done — signed-out users see the controls and are sent to sign in, rather than the controls being hidden |
| Published reviews on a business profile (read + average) | done |
| Blog — index and article, with the shared read counter | done |
| Jobs — board and detail (read side) | done |
| Features screen | done |
| Register a business — start, form, import, verify | done |
| Suggestion box (text + voice), report sheet | done |

**Correcting the previous version of this table:** it said "Not built: auth,
saving, private notes, reviews, user profile." All five have been built —
`auth/`, `interaction-bar.tsx`, `listPublishedReviews` and the profile tab are
in the tree. The line was stale from before the 24 Aug catch-up and had been
read as current since. Owner dashboard and admin remain deliberately web-only;
review *writing* is still web-only, only reading is native.

## The blocker: Expo Go is stuck on SDK 54

**Expo Go on the App Store is version 54.0.2, last updated ten months ago.**
This project is SDK 57. Expo Go refuses it with "Project is incompatible with
this version of Expo Go".

Note for future reference: `api.expo.dev/v2/versions/latest` claims the iOS
Expo Go client for SDK 57 is `57.0.6`. That is not what the App Store ships.
Trust the App Store.

### Three ways forward

**A — Development build on a physical device (prepared, not finished)**

Most of the work is done. `apps/mobile/ios/` is generated, CocoaPods installed,
naming fixed. What remains is signing, which needs a human at the keyboard:

1. Connect the iPhone by cable, tap **Trust This Computer**
2. Xcode → Settings → Accounts → `+` → sign in with a **free** Apple ID
3. `cd apps/mobile && pnpm ios:device`
4. On the phone: Settings → General → VPN & Device Management → your Apple ID →
   **Trust**

Gives the real app: GOPLAZA icon, splash, deep links, real SecureStore.
A free Apple ID signature **expires after 7 days** and must be reinstalled.
That limit disappears once the paid Developer account exists, at which point
TestFlight replaces this entirely.

**B — Downgrade the project to SDK 54**

Expo Go would work immediately. Costs a downgrade of Expo Router and several
dependencies plus a full re-test, to match a ten-month-old development tool
that is not the shipping target. Not recommended.

**C — Stay on the simulator**

Works today and is enough for building screens. Defer the physical device until
the Developer account arrives and TestFlight is available. Reasonable.

## Native project notes

`apps/mobile/ios/` is generated by `expo prebuild` and is **gitignored**. Only
the config that produces it is tracked. To regenerate: `pnpm prebuild`.

Three things had to be solved to get it building, all now permanent:

**Associated Domains.** Universal Links need a capability Apple grants only to
paid Developer Program members; signing with a free personal team fails outright
when the entitlement is present. `app.config.ts` strips
`ios.associatedDomains` unless `APPLE_TEAM_ID` is set.

**Project naming.** Expo derives the Xcode project name from `expo.name` with
non-ASCII stripped, so "GOPLAZA" became **"rana"**. `expo.name` is now `Charana`
with `CFBundleDisplayName` set to `GOPLAZA`, so the home screen is unchanged.

**CocoaPods locale.** `pod install` aborts with
`Encoding::CompatibilityError` unless the locale is UTF-8. The `ios`,
`ios:device` and `prebuild` scripts pin `LANG` and `LC_ALL`.

## Monorepo wiring

Two pieces are load-bearing and easy to break:

`apps/mobile/metro.config.js` — Metro does not walk out of the app directory the
way webpack does. Without `watchFolders` it never sees `packages/core`, and
without explicit `nodeModulesPaths` it cannot resolve hoisted dependencies.

`.npmrc` with `node-linker=hoisted` — pnpm's default symlinked layout confuses
Metro's resolver.

## Supabase client

`apps/mobile/src/lib/supabase.ts`. Two things worth knowing:

The session lives in `expo-secure-store` (iOS keychain / Android keystore),
**chunked across keys** because SecureStore caps items at 2048 bytes and a
Supabase session exceeds that. Without chunking, login fails on a real device
for no obvious reason.

The client is SSR-safe. Expo Router pre-renders the web build in Node, where
there is no `window`; supabase-js reads the stored session as soon as it is
constructed, which crashed the whole dev server with `window is not defined`.
It now uses a no-op storage when `typeof window === "undefined"`.

## App identity

| | |
|---|---|
| Display name | GOPLAZA |
| Bundle ID | `ca.charana.app` (iOS and Android) — **effectively permanent after release** |
| Scheme | `goplaza://` primary, `charana://` kept for builds installed before the 2026-08-18 rebrand |
| Icon / splash | Generated, in `assets/images/` — see `01-product.md` |
| `owner` in app.json | **not set** — needs the expo.dev organisation slug |

## Store readiness

| Requirement | State |
|---|---|
| Privacy policy URL | done — goplaza.ca/privacy |
| Support URL | done — goplaza.ca/support |
| Account deletion (Guideline 5.1.1(v)) | done — goplaza.ca/account/delete |
| Apple Developer account | blocked on D-U-N-S |
| Google Play account | blocked on D-U-N-S |
| Store screenshots | not done |
| `APPLE_TEAM_ID` in apple-app-site-association | pending the account |
| `ANDROID_SHA256_FINGERPRINT` in assetlinks.json | pending first EAS build |

**In-app purchase does not apply.** Featured listings and advertising are sold
to business owners — a B2B advertising service consumed outside the app, the
same model Yelp and Google Business Profile use. Keep the purchase flow on the
web and never put a buy button in the app; putting one there would pull the
whole thing under Apple's 15–30% and require IAP.
