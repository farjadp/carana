# Gotchas

Every one of these cost real time. Read before debugging anything similar.

---

## Turborepo strips environment variables it does not know about

**Symptom:** Variables set correctly on Vercel never reach the build. A warning
reads "set on your Vercel project, but missing from turbo.json".

**Cause:** Turborepo runs each task in a filtered environment. Anything not
declared in `turbo.json` is removed before the task starts.

**Fix:** declare every variable the build needs in `tasks.build.env`. It also
becomes part of the cache key, so changing a value correctly invalidates the
cache instead of silently reusing a stale build.

---

## `NEXT_PUBLIC_*` is baked in at build time, and only `NEXT_PUBLIC_*` reaches the browser

**Symptom:** "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
while prerendering a client component, even though `SUPABASE_URL` is set.

**Cause:** Next inlines only `NEXT_PUBLIC_*` into browser code. Every other
`process.env` read in a client component compiles to `undefined`. A
`NEXT_PUBLIC_X ?? X` fallback therefore works on the server and silently fails
in the browser.

Worse: because the value is baked in at build time, adding it to the host later
does nothing until you rebuild.

**Fix:** `next.config.ts` promotes the unprefixed values into the public
namespace via the `env` option. Never put a secret there — it would be inlined
into the browser bundle.

---

## Vercel dashboard overrides beat the repo

**Symptom:** Editing `vercel.json` changes nothing.

**Cause:** Vercel copies `vercel.json` build settings into the project's own
settings the first time it sees them, and they stay there as manual overrides.
Deleting the file does not clear them.

**Fix:** turn the Override toggles off in Settings → Build and Deployment, or
`PATCH` the project through the API with `buildCommand: null` and friends.

---

## A successful build can still fail to deploy

**Symptom:** turbo reports "1 successful, 1 total", every route is listed, and
the deployment fails anyway.

**Cause:** with the Next.js preset, Vercel uses its own builder and resolves
`.next` relative to the Root Directory. Root was the repo root, whose
`package.json` has no `next` dependency and no `next.config.ts`, so the builder
could not find an app.

**Fix:** Root Directory `apps/web`, no build overrides.

---

## Domain redirects configured in two places make a loop

**Symptom:** `/` returns 200 but every other path bounces between apex and www.

**Cause:** Vercel's domain settings redirected apex → www while `vercel.json`
redirected www → apex. `/` survived because the `/:path*` pattern does not match
an empty path.

**Fix:** configure host redirects in exactly one place. They live on the Vercel
domains now; `vercel.json` carries only headers.

---

## Postgres does not apply RLS per column

**Symptom:** none. That is the problem.

A `select("*")` on `businesses` returns `business_number`, `license_info`,
`verification_documents` and `verification_notes` to whoever can read the row.
RLS decides **which rows**, never which columns.

**Fix:** list columns explicitly on every public query. `PRIVATE_BUSINESS_COLUMNS`
in `packages/core` names the ones that must never go out.

---

## `SECURITY DEFINER` is not optional on a function used inside its own table's policy

`is_admin()` reads `public.profiles`. The policies on `profiles` call
`is_admin()`. Without `SECURITY DEFINER` this recurses and returns false —
which does not error, it just **silently disables every admin policy in the
schema**.

---

## Supabase migration history drifts if you use the dashboard

Applying SQL by hand leaves `schema_migrations` empty while the schema moves on.
The next `db:push` then tries to replay everything from the beginning.

Recovering means `supabase migration repair --status applied <version>` for each
one that really ran — and checking, column by column, which ones actually did.
Two migrations here turned out never to have been applied at all.

**Also: migration versions must be unique.** Three files shared `20260813` and
`db:push` failed on a duplicate primary key. Use full
`YYYYMMDDHHMMSS_name.sql`.

---

## Metro does not find workspace packages on its own

**Symptom:** "Unable to resolve module @charana/core" from the mobile app.

**Fix:** `watchFolders` and explicit `nodeModulesPaths` in `metro.config.js`,
plus `node-linker=hoisted` in `.npmrc` — pnpm's symlinked layout confuses
Metro's resolver. Both are in place; do not remove them.

---

## Expo Router pre-renders the web build in Node

**Symptom:** `ReferenceError: window is not defined`, and the **dev server
process dies** — so both the QR code and localhost appear broken at once.

**Cause:** supabase-js reads the stored session as soon as the client is
constructed. During pre-render that runs in Node, where AsyncStorage reaches for
`localStorage`.

**Fix:** the mobile Supabase client uses a no-op storage when
`typeof window === "undefined"`.

---

## SecureStore has a 2048-byte limit

A Supabase session is larger. Storing it whole fails on a real device with no
obvious message. The adapter chunks it across keys.

---

## CocoaPods needs a UTF-8 locale

**Symptom:** `Unicode Normalization not appropriate for ASCII-8BIT
(Encoding::CompatibilityError)` from `pod install`, including when
`expo run:ios` calls it.

**Fix:** the `ios`, `ios:device` and `prebuild` scripts pin `LANG` and `LC_ALL`
to `en_US.UTF-8`.

---

## Expo strips non-ASCII from the native project name

`expo.name: "čārana"` produced an Xcode project called **`rana`**. `expo.name`
is now `Charana`, with `CFBundleDisplayName` set to `čārana` so the home screen
is unchanged.

---

## Associated Domains cannot be signed by a free Apple ID

The entitlement is paid-tier only, and its presence fails the build outright.
`app.config.ts` strips `ios.associatedDomains` unless `APPLE_TEAM_ID` is set.

---

## Expo Go on the App Store is not the latest SDK

It is pinned at **54.0.2**, ten months old. `api.expo.dev/v2/versions/latest`
claims 57.0.6 exists. It does not, on the store. Trust the store.

---

## Persian slugs need a Persian-aware slugify

A standard `replace(/[^a-z0-9]/g, "")` reduces every Persian business name to
the empty string. `packages/core/src/slug.ts` keeps the Arabic/Persian Unicode
range. Persian slugs work fine in URLs and Google indexes them.
