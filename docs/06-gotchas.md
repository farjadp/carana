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

## `vercel deploy` accepts a `vercel.json` that the Git integration rejects

**Symptom:** `vercel --prod` from the laptop succeeds, every push to `main`
fails seconds later with no build log. The site stays up on the last CLI
deploy, so nothing looks broken until you read the deployment list.

**Cause:** a `"//"` key was used to hold an explanatory comment in
`apps/web/vercel.json`. JSON has no comments, and the Git integration validates
the file strictly: *should NOT have additional property `//`*. The CLI does not
run that check, which is why the two paths disagreed.

**Fix:** keep `vercel.json` to schema-valid keys only. Explanations belong in
this file, not in the config.

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

---

## RTL forces the keyboard to Persian, and every ASCII-digit check then fails

**Symptom:** sign-in rejects correct credentials; a correctly typed phone number
is reported invalid. No error anywhere explains why.

**Cause:** the app forces RTL, so the keyboard opens in Persian and the user
types Persian digits (U+06F0–U+06F9) or Arabic-Indic (U+0660–U+0669). In a
password field the dots look identical; in a phone field the digits look right.
The string simply does not match.

**Fix:** credential fields take a `latin` prop that pins direction, keyboard and
autocorrect. Numeric input runs through `toLatinDigits()` before parsing.

**This will happen again** on any new field parsed as ASCII digits — postal
code, OTP entry, card, year. Test with Persian digits explicitly.

---

## supabase-js deadlocks if you query from inside onAuthStateChange

**Symptom:** login succeeds, the session exists, but the UI still shows signed
out. No error.

**Cause:** supabase-js holds an internal lock while the callback runs. Calling
back into the client from inside it never resolves.

**Fix:** defer to the next tick — `setTimeout(() => loadProfile(...), 0)`.

---

## `themeColor` belongs to `viewport`, not `metadata`

On `metadata` it is silently dropped, so the browser chrome never picks up the
brand colour and nothing warns you. Verified against the Next 16 type
definitions, not assumed.

---

## The Vercel CLI cannot upload the generated native project

**Symptom:** `vercel --prod` fails with `files should NOT have more than 15000
items`, then with `not a valid symlink` on an xcframework.

**Cause:** `expo prebuild` writes `apps/mobile/ios`, ~19,000 files including
symlinks the CLI rejects. None of it belongs in the web build.

**Fix:** `.vercelignore` excludes `apps/mobile/ios`, `android`, `.expo`, plus
`docs` and `scripts`. Deploy with `--archive=tgz`.

---

## A badge that could never render

**Symptom:** the verified badge never appeared, on any listing, ever.

**Cause:** `business-profile-client.tsx` rendered `business.is_verified`,
`is_claimed` and `is_featured`. None of those columns exist in any migration,
and none were in the page's select list either. Three chips of dead code.

**Fix:** verification state now lives in `verified_at` / `verified_until` /
`verification_method`, and the badge is computed by
`lib/verification/status.ts`. A boolean could not have expressed "verified, but
it lapses in nine days" or "the phone number changed after we proved it"
anyway.

**Lesson:** a field the UI reads is not a field the database has. `select("*")`
would have hidden this even longer — an absent column is simply `undefined`,
which is falsy, which looks exactly like "not verified yet".

---

## Verification proves a contact point, not a row

**Symptom:** none yet — this is the trap that was avoided.

A listing verified by SMS and then edited to carry a different phone number
would keep its badge while pointing somewhere nobody proved. `verified_phone`
stores what was actually proven, and `getVerificationStatus` voids the badge
when the live value moves away from it.

The comparison folds Persian and Arabic-Indic digits to ASCII first. Without
that, a number entered on the Persian keyboard shares no characters with the
stored one and every badge would void itself the moment it was granted — the
same trap as `toLatinDigits` in the SMS sender.

---

## A badge with no condition on it

**Symptom:** every listing on the home page showed "تایید شده", including
677 rows imported by us that nobody had verified.

**Cause:** the chip was rendered unconditionally — no `&&`, no ternary, no
flag. The section heading and subtitle asserted the same thing in words
("جدیدترین کسب‌وکارهای تایید شده", "پس از بررسی تیم چارانا") over a query that
filters on publication status alone.

**Fix:** every verification chip now derives from `getVerificationStatus`.
Headings say what the query selects.

**Lesson:** when checking whether something renders correctly "across the
site", enumerate routes from `sitemap.xml`, not from memory. This was found by
the user on the home page after an audit that had covered the profile page,
category cards, city cards and three listing indexes — everything except the
first screen every visitor sees.

---

## A connected iPhone that Xcode calls an "ineligible destination"

**Symptom:** `expo run:ios --device` finds the phone, auto-signs, then fails
with `xcodebuild` error 70 and:

```
iOS 26.5 is not installed. Please download and install the platform
```

**Cause:** Xcode bundles device support only for old iOS versions — 16.4 was
the newest present here — and downloads the current one on demand. On a machine
where that has never happened, `~/Library/Developer/Xcode/iOS DeviceSupport/`
is empty and any phone on a current iOS is an *ineligible destination*.

**The misleading part:** `xcodebuild -showsdks` cheerfully lists the SDK. Having
the SDK is not the same as having the platform's device support, and the first
error in the sequence is about signing certificates, which sends you looking at
provisioning rather than at Xcode's components.

**Fix:**

```bash
xcodebuild -downloadPlatform iOS
```

Several gigabytes. Or Xcode → Settings → Components → iOS. Nothing in the
project changes.

**Note:** the preceding `No code signing certificates are available to use` is a
separate, earlier problem — no Apple ID in Xcode → Settings → Accounts. Once
fixed, the run prints `Auto signing app using team(s): …` before hitting the
platform error above.

---

## `Link asChild` silently discards a Pressable's function-style

**Symptom:** the business card never showed its white surface, border or
shadow — on any screen, in any design revision. Text sat directly on the cream
page background and nothing errored. Setting the background to pure red
changed nothing, which is what finally proved the style was not applied at all.

**Cause:** expo-router's `<Link asChild>` clones its child through a Slot, and
that clone drops a `style` given as a **function** (`style={({pressed}) =>
[...]}`). A plain object or array survives; the pressed-state function form is
discarded whole — including every static style inside it.

**Fix:** `business-card.tsx` no longer wraps the card in `Link asChild`; it is
a plain `Pressable` with `router.push` in `onPress`. If `Link asChild` is ever
reintroduced, the style must be a static array, with the pressed state handled
some other way.

**Lesson:** "renders without error" is not "renders as written". This shipped
in the first version of the card and survived two redesigns because the cream
page made borderless rows look intentional. Pixel-sample a screenshot when a
surface colour matters.

---

## A stale Metro serves yesterday's app with today's confidence

**Symptom:** after a rebuild and reinstall, the simulator showed a UI from two
commits ago — including text that no longer exists anywhere in the tree.

**Cause:** two stacked staleness layers. A Metro started in the morning (before
`pnpm add` of a new package and the day's edits) kept serving its old module
graph; and when the dev client could not reach its recorded LAN URL it silently
fell back to the **cached bundle from its last successful session** instead of
erroring.

**Fix:** kill the old Metro (`lsof -nP -iTCP:8081`), start a fresh one **from
`apps/mobile`, not the repo root** (from the root it resolves the default
`expo/AppEntry` instead of `expo-router/entry` and the app dies on boot), and
reconnect with an explicit
`ca.charana.app://expo-development-client/?url=http://localhost:8081`.
Before trusting any screenshot, confirm the log printed a fresh `iOS Bundled …`
line after your last edit.

---

## Supabase free tier locks email templates until custom SMTP exists

**Symptom:** `PATCH /v1/projects/{ref}/config/auth` with `mailer_templates_*`
returns 400 *"Email template modification is not available for free tier
projects using the default email provider"*.

**Fix:** set the `smtp_*` fields first (Resend: `smtp.resend.com`, port
`465`, user `resend`, pass = a Resend API key), then the templates in a second
PATCH. Order matters; one combined request fails whole.

Also: the Management API sits behind Cloudflare and rejects Python urllib's
default User-Agent with `403 error code: 1010`. Send any browser-ish UA.

## `vercel env pull` returns empty strings for Sensitive variables

**Symptom:** a pulled `.env` shows `RESEND_API_KEY=""` and every Twilio value
empty; it looks as if production was configured with blanks.

**Cause:** the variables were created as **Sensitive**. Vercel never returns
their values — not to the CLI, not to the dashboard. Production has them; you
just cannot read them back. `vercel env ls --format json` shows
`"type": "sensitive"`.

**Fix:** none needed — this is the desired posture. Keep working copies of
such secrets in `apps/web/.env.local` (git-ignored) if a script on the laptop
needs them, and check there before assuming production is misconfigured.

---

## Search must forgive the wrong keyboard layout, not just the wrong script

**Symptom (seen on the simulator):** typing `dental richmond` in the app's
search box produced `یثدفشم قهزاپخدی` — the device keyboard was Persian
because the app forces RTL. Zero results, no error, and the user has no idea
what happened.

**Cause:** the same trap as `toLatinDigits`, one level up: not digits, the
whole layout. Persian users on Latin keyboards hit the mirror image
(`vsj,vhk` for «رستوران»).

**Fix:** `search_businesses` scores both the literal query and
`keyboard_swap(q)` (full ISIRI 9147 ↔ QWERTY map, 31 keys, `translate()`)
and takes the better one, discounted 10% so a genuine literal hit still wins.
`fa_normalize` separately folds Arabic ي/ك, ة/ۀ, harakat, tatweel and
Persian/Arabic-Indic digits.

**Also:** Persian city names are not in the data (cities are stored in
English), so «املاک ریچموند» found nothing until `city_aliases` was joined
into the search blob. Add a row there for every new city.

---

## Unlayered `a { color }` beats every Tailwind text utility

**Symptom:** the profile's filled "تماس" button rendered ink text on annabi —
`text-[#f6f1e8]` was in the class list, computed colour was `rgb(20,33,61)`.

**Cause:** Tailwind v4 emits utilities inside `@layer utilities`. Any
unlayered rule — here `a { color: inherit }` at the top of `globals.css` —
outranks *all* layered rules regardless of specificity or order. So no `<a>`
on the site could take a Tailwind text colour, and nothing warned.

**Fix:** the anchor reset lives in `@layer base` now. When a colour "does not
apply" on a link, check for an unlayered rule before anything else.

---

## The iOS Simulator has no microphone unless you give it one

**Symptom:** tapping "record" freezes the JS thread. No error, no log; the UI
just stops responding to taps while native scroll still works.

**Cause:** the simulator's default audio input had `totalChannelCount 0` in
the CoreAudio log (`AggregateDevice.mm … scope 'inpt' … totalChannelCount 0`),
followed by `HALC_ProxyObject::SetPropertyData … got an error`. With no input
device, `AVAudioRecorder.record()` never returns and expo-audio's sync
`record()` blocks Hermes.

**Fix:** Simulator → I/O → Audio Input → pick the Mac's mic; or test voice on
a real phone (`ios:device`). Not a code bug — the web recorder and the mobile
text path were verified; only the simulator mic was not.

**Also:** device console output was not showing in a `nohup`-started Metro
log. Use `xcrun simctl spawn booted log stream --predicate 'process == "Charana"'`
to see the native side when JS logs are silent.

---

## Simulator taps are in points; screenshots come back in pixels

**Symptom:** every tap on the app's tab bar did nothing, while taps on cards
in the middle of the screen worked. It looked like a broken tab bar.

**Cause:** the returned screenshot is 919×1972 (a scaled render of the 3×
frame buffer), but `mcp__Claude_Code_iOS_Simulator__control` takes **device
points** — iPhone 17 is 402×874. A tab bar at y≈1874 in the image is y≈830 in
points; y=1874 is simply off the bottom of the screen, so the tap landed
nowhere and reported success.

**Fix:** read the real size (`xcrun simctl io booted screenshot` → 1206×2622
pixels ÷ 3 = 402×874 points) and scale image coordinates by
`points = pixels_in_image × 402 / image_width` before tapping. Tab bar row is
y≈830; tab centres x ≈ 39 / 120 / 201 / 281 / 362.

**Lesson:** a tool that reports "Tapped at (x, y)" has not confirmed anything
landed. Verify with the next screenshot, and suspect the coordinate space
before suspecting the app.

---

## A Sensitive Vercel variable that exists but is empty looks exactly like a correct one

**Symptom, twice in one night:** `/profile` and `/admin` returned the branded
error page (`Missing required environment variable: SUPABASE_SECRET_KEY`), and
later every anonymous POST to `/api/reports` failed with
`Missing required environment variable: SUPABASE_PUBLISHABLE_KEY` — while the
whole rest of the site rendered fine.

**Cause:** both variables were present in the Vercel dashboard, marked
Sensitive, with an empty value. `vercel env ls` shows the name, the
environment and the age; it cannot show the value, so "it is configured" and
"it is correct" are indistinguishable from outside.

The site kept working because `lib/env.ts` has two accessors: `env.*` falls
back to the `NEXT_PUBLIC_*` copy (which was set), while `serverEnv.*` reads the
bare name strictly. Everything rendering through `env` was fine; only the
paths that use `serverEnv` — the admin client, `authenticateBearer`, and so
every `/api/mobile/*` route — were broken.

**Fix:** re-set the value from `apps/web/.env.local`, redeploy, and verify with
a real request rather than by looking at the dashboard:

```bash
curl -s -X POST https://charana.ca/api/reports -H "Content-Type: application/json" \
  -d '{"businessId":"<uuid>","reason":"closed"}'
```

**Lesson:** after any key rotation, exercise one route per accessor —
a page (`env`), an admin page (`serverEnv` + service role) and a mobile API
route (`serverEnv` + publishable). A green dashboard is not evidence.

---

## Stripe automatic tax refuses to work without a head-office address

**Symptom:** `subscriptions.create` with `automatic_tax: { enabled: true }`
fails in **test** mode with *"You must have a valid head office address to
enable automatic tax calculation"*.

**Cause:** Stripe Tax needs the origin address before it can decide a rate, and
a brand-new account has none. Checkout with `automatic_tax` will fail the same
way, so this is a launch blocker rather than a nicety.

**Fix:** Dashboard → Settings → Tax → set the head office address, in test and
in live. Nothing in the repo changes.

---

## Generated database types go stale silently, and only the typed client notices

**Symptom:** `apps/mobile` failed to compile with *"Argument of type
'blog_categories' is not assignable"* while `apps/web` built fine against the
same tables.

**Cause:** `packages/core/src/database.types.ts` is generated, not live. Six
tables added over two sessions (blog, suggestions, events, reports, city_metro,
category_aliases) were missing from it. The web client is loosely typed and did
not care; the mobile client is typed and did.

**Fix:** regenerate after every migration —
`npx supabase gen types typescript --project-id <ref> > packages/core/src/database.types.ts`
— and typecheck **both** apps, because only one of them will tell you.

---

## `create or replace function` refuses to add a column to an existing function's return row

**Symptom:** `supabase db push` failed the whole migration with *"cannot
change return type of existing function (SQLSTATE 42P13) — Row type defined
by OUT parameters is different"*, on a plain `create or replace function`
that only added two output columns (`plan`, `plan_until`) to
`search_businesses`.

**Cause:** Postgres allows `create or replace function` to change a
function's body freely, but not the shape of a `returns table (...)` row —
adding, removing, or reordering an OUT parameter is a signature change, not
a body change, and Postgres refuses it outright rather than guessing what
callers expect.

**Fix:** `drop function if exists public.search_businesses(text, text, text,
boolean, integer, integer);` before the `create or replace`, in the same
migration file — the argument list in the `drop` has to match the existing
signature exactly (positional types, not names).

**Lesson:** any time a migration changes what a function *returns* rather
than what it *does*, drop it first. Changing the argument list has the same
restriction.

---

## A claimed business's real owner never saw their own owner-only controls

**Symptom:** none reported — found while wiring the review-reply feature,
which is gated on `isOwnerOrAdmin`.

**Cause:** `app/businesses/[slug]/page.tsx` computed `isOwnerOrAdmin` from
`business.created_by === user.id` only. There are two routes to ownership
in this schema: `created_by` (registered the listing through onboarding)
and `owner_user_id` (claimed a listing an admin originally imported) — the
dashboard's listing query already `.or()`s both. The public profile page
checked only the first, so the owner of any *claimed* (not self-registered)
business saw their own profile as a stranger would: no reply button, no
busy-status entitlement, nothing.

**Fix:** `business.created_by === user.id || business.owner_user_id === user.id`.

**Lesson:** ownership has two columns in this schema (see
`02-engineering.md`); a check written against only one of them is not a
bug that shows up in testing with a self-registered demo account — it only
bites claimed listings, which is exactly the case least likely to get
manually tested.

---

## A rebuilt CSS component silently inherited its predecessor's rules

**Symptom:** Farjad: "the top menu feels off, I don't have a good sense of
why." No error, no obviously broken layout in a quick look — a floating
rounded-pill header at some widths, a flat sticky bar at others, and below
720px the header stopped sticking while scrolling at all.

**Cause:** `globals.css` had two full definitions of `.site-header` — an old
pill-shaped floating-card design (`position`, `display:grid`, `padding`,
`margin-top`, `border`, `box-shadow`, `border-radius:999px`) and the
"rebuilt 2026-08-23" flat sticky bar that only redeclares `position`,
`background`, `backdrop-filter` and `border-bottom`. CSS cascade only
overrides properties a later rule actually redeclares — every property the
new rule didn't mention (padding, margin, border-radius, box-shadow, the
grid layout) kept coming from the old rule, at every viewport width, not
just the ones two leftover `@media` blocks also touched. One of those media
blocks set `position: static` below 720px, so the header lost `sticky`
entirely on phones.

**Fix:** deleted the old base rule and the two leftover `@media` overrides
entirely — nothing in the current header component (`site-header.tsx` /
`header-nav.tsx`) uses the old classnames these predate (`.brand-copy`,
`.nav-group`, `.nav-menu`, etc.), so nothing else depended on them.

**Lesson:** when a component gets "rebuilt," check whether its old CSS rule
was actually deleted or just no longer referenced by new markup — a
same-selector rule left behind doesn't error, doesn't show up in a diff of
the component file, and only shows up later as a vague "something's off"
because the cascade quietly fills in whatever the new rule forgot to
override, not what the new rule's author intended.
