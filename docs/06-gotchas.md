# Gotchas

Every one of these cost real time. Read before debugging anything similar.

---

## A count that promised a slot the cap refused

**Symptom.** On `/profile`, «شماره‌های تماس» read «۲ از ۳» while the add
button in the same box read «به سقف رسیده‌ای». Both were rendered by the same
component, three lines apart.

**Cause.** Two numbers with different meanings. `MAX_EXTRA_CONTACTS` is 2 —
the rows in `profile_contacts` — and the "3" in the label was
`MAX_EXTRA_CONTACTS + 1`, where the `+ 1` is the profile's OWN value: the
account email, or `profiles.mobile_number`. Every account has an email, so the
email list always reached 3 and looked right. A profile with no mobile number
has no third phone to count, so the phone list topped out at 2 while still
advertising 3.

**Fix.** The denominator is now `(primary ? 1 : 0) + MAX_EXTRA_CONTACTS`, the
panel header states the rule («ایمیل حساب و شماره‌ی موبایل پروفایل، به‌علاوه‌ی
حداکثر ۲ و ۲ دیگر») rather than the best case, and the phone list names the
field further up the page that would earn the third slot.

**Lesson.** `N + 1` in a label is a claim that the `+ 1` exists. It did for one
of the two lists and not the other, so every test with a fully-filled profile
would have passed. Found in the first screenshot of the panel with rows in it,
after the DDL, the RLS, the trigger and the server actions had all been
round-tripped clean against the live database — none of which could see it,
because nothing was wrong with the data.

---

## A Google sign-in button shipped for a provider that was never enabled

**Symptom.** «ادامه با حساب گوگل» sat on `/auth/login` and `/auth/signup` from
18 August. Clicking it did nothing useful — `signInWithOAuth({provider:'google'})`
returns "Unsupported provider: provider is not enabled" and the person is left
on the same page.

**Cause.** The button was written in the same commit as the layout, ahead of
the dashboard work. Nobody enabled Google on the Supabase project, and nothing
in the app ever asks whether a provider is on:

```
curl -s "$SUPABASE_URL/auth/v1/settings" -H "apikey: $PUBLISHABLE_KEY"
→ "external": { ..., "google": false, ... }
```

That endpoint is public and unauthenticated. One request would have settled it
at any point in the eight days.

**Fix.** `lib/auth/providers.ts` reads `/auth/v1/settings` (cached 5 min, fails
closed) and the auth pages pass `googleEnabled` into `AuthForm`. The button —
and the «یا با ایمیل» divider under it, which is itself a claim that there is
an alternative — render only when the project really has the provider. Turn it
on in the dashboard and the button appears on its own within five minutes.

**Lesson.** Auth providers are configuration, not code, so a button for one is
a claim about a system this repo cannot see. Every other "honesty in the UI"
case here was a claim about a *row*; this is the same class one level up, and
the same answer applies — ask the system, do not assume. When the answer is
one public GET, there is no excuse for a static button.

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

---

## A rates API will hand you a year-old number without blinking

**Symptom:** none shipped — caught while wiring the footer FX widget the
first time a real Navasan key was available.

**Cause:** Navasan's `/latest/` returns ~300 symbols, and *dead ones stay in
the payload indefinitely with their last-known value*. `cad_cash` was 299
days old and read 78,230 while the live `cad` read 134,580 — a 42% error.
Nothing in the response marks it as retired; only its `timestamp` field
gives it away. The original fallback chain (`cad_sell` → `cad` →
`cad_harat_naghdi`) would have picked a stale symbol without complaint the
day a preferred key went missing.

**Fix:** `lib/exchange-rates.ts` rejects any quote older than
`MAX_AGE_DAYS = 3`, and rejects entries with no `timestamp` at all — a
symbol that cannot prove it is current is not shown. An absent rate is
fine; a confidently wrong one is not.

**Also worth knowing:** the guessed key names were half wrong. `usd_sell`
exists, `eur_sell` and `cad_sell` do not. The bare `usd` / `eur` / `cad`
keys are the headline free-market rates and share one timestamp, so
showing those three together is a coherent snapshot. Values are **Toman**;
cross-checking against real EUR/USD and CAD/USD ratios (1.157 and 0.720 at
the time) is a cheap way to confirm both the unit and the mapping.

**Lesson:** for any third-party quote feed, freshness is a separate
question from correctness, and the API will not raise it for you. If a
payload carries timestamps, use them as a filter, not decoration.

---

## An EAS build has none of your local `.env` — and fails silently, at runtime

**Symptom:** APK 1.1.0 was downloadable from the site for a day and could
not start at all. No build error — EAS reported success and produced a
107MB artifact.

**Cause:** `apps/mobile/.env.local` is gitignored, and there is no
`.easignore`, so EAS never receives it. No build profile in `eas.json`
declared `env`, and all three EAS environments were empty. So
`process.env.EXPO_PUBLIC_SUPABASE_URL` was `undefined` at build time,
`lib/supabase.ts` threw on launch, and the app died before its first
screen. The build could not fail — from EAS's point of view nothing was
wrong.

**Fix:** the two `EXPO_PUBLIC_SUPABASE_*` values are now EAS project
variables in development/preview/production (`eas env:create`, plaintext —
`EXPO_PUBLIC_*` is inlined into the client bundle by definition and is not
a secret). `eas build` prints which variables it loaded; read that line.

**How to check an APK before publishing the link:**

```bash
unzip -q app.apk -d out && strings out/assets/index.android.bundle | grep -c <project-ref>
```

**Use `strings`, not `grep`.** The bundle is Hermes bytecode. Running
`grep -c` straight at it reported zero matches for `charana.ca` too — a
string that is hardcoded in `lib/api.ts` and definitely present. That false
negative looked exactly like the true one. Always include a control string
you know must be there; if the control comes back absent, the method is
broken, not the build.

**Lesson:** "the build succeeded" says nothing about whether the app runs.
Anything inlined at build time — every `EXPO_PUBLIC_*` — has to be verified
in the artifact, because the failure surfaces on a user's phone, not in CI.

---

## `server-only` refuses to be imported into a test script — and that is correct

**Symptom:** a throwaway `tsx` script that imported `lib/email/send.ts` to
test the real send path died inside `node_modules/server-only/index.js`.

**Cause:** working as designed. `sendEmail` imports `server-only` precisely
so that a future accidental import from a client component fails the build
instead of shipping `RESEND_API_KEY` into a browser bundle.

**Fix, when you need to verify delivery:** import the *templates* (which
have no `server-only`) and send through the vendor SDK directly. That still
exercises the real templates, the real credentials and the real data joins;
what it skips is the thin wrapper (FROM address + quiet-failure reporting).
Say which half you tested.

**Related:** `tsx` needs the file named `.mts`, not `.ts`, for top-level
`await` — otherwise it emits CJS and fails with
`ERR_REQUIRE_ASYNC_MODULE`.


---

## PostgREST silently caps a select at 1000 rows — `.limit(10000)` does not lift it

**Symptom:** a "count cities" check over `businesses` returned ~1,000 rows
and no «نامشخص» at all, right after the directory had grown to 2,065.

**Cause:** Supabase's default `max-rows` is 1000. `.limit(n)` above that is
clamped, with no error and no warning. Any script that loads "all rows"
with a single select was correct only while the table was small.

**Fix:** page with `.range(from, from + 999)` in a loop until a short page
comes back (see `scripts/import-hamvatan.mts`). **Lesson:** every
"load everything" query written before 17 Aug was tested against ≤680 rows;
audit any you touch.

---

## A shared phone number is not proof of a duplicate

**Symptom:** the first Hamvatan dry run wanted to merge a realtor into a
construction company because they share a phone.

**Cause:** in this directory the same number really is used by one person
for two businesses (realty + renovation, hairstyling + photography). Phone
is a strong *link*, not identity.

**Fix:** phone + a shared name token → same; phone alone → adjudicate with
the full model given both full records, and let it say "unsure" (which
means: don't insert, don't merge, list for a human). gpt-4o-mini failed
this test outright — it called گرین کیبلز الکتریک and Green Cables Tech
different. **Lesson:** dedupe rules must be derived from the real data,
and the cheap model is not good enough for Persian↔English identity.

---

## Hamvatan's `?page=` past the last page re-serves page 1

**Symptom:** the Antigravity scraper's first pass produced duplicates and
believed categories were larger than they are.

**Cause:** out-of-range `?page=N` returns page 1 with HTTP 200 — no 404, no
empty list. A page-counter loop never terminates on its own.

**Fix:** follow `<link rel="next">` and stop on the first repeated card id.
**Lesson:** never trust a paginator's counter; trust the ids.

---

## Paging Supabase by `created_at` repeats and drops rows

**Symptom:** an audit found "duplicate" hamvatan rows with identical slugs —
which a unique `taken` set makes impossible. They were phantoms.

**Cause:** `.order("created_at").range(0,999)` then `.range(1000,1999)`:
batch inserts share a timestamp, so the sort is unstable across page
boundaries — the same row appears on two pages while another is never
returned. In the importer this meant a listing could fail to see its
existing match and be inserted twice.

**Fix:** page by a unique key (`.order("id")`). **Lesson:** every keyset /
offset page needs a total order.

---

## A shared website host is a platform, not a business

**Symptom:** five different RBC mortgage agents were merged into one
existing listing, «سپیده ثابت». Century 21, Mortgage Alliance, Right at
Home Realty, Royal LePage, zil.ink did the same.

**Cause:** rule 1 of the importer said "same website host → same business".
For a personal site that is right; for `mortgage.rbc.com/<agent>` it is the
opposite — the host is shared by everyone at the brokerage.

**Fix:** a platform denylist plus host frequency across DB and source; a
shared host counts only with the exact path *and* a name or phone in
common; a host-only match with nothing else in common is adjudicated by the
model like a phone-only match. 39 merges reverted and re-imported.
**Lesson:** identity keys must be checked for cardinality on the real data
before they are trusted — the same lesson as shared phones, one level up.

---

## Category words are not names

**Symptom:** «مشاور املاک مریم صفری» merged into a row named just «مشاور
املاک» because both contain «املاک».

**Cause:** the name-token overlap treated category words (املاک، وام،
رستوران، dental, realty…) like any other token; two realtors always
"overlap".

**Fix:** category words in both scripts are stop words; a name with nothing
left after stop words overlaps with nothing. 14 merges reverted.

---

## Sources ship filler: Kafka as a business description

**Symptom:** a Taablo restaurant's description began «یک روز صبح، وقتی
گرگور سامسا از رویاهای پریشان بیدار شد…» — *The Metamorphosis*, in Persian
and English, as lorem ipsum. Bazaarche's descriptions are Google-Places
boilerplate; 1,281 Taablo descriptions were just the name repeated.

**Fix:** the importer drops descriptions that echo the name, match lorem /
Kafka, or (Bazaarche) are template prose. **Lesson:** read fifty random
records of a source before importing one.

---

## A concatenated `.select()` string silently becomes `GenericStringError`

**Symptom:** thirty type errors like `Property 'city' does not exist on type
'GenericStringError'` on a query that reads perfectly well — and the same
query written on one line typechecks fine.

**Cause:** supabase-js parses the select list **at the type level**, from a
string *literal*. `"a, b" + "c, d"` and template strings widen to `string`,
which the parser cannot read, so every column resolves to an error type. The
runtime query works; only the types collapse.

**Fix:** keep every `.select()` argument a single string literal, however long,
or a `const` bound to one. **Lesson:** when a Supabase query's row type turns
into nonsense, look at how the select string was built before looking at the
schema.

---

## Hand-written rows in `database.types.ts` are erased by `pnpm gen:types`

**Symptom:** types for a table you just added disappear.

**Cause:** `database.types.ts` is generated from the *live* schema. Adding a
table by hand is the only way to typecheck before the migration is pushed, and
regenerating afterwards correctly overwrites it.

**Fix:** the right order is push, then generate, then typecheck. Hand-write the
block only to get moving, and mark it — the jobs board's block was added by
hand at 05:00 and replaced by the generator ten minutes later.


---

## Tailwind preflight kills every list marker

**Symptom:** a Markdown-rendered `- item` list shows no bullets at all, and the
`li::marker` colour rule in `globals.css` appears to do nothing.

**Cause:** Tailwind's preflight sets `list-style: none` on every `ul` and `ol`.
A `::marker` rule cannot colour a marker that is not being generated.

**Fix:** `list-style: disc` / `decimal` explicitly on the prose container's
lists. `.job-md` does; **`.prose-fa` (the blog) still does not** — its
`::marker` rules have never rendered.

---

## A toolbar that edits a controlled textarea loses the caret

**Symptom:** clicking a formatting button inserts the right text, then the next
keystroke lands at the very top of the field.

**Cause:** `onChange` re-renders the textarea, and React restores its own idea
of the selection afterwards — after any `setSelectionRange` in the click
handler, and after `requestAnimationFrame` too.

**Fix:** stash the wanted caret in a **ref** and apply it in `useLayoutEffect`
keyed on the value, so it runs after the commit and before paint. Not state:
`setState` inside the effect that consumes it is a cascading render, and
eslint's `react-hooks` rules reject it.

---

## Stripping Markdown is not sanitising

**Symptom:** a job page rendered clean in the browser while its `JobPosting`
JSON-LD and meta description carried `<script>`, `<img onerror=…>`, a
`javascript:` link and a spam URL.

**Cause:** `stripMarkdown()` understands Markdown syntax and nothing else. HTML
tags, raw URLs and dangerous link targets are not Markdown, so it passed all of
them straight through. The visible page was clean only because the *renderer*
normalises first.

**Fix:** one function, `jobDescriptionPlain()`, that normalises **then** strips,
used by every plain-text output. **Lesson:** when the same content leaves by two
routes, check both. The one you can see is not evidence about the one you
cannot.


---

## React Native `<Image>` cannot decode SVG, and fails silently

**Symptom:** a logo tile in the app renders as an empty box. No error, no
broken-image icon, no console warning.

**Cause:** RN's `<Image>` has no SVG decoder. It does not fall back — it draws
nothing. Some imported logos are `.svg` (ashavid.ca serves one), and on the web
they render perfectly, so the bug only exists on one platform.

**Fix:** treat an `.svg` URL as absent on mobile and use the same placeholder
as a listing with no logo. **Lesson:** an image that "does not appear" in RN is
as likely to be an undecodable format as a missing URL — check the extension
before checking the data.

---

## A JSX comment cannot sit in a ternary branch

**Symptom:** `Expected '</', got 'ident'` from Turbopack, pointing at a line
that looks fine.

**Cause:** `{cond ? ( {/* note */} <div/> ) : null}` — inside the parens the
parser is reading an *expression*, and `{/* … */}` is only valid where JSX
children are. Written twice in one session, both times while adding a comment
to explain a layout decision.

**Fix:** put the comment above the `{cond ? (` line, or inside the element as
its first child.

---

## `items-center` collapses a grid cell whose only content is a fill image

**Symptom:** a two-column card renders with one side blank. The `<Image fill>`
is in the DOM and the URL is correct.

**Cause:** `fill` needs a positioned parent with a real height. The parent's
height came from the grid row, and `items-center` sizes each item to its own
content — which for a div containing only an absolutely-positioned image is
zero.

**Fix:** `items-stretch`, plus an explicit `min-h` so the cell has a height
before the image loads.

## Multi-byte characters inside a regex character class (byte-mode perl/sed)

**Symptom.** After a bulk `perl -pi -e 's/[čČ]ārana/GOPLAZA/g'`, 41 files
carried an invalid byte (`\xC4`) right before every `GOPLAZA`; `iconv -f
UTF-8` failed, TypeScript did not complain, the browser showed `�`.
**Cause.** Without `-CSD -Mutf8`, perl matches bytes. `č` is two bytes
(`C4 8D`); inside `[…]` the class becomes a set of *single bytes*
`{C4, 8D, 8C}`, so it matched the second byte of `č` and left the first.
**Fix.** Never put non-ASCII letters in a character class in byte mode —
write alternation (`(?:č|Č)ārana`) or run with `-CSD -Mutf8`. After any
bulk text edit, run `for f in $(git diff --name-only); do iconv -f UTF-8 -t
UTF-8 "$f" >/dev/null || echo BAD $f; done`.
**Lesson.** A tool that "worked" on ASCII data is not proven on Persian
data. Same family as the digit trap.

## PostgREST silently caps an unbounded select at 1,000 rows

**Symptom.** The sitemap listed 1,000 of 5,120 businesses. `llms-full.txt`
exported 1,000 while its header said "full". `/provinces` displayed 998.
Most city×category pages fell below `MIN_INDEXABLE` and vanished from the
sitemap. No error anywhere, in any log.
**Cause.** PostgREST's `max-rows` is 1,000 on this project. A `select` with
no `.range()` returns the first 1,000 rows and reports success. Adding
`.limit(5000)` does **not** help — the server limit wins.
**Fix.** `lib/supabase/fetch-all.ts` — `fetchAllRows(() => query)` pages with
`.range()` until a short page arrives. Takes a factory, because a
PostgrestFilterBuilder is a thenable and cannot be awaited twice.
**Lesson.** Any query whose result you `.length` or iterate as "all of them"
is suspect. Two independent checks disagreeing (an exact `count` head-query
saying 5,120 next to a `.length` saying 1,000) is the tell.

## A canonical on the root layout de-indexes the whole site

**Symptom.** After adding `alternates: { canonical: "/" }` to
`app/layout.tsx`, `/about` emitted `<link rel="canonical" href="https://…/">`.
**Cause.** Next merges metadata down the tree; a canonical on a layout is
inherited by every page that does not set its own. Every page then tells
Google "the homepage is the real version of me".
**Fix.** Canonicals belong on pages, never on a layout. Same for
`openGraph.url`.
**Related.** Next replaces `openGraph` shallowly rather than merging it, so a
page that declares `openGraph` without `images` loses the inherited default —
name the fallback explicitly (`OG_FALLBACK`).

## Relative canonicals defeat a domain migration

**Symptom.** `<link rel="canonical" href="/jobs">` — no origin.
**Cause.** `metadataBase` was never set, so Next emitted the path verbatim.
A relative canonical resolves against the host that served the page, so every
page served from the old domain self-canonicalised there.
**Fix.** `metadataBase: new URL(env.baseUrl)` in the root layout.
**Lesson.** It looks harmless while one domain exists. It only bites when a
second one appears — which is precisely when canonicals matter most.

## Stripe has no "2-year" or "quarterly" interval — it's interval × interval_count

**Symptom.** Would be: `Stripe.prices.create({ recurring: { interval:
"quarter" } })` throws, because `"quarter"` is not a valid `interval` value.
**Cause.** Stripe's `recurring.interval` is only `day|week|month|year`; a
different cadence is `interval_count` on one of those — 2-year billing is
`{interval:"year", interval_count:2}`, quarterly is
`{interval:"month", interval_count:3}`.
**Fix.** `packages/core/src/plans.ts`'s `BillingInterval` type (`month`,
`year`, `"2year"`, `"quarter"`) is our label, never Stripe's. Two mapping
points, both one-directional and must be kept in sync manually if a fifth
interval is ever added: `scripts/seed-stripe-plans.mts`'s `STRIPE_RECURRING`
(ours → Stripe, at price-creation time) and `app/api/stripe/webhook/route.ts`'s
`billingIntervalFromStripe` (Stripe → ours, reading a subscription back).
**Lesson.** Whenever a billing cadence beyond month/year is added, check
both directions before assuming `recurring.interval` alone tells you
anything — `interval_count` is not optional context, it can change what
the interval *means*.

## storage.list() on a missing bucket succeeds — empty, no error

**Symptom.** The admin backup UI showed a normal «هنوز پشتیبانی گرفته نشده»
empty state and a green infra probe while the `backups` bucket did not
exist at all.
**Cause.** supabase-js `storage.from(bucket).list()` returns `data: []`
with no error for a nonexistent bucket. Absence and emptiness are
indistinguishable through list().
**Fix.** Ask existence explicitly: `storage.getBucket(name)` — null data
means missing. Used by both the backup route and the settings-page probe.
**Lesson.** A probe that cannot fail is not a probe. Verified against the
live project before shipping the green light.

## A shared firm website is not an identity — the importer deleted three real people

**Symptom.** `import-listings.mts` on the iranianlawyer.org export reported
«after in-file de-duplication: 186 (dropped 3)» for 189 scraped lawyers. The
three were never mentioned again: not in `inserts`, not in `enrich`, not in
`review`. 189 went in, 186 were planned, and nothing in the report said which
three vanished or why.
**Cause.** Step 1's collapse rule was `same phone AND (names overlap OR same
website host)`. Three pairs of genuinely different lawyers share a firm's
reception number *and* the firm's homepage — Beygi/Yeganeh at englobelaw.com,
Baghshahi/Naseri at mohajerbal.com, Haghighi/Samiei at sc-law.ca. The host
clause declared each pair one business and silently dropped the poorer record.
**Fix.** The collapse now requires `namesOverlap` — a shared host alone no
longer merges anything — and every collapse is recorded in the report under
`collapsed_in_file` (kept, dropped, why). Dropping the host clause is the safe
direction: a listing that really is a duplicate still reaches the DB-matching
stage, which adjudicates shared-phone cases with the model and can route to
`review` instead of deleting.
**Lesson.** The phone rule already learned that a shared number is not
identity; the host clause was the same mistake wearing a different hat. And a
step that can remove records must say what it removed — an unexplained
`189 → 186` is the bug hiding, not the bug reporting itself.

## iranianlawyer.org serves its sitemaps with HTTP 404 and a valid body

**Symptom.** The new scraper found «0 lawyer profiles worldwide» while
`curl` on the same URL printed a full `<urlset>` with 707 entries.
**Cause.** `wp-sitemap.xml` and `wp-sitemap-posts-lawyers-1.xml` answer **404**
while serving the complete document. The shared `get()` helper correctly
treats 404 as "gone" and returned null. Real lawyer pages 200 and a made-up
one 404s, so the status code is trustworthy for detail pages and worthless for
sitemaps on this host.
**Fix.** `getSitemap()` reads the body regardless of status. Safe because it is
self-validating — no `<loc>`, no URLs, and the run exits loudly with a
non-zero code rather than writing an empty export.
**Lesson.** Also worth knowing: that site's `/location/canada/` archive renders
44 profiles and links a `page/2` that 301s back to page 1, while the real
Canadian count is **189**. Never trust a listing archive for completeness —
enumerate from the sitemap and filter on each record's own data. Summing the
province archives (49) was the first hint the country archive was lying.

## A spreadsheet of businesses goes through import-listings, never import-businesses

**Symptom.** A 721-row CSV was handed over as "import these too". Its columns
match `normalizeImportRow` exactly, so `import-businesses.mts` looked like the
obvious tool.
**Cause.** `import-businesses.mts` de-duplicates **only inside its own file**.
Against the database it does nothing but reserve slugs — a colliding name just
becomes `-2` and is inserted anyway. That CSV was **96% already in the
directory** (632 of its 633 IranJavan rows, imported back in August, plus 57
of 87 OCR rows), so it would have created ~690 duplicate listings.
**Fix.** `scripts/csv-to-listings.mts` converts a spreadsheet into
`SourceListing[]`, which then goes through `import-listings.mts` and its real
matching. Result on that file: 664 existing rows enriched, 43 genuinely new
rows inserted, 3 held for review. Rows have no per-record URL, so provenance
is a `<file>#row-<n>-<source>` token — never a URL invented to look real.
**Lesson.** Check the overlap **before** choosing an importer: hash the
incoming phones and names against the DB and count. Two minutes of counting
decides which of two similar-looking scripts is the safe one.

## Two identical names with one phone still slipped through — nameTokens was empty

**Symptom.** The CSV import created `xo-center-2` beside an existing
`xo-center`: same name, same city, same phone written two ways
("905-883-1234" and "9058831234").
**Cause.** Two compounding defects. (1) `namesOverlap` is pure token overlap,
and `nameTokens("XO CENTER")` is the **empty set** — "xo" is under the 3-char
floor and "center" is a stop word — so two identical names "shared nothing"
and fell through to model adjudication. (2) That fallback adjudicated
`phoneRows[0]` only. Several DB rows shared that number; the model was shown
`supermarket-toranj`, correctly said "different", and the row was inserted —
while the real `xo-center` further down the same list was never compared.
**Fix.** `namesOverlap` now returns true on an exact folded-name match before
consulting tokens, and the fallback sorts the phone-sharing candidates (same
city, then closest name) so the model sees the most plausible one. The stray
row was merged back by hand — its only unique field, `sub_category`, was
copied onto the keeper first — and a directory-wide sweep confirms **0** rows
sharing a normalised name and a phone.
**Lesson.** A name made entirely of stop words and 2-letter tokens is
invisible to token matching; exact equality must be checked first. And when a
key can point at several rows, "take the first one" is a coin toss dressed up
as a decision — rank the candidates or compare them all.

---

## `search_businesses` returns fewer columns than the `businesses` table

**Symptom:** the same `BusinessCardView` shows the «ویژه» chip on a category
screen and not on a search result for the same business — with no error, no
warning, and a type that says both rows are `BusinessCard`.

**Cause:** the RPC projects its own column list (`plan`, `plan_until` and the
ranking fields are in it; `view_count`, `saved_count`, `created_at` and
`website` are not). Both call sites then cast the result to the same type, so
TypeScript agrees they are identical and the missing fields arrive as
`undefined` at runtime.

**Fix:** the fields the RPC does not return are optional on `BusinessCard`
(`view_count?`, `saved_count?`, `created_at?`) so the type stops claiming
otherwise. If a *rendered* field is ever added to the card, add it to the RPC's
`returns` clause in the same change, not just to the cast.

**Lesson:** a cast is not a check. Two rows with one type name can have two
different shapes, and the surface that notices is the UI, silently.

---

## A `count: "exact"` select still counts everything, whatever the limit says

**Symptom:** expecting `.select(cols, { count: "exact" }).limit(1)` to be
cheap-and-wrong, and being surprised the count is the real total.

**Cause:** in PostgREST the count is computed over the filtered set, not the
returned page. The `limit` bounds the rows in the body only.

**Fix:** this is the behaviour to rely on, not to work around — it is how the
mobile listing screens learned to say «۱۰۰ از ۱٬۶۹۹» instead of counting the
page they happen to hold. Beware the mirror image though: `rows.length` is a
page size and must never be printed as a total.

**Lesson:** before printing a number to a user, ask which set it counts. The
mobile listing screens printed «۱۰۰ کسب‌وکار» for a Toronto category matching
1,699 for two months, and it read perfectly.

---

## "Humanise" passes invent facts, and they do it convincingly

**Symptom:** the blog's second model pass — the one that rewrites the prose in
a human voice — produced, from a draft that contained neither: "در بعضی مدارس
ریچموند هیل، والدین ... تا ۱۵ درصد صرفه‌جویی کرده‌اند" and "ما در گوپلازا
دیده‌ایم که برندهای خاص پوشاک در **تابستان ۲۰۲۳**…". GOPLAZA launched in 2026.
The same pass also slipped into first-person singular ("وقتی به این اعداد نگاه
می‌کنم") in an article whose brief forbade it.

**Cause:** the first pass is told "quote only the FACTS given" and obeys. The
second pass is told to make the prose vivid and concrete — and a model asked
for concreteness with nothing concrete to hand will manufacture it. The style
rules ("never first-person singular", "do not invent statistics") lived only in
the *draft* prompt; the humanise prompt never restated them, so they did not
survive the rewrite.

**Fix:** two things, and the deterministic one matters more.
`lib/blog/pipeline.ts` now compares the digits before and after every creative
pass (`inventedNumbers()`, Persian digits folded, separators ignored). `expand`
keeps the shorter draft if new numbers appear; `humanise` retries once with the
offending figures named, then falls back to the draft prose. Separately,
`HUMAN_VOICE` restates the bans the draft prompt already carried.

**Lesson:** every rule you want to survive a pipeline must be repeated in every
prompt of that pipeline — a constraint stated upstream does not propagate. And
where a rule can be checked with code instead of asked for in a prompt, check
it: a regex over digits caught what three paragraphs of careful instruction did
not.

---

## `buildInventory()` cannot run outside the Next runtime

**Symptom:** a script that imports anything from `lib/blog/pipeline.ts` and
calls `buildInventory()` dies with `Invariant: incrementalCache missing in
unstable_cache`.

**Cause:** it reaches `countCategoryCities` → `lib/seo/geo-index.ts`, which
wraps its query in `unstable_cache`. That only works inside a request or build,
not in a bare `tsx` process.

**Fix:** exercise the writers from a route (`/api/cron/blog-source?dry=1`), or
hand them a hand-built inventory object of the same shape when testing offline.
Do not "fix" it by unwrapping the cache — the cache is why the city×category
counts do not cost a query per page render.

**Lesson:** a function is only portable if everything under it is. Check what
your imports import before promising a script it can call them.

---

## A directory's sitemap can be short by thousands of URLs

**Symptom:** none. Scraping gooyalisting.ca from its sitemaps yields 5,471
listings and looks complete.

**Cause:** Yoast splits `listing-sitemap1..8.xml`; `sitemap1` serves an empty
`<urlset>` and the rest are capped. The site's own REST collection answers
`X-WP-Total: 7,471`. Two thousand businesses were missing with no error, no
404, and no gap in the numbering to notice.

**Fix:** enumerate from the CPT's REST collection and treat the sitemap as a
hint. Cross-check the count against `X-WP-Total` before trusting any
enumeration. Related WordPress traps found on the same site: the `rest_base`
can differ from the post type (`/wp/v2/listings`, not `/wp/v2/listing`), and
`meta` comes back `[]` even when the post has plenty of it, so postmeta still
costs a detail-page fetch.

**Lesson:** "the sitemap said so" is not a count. `CLAUDE.md` says to enumerate
*our* routes from `sitemap.xml`; that rule is about our own site, where we
control the generator. On someone else's site the sitemap is marketing output,
not an inventory.

---

## The site footer will happily become every business's phone number

**Symptom:** a scrape in which all 7,471 records share one phone, one email
and one address.

**Cause:** gooyalisting.ca prints the *directory operator's* contact block in
its footer on every page. A document-wide `tel:` / `mailto:` sweep cannot tell
it from the listing's own. It is invisible while testing on a page that has a
contact box, because the listing's details appear first and a `.first()` picks
the right one by luck.

**Fix:** scope every contact selector to the listing's own container
(`.wilcity-sidebar-item-business-info` there). Then test on a listing with
**no** contact details — that is the only page where the bug shows.

**Lesson:** pick your test page for where the code is weakest, not for where
the data is richest.

---

## RTL drags the `+` to the end of a phone number

**Symptom:** `tel:14506391629+` in the markup, and phones that fail every
`^\+?1` check downstream.

**Cause:** the number is stored as `+1 450 …` and the RTL layout writes the
plus last. It is not a suffix and not a typo — every phone on the site looks
like this.

**Fix:** move a trailing `+` back to the front before normalising. Note that
`p.replace(/\+(?!^)/g, "")` does **not** mean "keep a leading plus" — it
strips the one at index 0 too. Capture the lead explicitly.

**Lesson:** the RTL digit trap already cost this project sign-in and
verification. It is not only about Persian digits; direction reorders ASCII
punctuation in stored strings as well.

---

## A location label that names a city can mean the province

**Symptom:** an import plan reading `Quebec City 556` against `Montreal 344`
for a Persian-Canadian directory.

**Cause:** gooyalisting.ca files 636 listings under the taxonomy term
`کبک سیتی`. The term translates to "Quebec City" and means the province: the
listings' area codes are 397×514/438 (the island of Montreal) and 13×450
against **7** ×418/581 for the actual city, and their own prose says مونترال
311 times to Quebec City's 4. Adding `"کبک سیتی": "Quebec City"` to
`CITY_ALIASES` — a change made *to improve* city coverage — would have filed
roughly 550 Montreal businesses in the wrong city.

**Fix:** `کبک سیتی` and `کبک` are `CITY_JUNK`, so they resolve to nothing.
Where a source's taxonomy is coarser than its prose, `cityFromProse` in
`import-listings.mts` takes the city the listing's own text names, as the last
fallback after street, postal code and the source label, and only when the
text names exactly one city.

**Fastest check:** area codes. A column of 514s under a label that says
anything other than Montreal is the whole diagnosis, in one query.

**Lesson:** verify a translated label against the data it covers before
trusting it, especially when you are the one adding the alias. Every new city
alias is a claim about hundreds of rows.

---

## A refusal must not have to fill in the whole form

**Symptom:** the source writer's first live run threw `No object generated:
response did not match schema` on exactly the two atash.ca articles it *should*
have rejected — a Trudeau-and-Katy-Perry story and a "police mistook a statue
for a person" piece. The one usable article wrote fine.

**Cause:** the read step's zod schema carried `usable: boolean` alongside
`facts.min(1)`, `must_link.min(1)`, `image_scenes.min(2)`. A model saying *no*
has no angle, no links and no image scenes to give — so a correct refusal was
structurally invalid, and the useful part (the reason) was thrown away with it.
Relaxing them to `.default([])` was **not enough**: a rejecting model does not
omit those keys, it sends `null`, and a zod default does not accept null.

**Fix:** everything past `usable` is `.nullish().transform(v => v ?? fallback)`
(the `orEmpty` helper in `source-writer.ts`). Completeness is then checked in
code — `briefGap()` — where a "yes" with nothing behind it becomes a *skip with
a reason* instead of an exception. After the fix both articles were refused
properly, with reasons an admin can read.

**Lesson:** when a schema has an escape hatch, every other field has to be
optional *and* null-tolerant, or the escape hatch is unreachable. And check
what your validator does with `null` versus missing — they are not the same
value, and models pick the one you did not handle.

---

## A markdown link without a leading slash sails straight through the link gate

**Symptom:** a generated post shipped with `internal_links: []` while its body
was full of links — and the links rendered as the literal text "/search" and
pointed at `/blog/<slug>/search`.

**Cause:** the model wrote `[/search](search)` — path as the anchor text, href
with no leading slash. `enforceLinks()` matched only `](/…`, so those links were
neither *recognised* (hence the empty `internal_links`) nor *demoted* to plain
text. They were the one thing the gate exists to prevent — a blog that 404s
inside itself — and the gate could not see them.

**Fix:** hrefs are normalised before they are judged (missing slash added,
`#`/`?` and trailing slashes trimmed), outbound and `mailto:`/`tel:` links are
stripped to text, and when the visible anchor text is itself a path it is
replaced with the inventory's own Persian label. The rewritten post came back
with eight well-formed links and natural anchors.

**Lesson:** a validator that only matches the well-formed case validates
nothing. Normalise first, then judge — and make the malformed case fail loudly
rather than pass invisibly.

---

## The desktop nav had no slack left, and the breakpoint hid it

**Symptom:** adding one link («مقالات») to the header bar pushed
`.site-header-inner` into horizontal overflow at desktop widths just above
the nav's breakpoint. Nothing looked broken at 1280px, where the work was
done.

**Cause:** `.header-nav` switched on at `min-width: 900px` with a flat
`gap: 1.35rem`. Measured at exactly 900px, the four links plus three menu
triggers already needed **568px inside 567px** of available width — the row
had been full since the third dropdown was added, and the header overflowed
by ~9px the moment anything else joined it. The breakpoint was chosen for the
bar of an earlier session, and nobody re-measured it after the bar grew.

**Fix:** the gap is fluid (`clamp(0.85rem, 1.35vw, 1.35rem)`) and the desktop
bar now takes over at `min-width: 960px`. At 960 the items measure 472px
inside 602px — 130px of slack. Below 960 the burger menu carries the same
links, so nothing is lost.

**How to measure it without a screenshot:** clone `.site-header-inner` into a
fixed-width absolutely-positioned holder in the page and read
`inner.scrollWidth` against that width. Note that media queries still answer
to the *real* viewport, so the browser viewport has to be resized too — a
clone at a fake width will keep the display value of the real one.

**Lesson:** a navigation bar has a width budget, and "it fits on my screen"
tests the widest case only. Measure at the breakpoint, which is the narrowest
width the desktop layout ever has to survive.

---

## Committing code that imports a file you never committed kills every deploy, silently

**Symptom:** the live site is stale for days. Everything works locally, `pnpm
build` passes, `tsc` is clean, pushes succeed, and nobody sees an error. On 25
Aug the site was found serving a build from **before 18 August** — a week of
shipped work that had never reached a user, including a fix for the bug that
was being complained about at the time.

**Cause:** `8aae807` committed `lib/seo/local.ts`, `sitemap.ts` and four page
files that import `@/lib/seo/geo-index` and `@/lib/data/category-aliases`, and
committed neither module. `lib/seo/entity.ts` grew `listingOgImage` in the
working tree and was never committed either. Locally everything resolves,
because the files are on disk. A clean checkout cannot compile:

```
app/businesses/[slug]/page.tsx(21,41): error TS2307: Cannot find module
  '@/lib/seo/geo-index' or its corresponding type declarations.
```

Vercel builds a clean checkout. Every deploy since had failed in CI, where
nobody was looking.

**Fix:** commit the missing modules. Then check the deploy actually went green
rather than assuming a push equals a release.

**How to catch it in one command** — never trust `git status` for this, since
untracked files are easy to skim past:

```bash
git worktree add --detach /tmp/check origin/main && \
  (cd /tmp/check/apps/web && npx tsc --noEmit)
```

**Lesson:** "it builds on my machine" and "it builds from the repository" are
different claims, and only the second one ships. A push is not a release —
verify against the live URL. This is also why the deploy check belongs in the
end-of-session ritual: the same session that wrote the code is the one that
still remembers what the live site should now say.

---

## `citext` makes a regex CHECK case-insensitive too

**Symptom.** `link_pages.handle` is `citext` and its CHECK constraint spells out
`^[a-z0-9]...$` — lowercase only, in plain sight. Yet
`handle_available('Kabab-Sara')` returned `true`, and an insert would have
stored the capitals.

**Cause.** `citext` overloads the comparison operators so that equality and
lookup ignore case. The regex operators `~` and `!~` are part of that set. So a
pattern that literally says "lowercase letters" stops meaning it the moment the
column is `citext`. The type is doing exactly what it was chosen to do; the
pattern is the thing that silently changed meaning.

**Fix.** Cast to `text` for the format test and leave the column `citext`:

```sql
check (handle::text ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$')
```

Uniqueness and lookup stay case-insensitive, which is why `citext` is there.
The pattern goes back to meaning what it says.

**A second hole found at the same moment.** The original pattern was
`^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$`, whose whole tail is optional — it
matches a single character. The three-character minimum existed only in
`validateHandle()` in TypeScript. The database, which has no `HANDLE_MIN`,
would have accepted `a`. Put a length floor in the pattern (`1 + {1,28} + 1`),
not beside it.

**Lesson — and this is the part worth keeping.** There was already an assertion
in `packages/core/src/link.check.mts` comparing the TypeScript regex to the SQL
one. It passed. They were byte-identical. **They were also both wrong, in the
same two ways.** An equality assertion proves two sides agree; it can never
prove they are right, and a shared source of truth propagates a mistake as
faithfully as it propagates a rule. Calling the function against the real
database found both holes in about a minute. Run the thing. "The SQL parses"
and "the SQL ran" are different sentences.

---

## A daily rollup is not a total, and the shape will not tell you

**Symptom.** The link-page analytics showed «تماس تلفنی ۱» three times, «t.me ۱»
twice, «موبایل ۱» four times. Every category looked like it had been touched
once. The real numbers were 11, 27 and 21.

**Cause.** `link_page_summary` returns **one row per day per value** — it reads
`analytics_daily`, which is a daily rollup. The component mapped those rows
straight into a list, so each row rendered as its own entry and the
`.slice(0, 6)` kept six arbitrary *days* instead of the six biggest
categories. Sorting made it worse by looking deliberate.

**Fix.** Group by value and sum before sorting or truncating:

```ts
function totalBy(rows, eventType, label) {
  const sums = new Map<string, number>();
  for (const r of rows) {
    if (r.event_type !== eventType) continue;
    const key = label(r.value);
    sums.set(key, (sums.get(key) ?? 0) + r.n);
  }
  return [...sums].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}
```

**Lesson.** TypeScript checked this and was satisfied: the rows had the right
shape, and `{value, n}` is `{value, n}` whether it means a day or a total.
There is no type for "already aggregated". Any query whose name ends in
`_summary` or reads a rollup table needs the question asked out loud —
*one row per what?* — and the answer verified against the source numbers, not
against whether the page looks plausible. It looked entirely plausible.

**How this one was actually caught:** by rendering the page and comparing
three figures to a `SELECT` over the raw events. Not by reading the code, and
not by any check that could have been automated from the types.

---

## `check:brand` scans source. The rebrand lived in the database too

**Symptom:** eight days after the čārana → GOPLAZA rebrand, with
`pnpm check:brand` passing and the whole repo clean, the new Telegram channel
posted an article whose excerpt read "با چارانا به راحتی می‌توانی…". Checking
the table: **23 of 74 published posts** still carried the old brand — in
`body_md`, `summary_en`, `excerpt`, `tags` and `faq` — and every one of them
was live on goplaza.ca the whole time.

**Cause:** `scripts/check-brand.mjs` walks the working tree. The blog is not
in the working tree; it is rows. Those posts were written by the generator
*before* 18 August, when the prompt still said čārana, and nothing has ever
looked at them since. The guard was doing exactly what it was built to do and
the content it could not see drifted out from under it.

**Fix:** `scripts/fix-blog-brand.mts` — dry by default, `--apply` to write,
idempotent, reading the replacements from `brand.ts` rather than typing them.
Narrow on purpose: reader-facing text fields only, never `slug` (a published
URL must not move) and never inside a URL or an email, because `charana.ca`
still resolves and `imports@charana.ca` is a real mailbox.

Worth keeping from writing it: the first version stashed protected URLs as
` ${i} ` and restored on `/ (\d+) /`, which would have written a stashed URL
over any bare " 5 " already in an article. It was caught by reading the dry
run instead of trusting it, and the placeholder is now NUL-delimited with a
post-condition that throws if one survives.

**Lesson:** a guard is scoped to what it can see, and nobody writes that scope
down. When a rule is about *content* — a brand, a claim, a disclaimer — ask
where the content actually lives before believing the check that says it is
clean. Generated content is the worst case: it was written under a prompt
that has since changed, and it never gets re-read.


## An admin-generated magic link cannot sign anyone in here

**Symptom.** `POST /auth/v1/admin/generate_link` returns a working
`action_link`. Following it lands on `/auth/error` instead of a session.

**Cause.** The generated link redirects with the tokens in the URL **fragment**
— `…/auth/callback?next=/x#access_token=…&refresh_token=…` — which is the
implicit flow. `app/auth/callback/route.ts` reads `?code=` and redirects to
`/auth/error` when it is absent, and a fragment never reaches the server
anyway.

**Fix.** None applied yet. The app's own magic links are unaffected: they come
from `signInWithOtp()` in the browser, which uses PKCE and does return a
`code`. (Written 26 Aug when **nothing** in the codebase called
`signInWithOtp` — it described the path the login form would take if it had
one. The login form got one the same day; the sentence is true now, and was
not when it was written.) What does not work is the admin path — so today nobody can hand a user
a working sign-in link out of band, and no automated check can drive a signed-in
page without a typed password.

**Lesson.** "We support magic links" is true of one code path and false of
another that produces the identical-looking URL. When a flow is verified only
through the UI that generates it, the other generator is untested by
construction. Found 26 Aug 2026 while trying to render `/auth/signup-success`
as a signed-in user.


## Twenty components were calling toast() and nothing was ever drawn

**Symptom.** No feedback at all on actions that report through sonner —
publishing from a moderation queue, saving an announcement, claiming a
listing, toggling busy status. The action worked; nothing said so, and nothing
said when it failed either.

**Cause.** `<Toaster />` was never mounted. Twenty client components import
`toast` from sonner; the renderer that draws those toasts was not in the root
layout, so every call went nowhere. Nothing errors — sonner queues to a
component that does not exist.

**Fix.** `<Toaster />` in `app/layout.tsx`, with `dir="rtl"` (sonner follows
the document direction only when told) and the Vazirmatn variable so a Persian
message is not drawn in the fallback face.

**Lesson.** A missing renderer is invisible to every check we run: it type-
checks, it builds, the call site reads correctly, and the action it reports on
succeeds. Only looking at the screen finds it — and only if you look at the
screen *after* doing something that should produce a message. Found 26 Aug
2026 while adding the first toast to `/profile`, which means the new code would
have been silent too.

## A `select()` that is narrower than the type reading it

**Symptom.** The profile form rendered an empty avatar, phone and birth date
for an account that had all three saved. Uploading an avatar showed it until
the next reload, then it was gone.

**Cause.** `ensureUserProfile` had selected six columns since 11 Aug while
`ProfileForm` read `avatar_url`, `mobile_number`, `birth_date` and `bio` off
the same object. The prop was typed `any`, so every one of those reads was
`undefined` and nothing complained anywhere.

**Fix.** One `PROFILE_COLUMNS` constant used by both queries in that file, and
a real `AppProfile` type with the columns on it.

**Lesson.** `any` on a prop does not just skip a check — it converts "this
column was never fetched" into "this field is empty", which is a plausible
state. The bug then looks like the user never filled the field in. Any time a
row crosses a boundary as `any`, the column list on the other side is
unverified by construction.


## A lower-case CHECK and a case-preserving parser: the first real submission failed

**Symptom.** Submitting `https://t.me/GoPlaza` — the project's own channel —
returned «ثبت کانال ناموفق بود» and nothing else. Every field was valid.

**Cause.** `channels.tg_username` carries
`CHECK (tg_username ~ '^[a-z][a-z0-9_]{3,31}$')`, and `telegramUsername()`
returned the username with whatever casing the URL had. `'GoPlaza'` fails that
regex, Postgres raises `23514`, and the server action's catch-all turned it
into a generic failure. **Any handle with a capital letter could never be
submitted**, which is most of them.

Two other things it broke quietly: the duplicate check
(`.eq("tg_username", username)`) was case-sensitive, so the same channel could
have been stored twice under two spellings, and the unique index would not
have stopped it.

**Fix.** `telegramUsername()` lower-cases what it returns — Telegram usernames
are case-insensitive, so a canonical form is correct anyway, not merely
convenient. Invite codes (`t.me/+abc`) are left alone: those ARE
case-sensitive and lower-casing one produces a dead link.

**Lesson.** A CHECK constraint that narrows a value's shape is only safe if
something canonicalises the value on the way in; otherwise it is a landmine
laid at write time and stepped on by a user, with the error surfacing as a
generic failure message. Both were written the same afternoon by the same
person, which is exactly when this is easiest to get wrong — the same shape as
`citext` making a regex CHECK case-insensitive, one entry above. Found 26 Aug
2026 on the very first real submission.

**Also fixed in the same commit:** the form asked for a URL. It asks for an id
now — `normalizeJoinUrl()` accepts `GoPlaza`, `@GoPlaza`, `t.me/GoPlaza`, a
`telegram.me` link and a pasted URL with a query on it, and shows the resolved
address before it is stored.

## A layout's redirect does not stop the page from streaming

**Symptom:** `curl` with no cookies read the content of a brand-new
`/admin/standing` page — probe names, headings — despite
`app/admin/(dashboard)/layout.tsx` calling `redirect("/admin/login")` for
anonymous users. Sibling admin pages did not visibly leak (54KB of
`/admin/users` contained zero user emails), which is why nobody had noticed.

**Cause:** App Router renders a layout and its page in parallel. The
redirect aborts the stream when the layout settles — but a page whose
awaits resolve fast can finish rendering first and its HTML is already in
the response. The new page's queries failed fast (its tables were not
applied yet), which made it the first page quick enough to lose the race.
The older admin pages were merely slow enough to win it, every time so far.

**Fix:** the page re-checks `requireAdmin` itself and redirects on failure
(`admin/(dashboard)/standing/page.tsx`). Layout gating is a convenience,
not the gate.

**Lesson:** any admin page whose data can be empty/fast must carry its own
auth check. "The layout gates the section" is a race, not a guarantee —
and it is won by exactly the pages that look too boring to leak.


## "We cannot" and "we have not yet" are different sentences

**Symptom.** The first three channels went live and every one said
«بررسی خودکار برای این مورد ممکن نیست». All three were public Telegram
channels the cron could read perfectly well. It had not run against them yet.

**Cause.** The UI had two states — `measured` and `declared` — and a row that
*can* be measured but has no numbers yet falls through to the second one,
because `memberLineFa()` returns null without a `member_count`. So a channel
owner was told their channel is unreadable when it is simply new.

**Fix.** Three states: `measured`, `pending`, `declared`, decided by whether a
NUMBER is present. Not by `metrics_checked_at` — that column is stamped at
insert to satisfy the measured-rows-carry-a-date CHECK, so it cannot
distinguish a row that has been read from one that has only been queued. The
same stamp made the cron order new channels LAST, because they looked
freshly checked; it orders on `member_count nulls first` now.

**Lesson.** An honesty rule expressed as a binary will eventually meet a third
state, and the fallback branch is where it lands. "Not yet" is the state that
gets swallowed, and it is usually the one a new user is in.

## A rename check that fires on a name nobody renamed

**Symptom.** The first cron run pushed a healthy, live channel back to
`pending_moderation` and off the public list, with «نام کانال از «کانال رسمی
پلازا» به «GoPlaza» تغییر کرده».

**Cause.** The check compared Telegram's title against `channels.title` — what
a **submitter typed**, not what we last read. A Persian directory naming a
channel in Persian is normal; the two were never going to match.

**Fix.** Turned off. Detecting a rename needs a baseline of the title WE last
fetched, which is a `tg_title` column that does not exist yet. Until it does, a
check that unpublishes live entries on a mismatch that is not a rename is worse
than no check — and a queue full of false alarms is a queue that gets ignored.

**Lesson.** A change detector needs both sides to come from the same source.
Comparing a machine reading against a human's free text is not change
detection; it is a spelling contest. Found 26 Aug 2026 on the first real cron
run, and it had been written the same day as a defence against a real abuse
route — which is worth keeping in mind: the defence was sound and the baseline
was wrong.


## The honesty rule pointed the wrong way

**Symptom.** GOPLAZA's own Telegram channel — submitted through the admin
panel by a GOPLAZA admin who does administer it — displayed
«مالکیت تأیید نشده», with copy explaining that proving ownership is impossible
here.

**Cause.** The design deferred *all* ownership proof to a phase-2 bot and gave
the schema no way to record one. So the page was not reporting an unknown; it
was reporting a fact we had and could not store.

**Fix.** `owner_verified_at / _until / _method / _by` plus `owner_user_id`,
mirroring `businesses.verification_method` rather than inventing a second
vocabulary. An admin records the attestation, the badge names the method, and
it lapses in 182 days.

**Lesson.** "Never show what you cannot back" has a twin that is easy to miss:
**never refuse to record what you can back.** A rule that only ever removes
information will eventually delete a true one, and the failure looks like
integrity from the inside — which is why it survived a design doc, a
migration and a review. The test that catches it: for each thing the UI
declines to say, ask whether anyone in the building knows the answer.


## An RLS read that returns nothing is a zero, not an error

**Symptom.** Every channel's view count read zero for every visitor, forever.
The rollup was writing rows and the query was correct.

**Cause.** `analytics_daily` grants anon no SELECT — correct for the rows it
was built for, since a bio page's traffic is part of what the paid tier sells.
Channel counts are published on a public page, and nobody had said so in a
policy. PostgREST returns `[]`, not a 403. `channel_view_count()` failed the
same way: it is a plain SQL function, so it runs with the caller's privileges
and returned 0 to every anonymous visitor.

**Fix.** A policy scoped twice — to `subject_kind = 'channel'` and to channels
the public can open — so it cannot become a door onto link_page rows.

**Lesson.** RLS does not fail loudly; it filters. A missing policy on a count
does not produce an error to notice, it produces a plausible number. And a
SECURITY INVOKER function over an RLS-protected table inherits the same
silence. Anywhere a public page prints an aggregate, check the policy by
querying with the anon key — the service key will always tell you it works.

Found 26 Aug 2026 while adding a view figure to a list; the same defect had
been in the channel page's own view tile from the first commit, and only the
view floor kept it from showing.

## A HEAD select cannot tell "table missing" from "table empty"

**Symptom:** every "is the migration applied?" probe in the admin was green,
including on the settings page, whose probe predates all of this. Measured
against the live project on 26 Aug 2026:

```
HEAD  /rest/v1/platinum_waitlist   → 200, count 0,    error null   (exists)
HEAD  /rest/v1/nope_xyz            → 204, count null, error null   (does NOT exist)
GET   /rest/v1/nope_xyz?limit=1    → 404, "Could not find the table ... in the schema cache"
```

**Cause:** the probes were written as
`const { error } = await admin.from(t).select("x", { head: true, count: "exact" }); ok = !error`.
PostgREST answers a HEAD for an unknown table with **204 and no error**, so
`!error` is true and the probe renders green for a table that is not there.
The one thing the probe existed to catch was the one thing it could not see.

**Fix:** `lib/admin/table-exists.ts` — a real (non-HEAD) select limited to one
row, any error reading as false. Used by the settings, standing and loyalty
admin pages.

**Lesson:** a probe that cannot fail has not been tested. When adding one,
first point it at a name that definitely does not exist and confirm it goes
red.

## setSetting silently fails when updated_by is not a real user

**Symptom:** a verification harness turned the loyalty master switch on,
turned it off again in its `finally`, reported success — and left it **on** in
the database. A money-moving switch, left live by a test that believed it had
cleaned up.

**Cause:** `site_settings.updated_by` is a foreign key to `auth.users`. The
harness passed a placeholder uuid (`00000000-…`), so the upsert failed the
constraint. `setSetting` returns `{ ok: false, error }` rather than throwing,
and the `finally` block ignored the return value.

**Fix:** the switch was forced off with `updated_by: null`, which the column
accepts. Any cleanup that must actually have happened has to CHECK the result
— `void setSetting(...)` in a finally block is a wish, not a rollback.

**Lesson:** two rules. Cleanup code needs its own assertion, and the assertion
belongs in the same run: this was caught only because the post-run probe
printed the setting back and a human read it. Verify the world, not the return
value of the thing you just called.


## `created_by` is not ownership, and widening a filter to it returns the table

**Symptom.** An admin-page query meant to find "businesses belonging to these
fifty users" returned **10,683** rows — the whole directory — and would then
have hit PostgREST's silent 1,000-row cap and computed a money column from an
arbitrary thousand of them.

**Cause.** The filter was `owner_user_id.in.(…) OR created_by.in.(…)`. The
imports account is `created_by` on 10,600+ scraped listings, and its profile
was on page one. So the OR was not broken — it was correct, and correctness was
the problem. `owner_user_id` alone returns 6.

**Fix.** Payment follows `owner_user_id` only. Nobody paid for a listing they
never claimed.

**Lesson.** `06-gotchas` and the ownership model already say created_by ≠
owner. What is new is the failure *shape* at scale: an over-wide filter on a
lookup account does not error and does not look empty — it looks like a busy
account, and then the row cap turns the number into an arbitrary sample with
no error anywhere. Whenever a filter includes `created_by`, ask what it returns
for `imports@charana.ca` before asking what it returns for a person.

Found 26 Aug 2026 while adding four columns to `/admin/users`, by running the
query against the database instead of reading it.

## A parity list is not a screen: the app sold a feature it did not have

**Symptom.** The signed-out «حساب من» tab in the mobile app offered a free
account for three reasons, the third being «ثبت نظر — به بقیه کمک کنید
کسب‌وکار درست را پیدا کنند». There is no way to post a review in the app.

**Cause.** `submitReview()` and `getMyReview()` were written into
`apps/mobile/src/lib/interactions.ts` and never called from anywhere. The
screen that would call them was not built. The only rating the app writes is
`personal_rating`, which lives on the user's own interaction row and is shown
only inside the private-note sheet — private by design, and not a review.
Meanwhile the sales copy on the account tab had been written against the
*intended* feature set.

**Fix.** The card is now «باخبرم کن» (announcement mail), which the interaction
bar really does on every business, and the subtitle above it lists saving,
private notes and ratings, and announcement mail. The unused functions stay:
they are the write path a future review screen needs, and removing them would
hide that the screen is missing rather than record it.

**Lesson.** The 24 Aug parity audit had «Reviews» on the "mobile has it" side
and was not wrong — mobile *reads* reviews. Read and write are separate claims
and a parity table with one row for a feature will hide the missing half. And
the audit never opened the signed-out account screen, because a parity list
directs you to features, not to screens. **When auditing parity, open the
screens a signed-out visitor sees first** — that is where the promises live,
and promises are the thing the house rule is about. Grepping for a function's
definition proves nothing; grep for its *call sites*.
---

## The brand fix was correct when it ran and wrong by evening

**Symptom:** `scripts/fix-blog-brand.mts` rewrote 23 published posts from
چارانا to the current Persian brand at 11:00. By 17:00 all **74** posts held a
forbidden token — including the 23 just fixed.

**Cause:** the Persian display form was shortened گوپلازا → پلازا that same
afternoon, in another session, and `گوپلازا` was added to `check-brand.mjs`'s
FORBIDDEN list. The script reads `brand.nameFa`, so it wrote whatever that
said at the moment it ran. The value changed; the rows did not. A database
does not re-read `brand.ts`.

**Fix:** a second rule, `گوپلازا → brand.nameFa`, and the script re-run (74
posts, 237 fields). The scope guard in `lib/blog/snippets.ts` had the same
disease in miniature — it tested `/گوپلازا|…/` as a literal, so after the
shortening it would have kept passing while checking for a name nobody uses.
It reads `brand.nameFa` now.

**Lesson:** "derive it from the source of truth" protects the code, not the
data the code has already written. Anything a generator stamps into rows —
a brand, a tagline, a URL, a support address — is a copy that goes stale
silently, and the check that would notice only looks at source. Content
migrations are not one-off scripts; they are scheduled jobs that happen to
have run once so far.

**Also:** several sessions share this worktree, and one of them switched the
branch mid-task. Three commits landed on `channels-directory` while
`git push origin main` pushed an unchanged `main` — so the "deploy" being
waited on never existed, and a retry loop spent 27 model calls against the old
code. Check `git status -sb` before pushing, and use `git worktree` to commit
to a branch you are not standing on.
