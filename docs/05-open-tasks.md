# Open tasks

**Updated:** 2026-08-26 (late) — the **channels directory** «کانال‌ها و
گروه‌ها» is **built and live**; the migration turned out to be applied
already. It now owns the home-page slot the «چرا گوپلازا؟» card grid held
(Farjad, 26 Aug) and `/channels` is a real paged, sorted, filterable index.
The header was rebuilt in the same work: eight top-level triggers down to
five. **It has been run and looked at.** What is still unproven is anything
that needs a row — the table is empty. Everything from 25 Aug follows
unchanged.

**Updated:** 2026-08-25 — **GPLZ Link** is built end to end and waiting on two
dashboard steps from Farjad; its remaining engineering is the first section
below. Everything from 24 Aug follows unchanged.

**Updated:** 2026-08-24 — gooyalisting.ca is **imported**; the directory
nearly doubled (5,802 → 10,680) and the three follow-ups it left are the
first section below. The mobile gap is **closed**, including one bug the audit
did not predict. What is still open on mobile is owner controls and push,
both long-standing.

The live board is Notion → 🧿 Charana → Mission Control; this is the narrative.

## Standing phase 1 — CODE COMPLETE 26 Aug; blocked on one SQL Editor paste

«اعتبار مشارکت». Spec: `docs/16-standing-and-loyalty.md` · plan:
`docs/17-standing-phase-1-plan.md`. All eight tasks are written: the
migration, `@goplaza/core/standing.ts` (levelFor exercised at 14 boundaries),
the ledger with its six named settle guards, both emitters (channels,
reviews), `/admin/standing` (green knobs + amber actions with server-enforced
reasons), and the 08:10 UTC recompute cron. Both switches seed **off**.

**The migration is applied** (Farjad, 26 Aug, SQL Editor) and the deferred
verification ran the same night with a disposable test user through a
temporary CRON-gated route calling the real functions in the real runtime
(deleted after; tables confirmed back to zero):

- record → pending; duplicate → skipped by the unique constraint
- settle blocked by name: `program_disabled` while off, `not_verified`
  before the profile verifies, then settles exactly once (25 pts, v1 frozen
  into the row); re-settle → `no_pending_event`
- reverse with an empty reason refused; real reverse drops xp 25→0 and
  accuracy 1→0 while the row keeps its frozen points — history re-read,
  never edited
- `/api/cron/standing-recompute` ran by hand: `{recomputed:0, backlog:0}`
  on the empty ledger, and its cron_runs row landed
- `pnpm gen:types` regenerated with the three tables

Not yet seen: the admin page with *green* probes needs an admin login in a
browser — the same queries the probes make were verified directly instead.
Earlier find, still true: the page re-checks requireAdmin itself because
its HTML could stream before the layout redirect (`06-gotchas`).

**Pre-existing failures, not from this work:** `pnpm lint` — one error in
`apps/web/app/channels/page.tsx:112` (impure call during render) and one in
mobile; `pnpm check:brand` — 8 old-brand hits in `docs/15` and
`scripts/fix-blog-brand.mts`. A background-task chip exists for these.

## Channels directory — LIVE 26 Aug; it needs rows, not code

«کانال‌ها و گروه‌ها» — Telegram channels/groups and WhatsApp groups, any
subject, free. Design and the reasoning behind every fork:
`docs/15-channels-directory.md`. Read it before touching any of this.

**The migration is applied** — verified against the project the app uses:
`channels`, `channel_categories`, `channel_member_snapshots` and
`channel_events` all answer, and the eight seeded categories render as filter
chips. Not applied by the session that wrote it; either Farjad or the
concurrent session ran it.

**What was verified by running** (dev server, 26 Aug): `/channels` empty state,
`/channels` with filters applied, the rebuilt header including the new
two-column «راهنما» panel, and the home page — where the «چرا گوپلازا؟» grid
is gone and the channels band correctly renders nothing while the table is
empty. Console is clean apart from the pre-existing `exchange_rates_shape`
warning (Navasan).

**Fixed 26 Aug after the first real submission (`20ec2b0`):** `t.me/GoPlaza`
could not be submitted at all. `tg_username` has a lower-case-only CHECK and
`telegramUsername()` returned the raw casing, so every handle with a capital
letter failed its insert as a generic «ثبت کانال ناموفق بود». Proven against
the database both ways before and after the fix. The link field also asks for
an **id** now rather than a URL. See `06-gotchas`.

**FARJAD — one more SQL paste, and this one is NOT ordering-sensitive:**

Run **`supabase/migrations/20260830440000_channel_views_are_public.sql`**.
`analytics_daily` has no anon SELECT policy — right for bio pages, wrong for
channels, whose view counts are published on their own public page. Until it
runs, every channel view count reads **zero** to every visitor: not an error,
not a log, an empty result that renders as zero and is indistinguishable from
a channel nobody opened. `channel_view_count()` was affected the same way; it
is a plain SQL function and runs with the caller's privileges.

Safe to merge before or after — without it the strip shows no numbers, which
is exactly what it shows for an unvisited channel.

**Us, in order:**

1. **Seed it — this is the whole remaining job.** Everything is built and
   nothing has ever been seen with data in it: no card, no detail page, no
   admin queue entry, no home band. Twenty or thirty real, well-known channels
   through `/channels/submit`, approved at `/admin/channels`.

   **Do not invent entries.** Every row is a claim about something that
   exists, and a made-up one is the exact failure this section was built to
   expose in other people's link lists.

   Prefer public `t.me/<name>` links: those are the ones the daily cron can
   measure. A section seeded entirely with invite links would show
   «بررسی خودکار برای این مورد ممکن نیست» on every card and look like the
   feature does not work.

2. **~~The cron's parser is unverified~~ — verified 26 Aug against the real
   table.** One channel read (`goplaza`: 2 members, last post today, one
   snapshot written); two correctly failed. `t.me/s/` answers **302** for
   `get_verixa` and `heros_journey`, so those have no readable preview and will
   demote themselves to `declared` after three tries, exactly as designed.
   `posts_last_30d` stayed null on the successful one, which is also correct —
   the preview renders twenty messages and all twenty are inside the window, so
   the honest answer is "at least twenty" and we publish nothing.

   **What the run turned up is in `06-gotchas`:** the two-state UI called
   readable channels unreadable, and the rename check fired on a name nobody
   renamed.

3. **~~Re-enable the rename check~~ — done, behind a `tg_title` baseline.** It
   compares the title we last read against the title we read today, so a
   Persian directory naming a channel in Persian is no longer a rename. A first
   read can never be a rename, so it records the baseline and skips the check.
   The baseline is refreshed even on a run that flags one, so a rename is
   reported once rather than every day until a human clears it.

**~~Run the ownership migration~~ — applied and merged 26 Aug (`d105c8f`).**
`20260830430000_channel_ownership.sql` was verified against the database before
the merge: the columns read, and a half claim is refused with 23514. The cron
re-ran afterwards — `tg_title` is populated, `requeued: 0`, and the channel
that the old check unpublished stayed published.

**Ownership on GOPLAZA's own channel was set** through the same columns the
admin button writes (`owner_verified_method: 'admin'`, 182-day window,
attributed to Farjad's admin account on his instruction). One click at
`/admin/channels` revokes it if he would rather the record came from the
button itself.

3. **Then look at a populated page.** The card, the detail page's four metric
   tiles, the growth block (which needs two snapshots a month apart, so it will
   not appear for weeks), and the view-count floor.

4. **The reconfirm reminder email.** Declared rows carry `confirm_by` (90 days)
   and today nothing tells the submitter before it passes; the entry simply
   leaves the index. Reuse the reminder-stage pattern in
   `verification-status.ts` and the mail shape from `5c80228`.

5. **Mobile read side.** List + detail. `channelActivity()` is already in
   `@goplaza/core`, so there is nothing to re-derive.

6. **Watch the first renames.** The cron pushes a materially renamed channel
   back to `pending_moderation`. `titleChangedMaterially()` ignores emoji,
   punctuation and one title containing the other, but its threshold has never
   met a real rename. A queue full of false alarms is a queue that gets
   ignored, which is worse than not having the check.

**Farjad, optional:** `CHANNEL_METRICS_PER_RUN` on Vercel if 120 channels a day
is the wrong pace. The cron is in `apps/web/vercel.json` at 06:40 UTC and uses
the `CRON_SECRET` that is already set.

**Phase 2, not started, not designed:** the Telegram bot — ownership proof by
making our bot a channel admin, live `last_post_at`, an owner stats panel,
private channels. The only thing phase 1 owes it is that `verified` stayed a
separate concept from `measured`; no `verified` column was added.

## /admin/users gained four columns (26 Aug)

Last activity, standing, UID and money — all aggregated for the fifty rows on
the page in four bounded queries, not per row.

**Two of the labels are deliberately not the words that were asked for, and
this is the honest half of the task:**

- **«آخرین فعالیت», not «آخرین ورود».** A login is one of several actions in
  `user_activity_logs`; the column shows which action it was, so it cannot
  claim to be a login column while displaying a profile edit.
- **«پرداخت‌شده», not «اعتبار مالی».** **There is no wallet, no credit ledger
  and no stored balance anywhere in this schema**, and `invoices` and
  `subscriptions` are both empty today because nobody has paid anything. The
  number is the sum of PAID invoices against businesses the person owns.
  If a real credit balance is wanted — top-ups, spend, refunds — that is a
  ledger table and a product decision, not a column; ask before building it.

**Standing shows `user_standing.xp` and the level `levelFor()` computes.** The
table exists and is empty, so every user reads ۰/تازه‌وارد, which is their real
state rather than a placeholder.

**One bug this found:** the money query originally matched businesses by
`owner_user_id OR created_by` and returned 10,683 rows — the whole directory —
because the imports account is `created_by` on 10,600+ scraped listings. See
`06-gotchas`.

## /profile redesigned (26 Aug, `a0685c3`) — and two bugs it uncovered

One column, four zones: who you are, what you have done, what you can change,
where to go. Five head-counts against the user's own rows feed a stat strip and
the destination rows.

**Two real bugs came out of it, both now in `06-gotchas`:**

1. **`<Toaster />` was never mounted** (`3c4f491`). Twenty client components
   call `toast()` — every moderation queue, the owner dashboard, the claim
   flow, the verification banner — and none of it has ever been drawn. Fixed.
   Worth re-walking those screens now that messages will actually appear:
   some of the copy has never been read by anyone.
2. **`ensureUserProfile` selected six columns** while the form read ten off the
   same object, typed `any`. The profile form has been showing empty fields for
   saved data since 11 Aug. Fixed with one shared column list.

**Not verified visually.** Build, typecheck and all six count queries pass, but
nobody has seen the page signed in — the same wall as the welcome page, and the
same cause: no way to hold a session here. See the magic-link entry in
`06-gotchas`.

**Small follow-up:** `calculateUserProfileProgress` in `lib/utils/progress.ts`
is now unused by the profile (the form names the missing fields instead of
showing a percentage). The business half of that file is still used. Delete the
user half when someone is in there.

## Signup success page rebuilt (26 Aug, `b23e505`)

`/auth/signup-success` was three lines of implementation notes shown to a
human. It now carries a welcome band with the account's own facts, three
next-step cards, a shortcut grid, six FAQs and a support card.

Everything on it is read, not assumed: name, email, `email_confirmed_at`,
whether the account already owns a listing, whether it has already submitted a
channel, and the live directory counts. The cards change to match — somebody
who registered a business last week is offered their dashboard, not a
registration form.

**Not verified visually.** Build and typecheck pass and the auth gate still
holds for a signed-out request, but nobody has seen it signed in. Getting a
session was not possible in that session: an admin-generated magic link comes
back in the **implicit** flow (`#access_token=…`) and `/auth/callback` only
accepts a PKCE `code`, so the link lands on `/auth/error`. The app's own magic
links are unaffected — those are PKCE — but it means an admin cannot hand
anyone a working sign-in link today, and that is worth fixing on its own.

## Home page: «چرا گوپلازا؟» replaced by the channels band (26 Aug)

Farjad's call. The four-card grid asserted the site was trustworthy; the band
shows six real channels with the date each last posted and the date we checked.
One is a claim about ourselves and the other is evidence.

The band has **two honest modes and the heading says which**: normally the
freshest channels (rows with a real `last_post_at`, in practice the public
Telegram ones the cron can read), and when none of those exist yet, the most
recently *added* entries under a different heading. Calling a WhatsApp group
with no readable timestamp "recently active" would be the exact claim this
section exists to stop making. It renders nothing at all while the table is
empty, which is what the home page does today.

`/channels` became a real index in the same change: 24 per page with a pager,
three sort orders (freshness — the default — members, newest), and filters for
platform, subject, city and **activity**. Activity is still computed from
`last_post_at` at read time, so the filter converts the chip into a timestamp
range using the same thresholds `channelActivity()` uses, imported from core
rather than retyped — the chip and the badge cannot drift apart.

## Header rebuilt — 26 Aug, same commit

Eight top-level triggers down to five, because «کانال‌ها و گروه‌ها» is the
longest label the bar has ever carried and it had already overflowed once at
its own breakpoint (`06-gotchas`, the 900→960px move).

- «خانه» removed — the logo beside it already goes home.
- «دسته‌بندی‌ها» + «همه کسب‌وکارها» + «شهرها» + «استان‌ها» → one «کسب‌وکارها»
  menu whose own label is the destination.
- «راهنما» + «درباره ما» → one menu, two labelled sections, same twelve
  destinations.
- Nav order is now data: one `NAV` array of items-or-groups, instead of two
  arrays concatenated, which had pinned every menu to the end of the bar.

**Verified at 1280px** on 26 Aug: five triggers with room to spare, and the
«راهنما» panel opens as two labelled columns («استفاده از گوپلازا»،
«درباره ما») over an opaque white panel. Not yet checked at 960–1100px or on
mobile, where the bar has overflowed before.

## GPLZ Link — BUILT 25 Aug; two on Farjad, three on us

A bio page per business on `gplz.link`, served by this same app. Nine
migrations applied, ten commits, deployed. What is missing is listed honestly
below — nothing here is half-shipped, it is simply not started.

**Farjad, minutes each — these two are what stop anyone using it:**

1. **Add `gplz.link` to the Vercel project.** Same project as goplaza.ca, apex,
   no www. Everything that had to precede it is in: the host is closed to
   indexing (`Disallow: /` answered in `proxy.ts`), pages carry `noindex` +
   canonical, and traffic is recorded from the first visitor. Until this is
   done the pages render only at `goplaza.ca/link/<handle>` in development —
   in production that path 301s away, by design.
2. **Create the Stripe product for «لینک حرفه‌ای»** — $13/mo and $130/yr, CAD,
   following the existing `STRIPE_PRICE_*` env-var naming so `priceIdFor`
   keeps working. Until then nobody can buy the paid tier; the entitlement
   itself (`hasLinkPro`) is live and already granted by every paid directory
   plan.

**Us, in dependency order:**

3. **Abuse defenses — the launch blocker for the individual free tier.**
   `link_pages.business_id` is nullable precisely so a freelancer with no
   listing can own a page, and that flow is deliberately not built. A phishing
   page on our own domain gets `gplz.link` flagged by Safe Browsing, and
   **every short link on the platform dies with it**, not just bio pages.
   Minimum: publish only after phone verification, one page per free account,
   a report button, an automated blocklist scan of outbound domains, and a
   light review queue for new low-traffic pages. `rel="nofollow ugc"` and the
   host-wide `noindex` are already in.
4. **The editor** — reorder, add custom links, toggle mirror modules. The free
   cap is 5 custom links and the server must clamp it too; a client-side cap
   is not a cap. `LINK_LIMITS` in `@goplaza/core` already holds the numbers.
5. **QR, themes, scheduling, lead capture.** All specified in the Notion spec,
   none started. QR needs a decision first: there is no QR library in the
   project, so it means adding a dependency. Lead capture needs consent copy
   and snapshotting — the column exists (`link_leads.consent_text`) and stores
   what the person actually agreed to, not a reference to current wording.

**Two smaller things this work left:**

- `toLatinDigits` now has **three** copies — the canonical one in
  `@goplaza/core`, plus `apps/web/lib/utils/digits.ts` and
  `apps/web/lib/sms/send.ts`. All three behave identically today. The two in
  `apps/web` were deliberately not touched so that step stayed additive.
- **Every missing listing and job returns HTTP 200, not 404.** Pre-existing and
  app-wide, not caused by this work: documented Next 16 behaviour (200 for
  streamed responses, and this app has a `loading.tsx`). Next injects
  `noindex` so they are not indexed, but a directory that answers 200 for URLs
  that do not exist burns crawl budget on every stale one. The fix the Next
  docs point at is checking before the response streams — i.e. in `proxy.ts` —
  which is a real design decision, not a one-liner.

## gooyalisting.ca — IMPORTED 24 Aug; three follow-ups

The ninth and largest directory is in. **7,471 scraped → 163 duplicates
collapsed inside the export → 4,878 inserted, 2,392 enriched.** The directory
went from 5,802 to **10,680** (9,686 published, 994 draft). 7,235 rows now
cite gooyalisting.ca in `verification_notes`.

Scraper `scripts/scrape-gooya.mts`; commit report at
`/tmp/gooya-commit-report.json` (22 MB, not in git — **it is what makes the
import reversible**, so copy it somewhere durable before /tmp is cleared).

**What is still open:**

1. **37 listings were not written.** Each shares a phone with a row we already
   had and the model would not commit either way — `Soheila Shayan (Sosha
   Salon)` against `کلینیک زیبایی سوشا`, `Leila Haute Couture` against
   `لیلا خیاط حرفه ای لباس عروس و شب`. They are in the report's `review`
   array. A human decides merge or insert; until then those businesses are
   simply absent.
2. **1,401 listings say «نامشخص»** — up from ≈930, because ~450 of the new
   rows name no city anywhere in their own text. `/admin/cleanup/cities` is
   where they get resolved; they stay DRAFT and invisible to the public until
   they do.
3. **The directory's shape changed.** 1,010 of the new listings are
   real-estate agents and 953 are beauty — over 40% of the intake in two
   categories. Worth looking at what the category pages and the random
   `/businesses` order feel like now that realtors are the largest single
   group in the directory.

Logos are done: **6,675 re-hosted** into our own Supabase storage, and a
database check confirms **zero rows still point at gooyalisting.ca**. The two
failures are your own showcase listings (`ashavid`, `farjad-pourmohammad`) —
their logos are SVG, which `rehost-logos.mts` refuses on purpose because an
SVG can carry script. They keep their original URLs and still render; convert
them to PNG and re-run if you want them off your own domains too.

## Blog view counts (24 Aug) — done, one follow-up

`blog_posts.view_count` plus `increment_blog_post_view`, the same shape as
`increment_business_view`. Web and app call the SAME function, so the number on
an article is the total across both surfaces. Migration
`20260830330000_blog_view_count.sql` is applied.

**Follow-up:** run `pnpm gen:types`. The two entries this needed (`view_count`,
the RPC) were added to `database.types.ts` by hand so the tree would compile
before the migration ran; a regen makes the file authoritative again.

**Note for the next migration that adds a column to a SELECT list:** the
column has to exist in the database *before* the code that selects it
deploys, or PostgREST errors and every page reading that table 404s. This
change touched `POST_COLUMNS` (web) and `CARD_COLUMNS` (mobile), so deploying
it early would have taken the whole blog down on both surfaces.

## Blog sources — what a human still has to do (24 Aug)

The source-driven writer is code-complete and type-clean, and its two model
passes were exercised end-to-end against a live atash.ca article. Three things
are not done, and none of them are code:

1. **Run the migration.** `supabase/migrations/20260830320000_blog_sources.sql`
   in the Supabase SQL Editor — same route as every migration since Plans v3.
   Until it runs, the desk's source panel and the "از منابع بنویس" button will
   error: the tables do not exist.
2. **Read the first batch before publishing it.** `BLOG_AUTO_PUBLISH` is off,
   so the first run lands in the review queue. Read three of them end to end
   for tone, and check that the "منبع خبر" block at the foot points where it
   should.
3. **Decide the Telegram / LinkedIn credentials.** Both adapters are written
   and both are inert without env (see `13-blog-sources.md` for exactly which
   variables and where to get them). Nothing is shared until they exist, and
   nothing claims to have been.

Open questions worth a decision, not blockers:

- **Only atash.ca is seeded.** `blog_sources` takes any WordPress site; adding
  a second is one `insert`. Which ones are worth reading?
- **`fresh_days` is 21 and `BLOG_SOURCE_PER_DAY` is 5.** Five a day exhausts a
  quiet week's news and starts pulling archive; that is by design, but it means
  the mix shifts toward evergreen over time. Watch the run log's notes column.
- **The originality gate is calibrated on two drafts.** Six shared runs, 2%.
  If real runs start getting skipped for overlap, the reason is in the ledger —
  raise it on evidence, not on impatience.

## ~~Mobile is behind the web~~ — closed 24 Aug

Everything below was the audit as written before the work. All five code gaps
are fixed and APK **1.3.0** is built and linked (EAS `7efff12a`), with
**1.4.0** carrying the parity work. Two things the audit did *not* predict
turned up while running the app, both now fixed:

- **The 1,000-row cap was still live on mobile.** The home hero said
  «۱٬۰۰۰ کسب‌وکار» for a 5,251-listing directory, and every category, city and
  province count was a fifth of the truth. `fetchAllRows` (the 18 Aug fix)
  lived in `apps/web`, so native never got it; it is now in `@goplaza/core`.
- **The listing screens printed a page size as a total** — «۱۰۰ کسب‌وکار» for
  a Toronto category matching 1,699. They now say «۱۰۰ از ۱٬۶۹۹».

Still open on mobile, unchanged and long-standing: **no owner controls at
all** (item 11 below) and **no push infrastructure** (item 13).

### The audit as it stood (24 Aug)

`apps/mobile` was last touched at `d561f1c`. Five web commits have landed
since and **none of them touched the app**:

| Commit | What it added | On mobile? |
|---|---|---|
| `29f222f` | random default listing order, four sorts, filters, 89% featured boost, **Platinum tier** | no |
| `8aae807` | SEO / canonicals / entity graph | n/a — web-only by nature |
| `577ff4e` | **smart search** (LLM query understanding) + announcement search | no |
| `86ded38` | admin settings | n/a — web-only by nature |
| `14e8b23` | lawyer import + admin export | n/a — data, arrives on its own |

**The binary is the bigger gap.** The newest artifact anyone can install is
**APK 1.2.0** (EAS `7d468902`, 16 Aug, commit `c6bd835`). The source has been
at 1.3.0 since `d561f1c`. So the GOPLAZA rebrand — done in code on 18 Aug —
**has never reached a single installed app**. Every phone running it still
says čārana.

**Nothing is broken, which is why this was easy to miss.** `search_businesses`
kept its signature (the smart-search migration only *added*
`search_announcements` and the LLM cache table), and all four new migrations
are additive. The app does not error; it simply shows less than the site.

Code gaps found, in the order they must be fixed:

1. **`features.tsx` hard-codes three plan sections** (`free`/`pro`/`featured`).
   Platinum will not appear even after a rebuild, and any shipped build still
   quotes the old Starter/Premium prices. This is the honesty-rule case: the
   site sells a tier the app denies exists.
2. **The «ویژه» chip does not exist on mobile at all.** `business-card.tsx`
   renders busy status and nothing else, and `CARD_COLUMNS` does not even
   select `plan`/`plan_until`. **The featured boost may not be ported until
   the chip is there** — house rule #2 in `plans.ts` says a paid position must
   be labelled, so a boost without a chip is an unmarked advertisement.
3. **`listBusinesses()` still orders `created_at` desc** — no random default,
   no boost, no `view_count`/`saved_count` sorts, no filter chips.
4. **`listBusinesses()`'s own search path still hand-rolls `ilike`.** The
   search *screen* correctly calls the RPC; this second path does not.
5. **Smart search cannot be called from the app.** `apps/web/lib/search/smart.ts`
   is server-only (service-role client + `OPENAI_API_KEY`). Mobile needs a
   public route under `/api/mobile` carrying the same five gates. Note the
   existing `api.ts` `post()` helper requires a Supabase session and smart
   search must work signed-out, so it needs an unauthenticated helper too.
   `search_announcements` by contrast is a plain RPC the app can call directly.

Baseline `pnpm typecheck` in `apps/mobile` was clean before any of this work.

## ~~`pnpm db:push`~~ — done, 19 Aug

All three pending migrations applied — not via `pnpm db:push` (the CLI kept
hitting its interactive DB-password prompt), but by running each file's SQL
directly in the Supabase Dashboard → SQL Editor. `businesses.saved_count`
confirmed present and backfilled over REST; commit `29f222f` (random-order
`/businesses` + Platinum pricing) pushed to `main` right after.

**Housekeeping, not urgent:** the CLI's own migration-history table may not
know these three ran, since they went in outside `db push`. Next real
`pnpm db:push` might try to re-apply one and hit an "already exists" error —
if so, `npx supabase migration repair --status applied <version>` for that
timestamp, then push again. Not worth doing pre-emptively; deal with it if
it happens. **Now covers five files**: the original three plus
`20260830300000_smart_search.sql` and `20260830310000_settings_and_backups.sql`
(both also applied via SQL Editor, 19–21 Aug).

## Rebrand → GOPLAZA (18 Aug night, branch `rebrand/goplaza`) — Farjad's dashboards

Code is done and verified; production is not GOPLAZA until these are done, in
this order — full detail in `REBRAND_EXTERNAL_ACTIONS.md`:

1. Vercel: add `goplaza.ca` + www, 308 `charana.ca` → `goplaza.ca` path-preserving,
   `NEXT_PUBLIC_BASE_URL=https://goplaza.ca`, check build command has no
   `@charana/web` filter. **Before merging.**
2. Supabase Auth: Site URL + add `goplaza://**`, `https://goplaza.ca/**` to
   Redirect URLs (keep the old ones). `pnpm db:push` for the data migration.
   **Before merging** — mobile signup mail links now use `goplaza://`.
3. Resend: verify `goplaza.ca`, create the mailboxes, then flip `company.ts`.
4. Stripe: rename the two live products; keep metadata keys.
5. Search Console change-of-address; Maps key referrer; X handle.
6. Supply the master vector of the G-mark; run `scripts/generate-brand-assets.mjs`.
7. Decide whether old blog post bodies get «چارانا» → «گوپلازا» (data, not code).
8. ~~Fix the false claim on the auth side panel («+۲۰٬۰۰۰ کسب‌وکار ثبت‌شده»)~~
   — **done, `d561f1c`.** Real counts now come from `lib/data/directory-stats.ts`,
   shared with the home hero; the «نامشخص» sentinel no longer inflates the
   city count (46 → 45 real).
9. `expo prebuild --clean` → build APK **1.3.0** (`app.json` already bumped
   for the rebrand). In the same commit as that build, update
   `apps/web/lib/data/releases.ts`: `APP_VERSION`, `STORES.apkDirect` /
   `apkVersion` / `apkSizeMb` / `apkBuiltAt`, and one new `RELEASES` entry.
   `/download` still advertises 1.2.0 on purpose — it is the only binary that
   exists, and that page is a download promise, not a changelog of intent.

## Farjad — dashboard work, minutes each

**Stripe, before any real charge:**
- **Roll the live secret key** — it was pasted into a chat transcript on 16 Aug
- Settings → Tax → set the head office address (automatic tax fails without it)
- Settings → Billing → enable the Customer Portal
- Create the production webhook endpoint at `https://goplaza.ca/api/stripe/webhook`
  and put its signing secret in Vercel as `STRIPE_WEBHOOK_SECRET`
- Run `scripts/seed-stripe-plans.mts` against live (it refuses live keys by
  design — create the live products deliberately), then set the four
  `STRIPE_PRICE_*` variables on Vercel
- Confirm the account's legal entity: the sidebar reads "Charana / Visa Roads"
  while the site says Ashavid Inc. The account owner is the merchant of record

**Security and config:**
- Rotate the Twilio auth token (pasted into a transcript)
- Remove the unused `GEMINI_API_KEY` from Vercel
- Delete the personal Supabase token from the dashboard
- Change the two temporary admin passwords, then delete
  `apps/web/.admin-credentials.local.txt`
- Point `carana.ca` DNS at Vercel
- Enable the Maps Embed API on the Google key to bring the profile map back

**One click, highest leverage:**
- `/admin/cleanup/cities` → "apply all" sets 365 Toronto-area listings that
  currently have no city. Then work the ~44 rows that need a human.

**Data hygiene, after the seven-directory merge (17 Aug, `2384aa5` → `34185f5`):**
- **Held for review, not inserted** (shares a phone or website with an
  existing row and gpt-4o would not commit): Hamvatan 7, Bazaarche 3,
  Jabeh 9, Taablo 31, FarsiLink 5, re-import 2 ≈ **57**. Each report
  (`hamvatan-import-report.json` and per-source `*.json` reports, regenerate
  with a dry run) lists them with the existing row's slug and the model's
  reason. Merge or add is one admin action each.
- **Inserted despite a shared phone** with the model's stated reason: ≈40
  across sources (in the same reports under `inserted_despite_shared_phone`).
- **Wrong merges already reverted** (51): brokerage/agency platform hosts
  (mortgage.rbc.com, century21.ca, mortgagealliance.com, rightathomerealty,
  royallepage, zil.ink…) and generic names («مشاور املاک» ↔ «مشاور املاک X»).
  Rules fixed in `34185f5`; the reverted rows were re-imported cleanly.
- **~520 new DRAFT rows** with no city from any source (mostly Jabeh
  realtors, whose pages carry no location). They are invisible until a city
  is set. The `/admin/cleanup/cities` area-code pass could place many.
- **Taxonomy gap:** 12 categories, no slot for travel agencies, cargo/moving,
  media, charities/community centres, pet services. They were filed in the
  closest category with the source's own label kept in `sub_category`.
  Decide whether to add categories before the next SEO pass.
- **Bazaarche descriptions were deliberately not imported** — their prose is
  Google-Places boilerplate («X is a Persian/Iranian Gym serving…»). Those
  ~500 rows have name, address, phone, website, hours-less. Taablo rows are
  similarly thin (name, phone, address, category).
- **Logos:** ≈1,990 re-hosted into Supabase storage 17 Aug (jabeh, bazaarche,
  farsilink, iranbusiness). 147 FarsiLink image URLs were dead on their side
  (404 on every size variant) and were set to the placeholder rather than
  left as broken hotlinks. Hamvatan and Taablo rows never had logos. Consider
  a logo pass from each listing's own website OG image later.
- **Ownership fixed 17 Aug:** imported rows were `created_by` the first admin
  profile, so admin@charana.ca's dashboard listed all 5,649. New system
  account `imports@charana.ca` owns them now (`scripts/reassign-imports.mts`,
  `9d1feb3`); Farjad's three showcase listings are `owner_user_id` =
  farjad@ashavid.ca.

**Needs a real device:**
- Test the voice suggestion box on an iPhone (the simulator has no microphone)

**New, 16 Aug — footer currency rates:**
- **Roll the Navasan key** — `free4Bp…` was pasted into the chat on 16 Aug,
  same rule as the Stripe and Twilio keys above. It is a free-tier key
  (120 requests/month), so the blast radius is a quota, not money — but
  rotate it anyway and put the new one in Vercel + `apps/web/.env.local`.
- ~~Set `NAVASAN_API_KEY` in **Vercel**~~ — done; verified 17 Aug by
  reading goplaza.ca's footer, which renders all three rates.
- ~~Check the response shape once a real key exists~~ — done 16 Aug
  (`c85a42b`). Field names are the bare `usd`/`eur`/`cad` keys; a
  3-day staleness guard now drops dead symbols (`cad_cash` was 299 days
  old and 42% off).

## Owner identity on verified profiles (17 Aug, `5f5c03b`)

Shipped. Two things a human should decide, neither of them code:

- **Nobody was told.** The three currently-verified listings are all
  Farjad's, so nothing was published about a stranger today — but the next
  person who verifies gets their profile name printed on a public page with
  no prompt at the moment of verification. Worth adding a line to the claim
  flow and the verification email, or a one-time notice, before the fourth
  verified listing exists.
- **Free and Starter cannot opt out at all.** That is the product decision as
  asked. If someone writes in and wants their name off a Free listing, the
  server action refuses them; an admin has to flip `hide_owner` by hand.
  Decide whether "remove my name on request" should be free for everyone
  (it costs nothing to allow, and refusing it is the kind of thing that gets
  screenshotted).

## Jobs board — BUILT on web 18 Aug

Full spec and what shipped: `09-jobs-board.md`. Four forks decided by Farjad:
only existing listing owners may post; verified businesses publish directly
while everyone else queues; **free and unlimited** (so nothing on the pricing
or features page may present it as a paid perk); jobs only.

**Salary is optional** — Farjad's call on 18 Aug, taken with the Ontario
question still open.

**The description is Markdown** (`c2deb42`), with an AI drafting endpoint at
`/api/ai/job-description`. AI spend is counted in the new `ai_usage` table —
10 drafts per user per 24h — because `lib/utils/rate-limit.ts` resets on
deploy. Not a plan quantity; do not move it into `plans.ts`.

Still open:

- **Farjad, before the board is promoted anywhere:** verify Ontario's 2026
  pay-transparency rules for publicly advertised postings against a primary
  source. If a salary range is mandatory, `salary_min` becomes required in
  the form and NOT NULL in the table — and that migration has to deal with
  whatever was posted without one. Cheapest while the table is empty.
- **One signed-in pass by a human.** The public board, the detail page, the
  `JobPosting` JSON-LD, the expiry rule, the profile section and the
  `job_apply` event were all exercised against real rows. The **owner form**
  and the **admin queue** were only typechecked and reached unauthenticated
  (both correctly refuse) — nobody has posted an ad through the UI yet.
- ~~**Moderation emails**~~ and ~~**expiry nudge**~~ — **done 18 Aug
  (`0e02e9c`)**. `jobModeratedEmail` fires from `moderateJob`; the nudge runs
  from a new cron at `/api/cron/job-expiry-reminders`, 13:30 UTC daily.
  **No real email has been sent yet** — both templates were rendered and
  checked, and the cron's selection, idempotency and extend-reset were
  verified against real rows, but nothing was actually delivered. Fire one:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://goplaza.ca/api/cron/job-expiry-reminders`
- ~~**Mobile**~~ — **done 18 Aug (`6c1084f`)**: board, detail, home rail,
  profile section, account row. Read-only; posting stays on web with the rest
  of the owner controls.
- **`.prose-fa` list markers** — the blog has the same Tailwind-preflight bug
  that `.job-md` just fixed: `list-style: none` means its `li::marker` colour
  rules have never rendered. One line in `globals.css`.
- `/jobs/[slug]` returns **200 on a missing or expired post**, not 404. Same
  pre-existing streaming/`notFound()` issue as the city routes (below), but it
  matters more here: Google treats a soft-404 on a `JobPosting` URL as a
  quality problem. Worth fixing before the board has real traffic.

## Blocked on something external

- D-U-N-S for Ashavid Inc. → Apple Developer and Google Play organisations →
  App Store / TestFlight → store screenshots

## Code — next slices, in order

1. ~~**APK 1.2.0**~~ — **shipped 16 Aug, `229669c`** (EAS build
   `7d468902`, 110MB). Carries the blog, conversion events, the report
   sheet, the voice suggestion box, busy-status display, the Tehran
   clock/FX card and the announcement surfaces.
   **Found in the process: APK 1.1.0 was broken the whole time it was
   linked** — no `EXPO_PUBLIC_SUPABASE_*` reached the build, so the app
   threw on launch. Fixed by adding them as EAS project variables; see the
   gotcha in `06-gotchas.md`. **Still unverified: nobody has run 1.2.0 on
   a real Android device or emulator** — the credentials are confirmed
   inlined in the bundle, but that is static evidence only. Install it
   once before promoting it anywhere.
2. **Blog E-E-A-T pass.** Two or three first-hand sentences per post that a
   model cannot invent. Farjad supplies; I fold in.
3. RLS and authorization regression tests.
4. Rate limiting to shared infrastructure — it is per-instance memory today, so
   it resets on every deploy and does not hold across regions.
5. Anti-scraping for the directory.
6. `businesses.category` is free text, not a foreign key; category labels have
   two sources of truth.
7. `notFound()` in the city routes returns 200 (pre-existing, cosmetic —
   the body is noindex).
8. **Two loose ends from the blog-discovery work (24 Aug).** The
   «جدیدترین مقالات» strip on `/jobs/[slug]` has never rendered — no job ad
   is published, so the page could not be loaded; the tag is identical to
   the five that were verified. And the mobile app has none of this: the
   article strip and the home band live in `apps/web` only, which is exactly
   the pattern `04-mobile` was written about.

Featured placement is now fully backed: city × category, `/cities/[slug]`,
`/search`, and (16 Aug) the home page's `homepage_slot` section all sort and
label it. The section on `/` only renders when a business actually holds an
active Featured plan — today that's nobody, so it's correctly invisible.

## Plans v2 backlog (16 Aug brainstorm, tracked in Notion Mission Control)

An audit found most of the old Pro plan's bullets were sold but not built.
Renamed Pro → استارتر (Starter), Featured → پریمیوم (Premium) — display
names only, `PlanId` unchanged (`lib/billing/plans.ts`). **Shipped:** tiered
gallery — free 3 photos, Starter 5 + 1 video, Premium unlimited, enforced
server-side (`e6071c5`). **Not built yet, in priority-ish order:**

1. ~~Announcements~~ — **shipped 16 Aug, `86e85e4`.** Free 1 / Starter 3 /
   Premium unlimited, over a rolling 30 days. `business_announcements`
   table, no client-side RLS write policy at all — quota needs
   `entitlementsFor()` plus a count query, not a row check, so
   `lib/actions/announcements.ts` is the only writer. New dashboard page
   at `/dashboard/business/[id]/announcements`; active ones render in a
   banner on the public profile.
2. ~~Review replies (Starter)~~ — **shipped 16 Aug, `d5625e5`.**
   `public_reviews.owner_reply`, written through a server action (no RLS
   policy lets an owner update someone else's review row, so the action is
   the gate), rendered publicly under the review with inline write/edit/
   delete for an entitled owner.
3. ~~"Busy now / quiet now" live status toggle (Starter)~~ — **shipped 16
   Aug, `ac00070`.** Self-expiring (4h), toggled from the owner dashboard,
   shown on `BusinessCard` everywhere and the profile hero.
4. ~~Vanity English URL~~ — **shipped 16 Aug, `9451290`.**
   `charana.ca/b/[slug]`, English-slugged from day one, 301s to the real
   profile (an alias, not a second indexable page). Case-insensitive
   unique index; format + entitlement checked in
   `lib/actions/vanity-url.ts`. Does not touch the wider Persian-slug
   retrofit noted further down.
5. Personalized targeted search suggestion — e.g. an "Iranian restaurant"
   search surfaces a Premium business as a custom suggestion.
6. Real in-app booking calendar replacing the external `booking_url` link,
   with SMS lead notification (Premium) — reuses the existing Twilio
   integration.
7. Monthly AI-generated blog article per Premium business + backlink —
   reuses `lib/blog/generate.ts`, the engine already exists.
8. Suppress the "similar businesses nearby" block on a business's own
   profile (Premium) — right now every profile advertises its competitors.
9. QR / short link with UTM-style source tracking in owner insights
   (Premium) — reuses `business_events`.
10. Real multi-branch UI with a map (Premium) — the `branches` column exists
    on `businesses` already but has no UI, same class of gap as the earlier
    `is_featured` dead-code bug.
11. Mobile owner-management screens (gallery parity included) —
    `apps/mobile` still has no edit/insights/billing/announcement-*writing*
    at all. What has reached mobile is the **read** side: busy-status
    display (`76f8f27`), announcements in three surfaces + the «باخبرم کن»
    follow toggle (`6aaf06e`), the FX/clock card (`5046d9a`) and the
    features screen (`8540df1`). Owner *controls* — the busy toggle,
    gallery upload, posting an announcement — stay web-only until there is
    somewhere on mobile to put them. This is the single biggest remaining
    mobile gap.
12. SMS announcement notifications — a third channel for the
    announcement-follow system (item 13 below); costs real money per
    message via the existing Twilio integration, needs a budget/UX
    decision from Farjad before it's an engineering task.
13. Push notification infrastructure (mobile) — no Expo push token
    registration or device-token storage exists at all; a bigger
    prerequisite than any one feature that would use it.
14. Website price list extraction (Premium) — Farjad's idea: reuse the
    existing AI website-scrape (`scrapeWebsiteForBusiness`, already used at
    onboarding) to pull a structured price list from a business's own site
    instead of the free-text services list. Scope not yet defined.

**Cross-cutting finding, not tied to a plan:** business profile and blog
post URLs are Persian-language slugs today (`packages/core/src/slug.ts`
deliberately keeps the Persian/Arabic Unicode range) — this contradicts a
new standing rule ("all URLs must be English"). Affects ~680 indexed
business URLs and every blog post URL; fixing it site-wide needs 301
redirects to keep the SEO built up over the last few weeks. Bigger and
separate from item 4 above, which should just be English from the start.

## Features page (16 Aug, `016c8f8` web / `8540df1` mobile)

`/features` on web and a native screen on mobile, both reading plan
quantities from `@goplaza/core` so they cannot drift from what the server
clamps. Both carry a "چیزهایی که هنوز نداریم" section listing everything
audited as absent — removing it is what would make the rest untrustworthy.
`plans.ts` moved into `@goplaza/core` for this (fourth module to make that
move); `apps/web/lib/billing/plans.ts` is now a re-export.

## Announcement discovery (16 Aug, `ac3cef6`)

Shipped: homepage feed (10 newest sitewide) + opt-in follow-and-email via
`user_business_interactions.notify_announcements`, new "اعلان‌ها" tab on
`/profile/interactions`. Not built this pass, tracked above as items 12–13:
SMS (costs money, needs a budget call) and push (mobile has zero
notification infrastructure to send to).

## Review moderation (17 Aug, `5c80228`)

Shipped: moderation-outcome email to the reviewer (carrying the moderator's
reason on reject/needs-changes), new-review email to the owner (which does
not offer a reply button the plan refuses), and server-side guards — 5 new
reviews per user per rolling 24h counted in the database, 10–2000 chars,
integer 1–5 rating, and no reviewing a business you own.

**Three product questions deliberately left open** — nothing was built on a
guess:

1. Does moderation stay fully manual? It works at zero reviews; it does not
   work at fifty a day. Options discussed: keep manual, auto-publish with
   post-review, or auto-publish for verified users only.
2. Should writing a review require a verified email/phone, or having marked
   the business «رفتم»?
3. Should a business be able to contest a review it believes is unfair?
   Today it can only reply.

**Not verified:** the one line inside `moderateReview` that calls the
notifier. Delivery itself was tested for real (both mails sent via Resend,
test review deleted after); exercising the call site needs an admin session.

## Header CSS bug + Tehran clock/rates (16 Aug, `256876c` / `ea375fb`)

- Fixed a real bug Farjad noticed but couldn't name: `globals.css` had two
  full `.site-header` definitions, one from before the 2026-08-23 header
  rebuild. The old one leaked padding/margin/border-radius/box-shadow
  through at every width and killed `position: sticky` below 720px. See
  the gotcha in `06-gotchas.md`.
- Footer now shows Tehran time + Jalali + Shahanshahi date (web and app,
  shared conversion in `@goplaza/core`), plus a real free-market USD/EUR/
  CAD line via Navasan once `NAVASAN_API_KEY` is set (see Farjad's action
  items above) — absent, not fabricated, until then.
