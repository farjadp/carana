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
