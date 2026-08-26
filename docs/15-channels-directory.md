# Channels directory — design

**Written:** 2026-08-26 · **Status:** **BUILT on web and LIVE, 26 Aug** —
the migration is applied · **Owner:** Claude
**Decisions by Farjad:** 26 Aug (brainstorm, recorded below with what each rules out)
**Name:** «کانال‌ها و گروه‌ها» (Farjad, 26 Aug)

## What shipped, and what did not

Built: `20260830410000_channels.sql`, `@goplaza/core/channels.ts`, the public
`/channels`, `/channels/[slug]` and `/channels/category/[slug]`,
`/channels/submit`, `/dashboard/channels` with the reconfirm button,
`/admin/channels` with a live sidebar badge, `/api/channels/event`,
`/api/cron/channel-metrics` **including the daily member snapshot**, the
`channel_view` / `channel_join_click` metrics on the existing analytics
tables, reports through the existing queue, sitemap entries, the home-page
band, and the header rebuild the new section forced (eight triggers → five).

Not built: mobile, the reconfirm reminder email, and any owner-facing stats
panel. All three follow patterns already in the repo.

**The migration is applied.** Verified against the project the app actually
uses: `channels`, `channel_categories`, `channel_member_snapshots` and
`channel_events` all answer, and the eight seeded categories render as filter
chips on `/channels`. Not run by this session — either Farjad or the
concurrent session did it while this was being written.

**Verified by running, in part.** The dev server came up on the second attempt
and `/channels`, the filtered variant, the rebuilt header and the home page
were all rendered and read. What is still unverified is anything that needs a
row: no card, no detail page, no admin queue entry has ever been seen with
data in it, because the table is empty. Seeding is the next step — see
`05-open-tasks`.

A directory of Telegram channels/groups and WhatsApp groups serving the
Iranian community in Canada. Any subject: a Toronto news channel, a Vancouver
hiking group, a Montreal buy-and-sell. Not restricted to businesses already
in the directory.

**Free. No plan gate, now or later without a decision recorded here.**

---

## Why this and not a list of links

Links to these channels are everywhere. What is nowhere is the answer to
*"is it still alive?"* — the community is full of channels that stopped
posting in 2023 and groups whose invite link died months ago. Half the value
of this section is the graveyard it exposes.

So the product is **not** the link. The product is:

- when the channel last posted,
- how many members it has, and when we last checked that,
- whether we could check at all,
- and what it does on our platform (views, join clicks) over time.

## Decisions taken (26 Aug)

| Fork | Chosen | What it rules out |
|---|---|---|
| Scope | **Any channel or group**, any subject, not tied to a listing | No requirement to own a business; no `business_id` on the row |
| Content | **We never display channel content** — no posts, no embeds, no scraped text | No `telegram-widget.js` iframes, no post archive, no republishing liability |
| Price | **Free** | Nothing in `plans.ts`, and nothing on `/pricing` or `/features` may claim it |
| Schema axis | **Source of the metrics**, not the platform | A `platform` column that decides behaviour; `if (platform === 'telegram')` scattered through the code |
| Ranking | **Freshness first**, member count is a filter | Member count as the default sort |
| Ownership proof | **Phase 2, via our bot** — deliberately not in phase 1 | A «تایید شده» badge in phase 1 that nothing backs |

---

## The one idea the schema is built on

The useful distinction is **not** Telegram vs WhatsApp. It is:

| | Example | last activity | members |
|---|---|---|---|
| `measured` | public Telegram channel with preview on | automatic | automatic |
| `declared` | `t.me/+…` invite link, a group, anything on WhatsApp | claimed only | claimed only |

Plenty of Telegram entries fall in `declared`: preview can be switched off,
and private/invite-link channels expose nothing. If the schema keys on
`platform`, every read site has to re-derive this, and one of them will get
it wrong and print a claimed number as if we had measured it.

So: **`metrics_source` is the axis.** `platform` is for the icon and the
filter chips, nothing else.

The UI consequence is a hard rule, not a preference:

> A metric we did not measure is **absent**, not zero, and not a dash. The
> card says «بررسی خودکار برای این مورد ممکن نیست» in words. Every measured
> number is printed **with** its `checked_at` — a number without the date it
> was taken is a claim.

This is the same class as the shipped violations in `06-gotchas.md`
(unconditional "تایید شده" chips, hard-coded sidebar badges).

---

## Data model

### `channels`

```sql
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users (id) on delete set null,

  -- English, unique, per the standing URL rule. latinSlug() from @goplaza/core.
  slug text not null unique,

  platform text not null check (platform in ('telegram','whatsapp')),
  kind     text not null check (kind in ('channel','group')),

  title       text not null,
  description text not null,
  language    text not null default 'fa' check (language in ('fa','en','mixed')),

  -- Its own taxonomy. Business categories (restaurant, salon) do not describe
  -- news / immigration / classifieds / a city group. Cities and provinces ARE
  -- shared, because filtering by city is the same question everywhere.
  category_slug text not null references public.channel_categories (slug),
  city     text,
  province text,

  -- The canonical joinable link. Public @handle when there is one, because a
  -- handle is stable and an invite link is not.
  join_url    text not null,
  tg_username text,          -- set only when join_url is a public t.me/<name>

  ---------------------------------------------------------------- metrics
  -- THE AXIS. 'measured' = we fetched it ourselves. 'declared' = the
  -- submitter said so and nothing verified it.
  metrics_source text not null default 'declared'
    check (metrics_source in ('measured','declared')),

  member_count      integer check (member_count is null or member_count >= 0),
  last_post_at      timestamptz,
  posts_last_30d    integer,
  metrics_checked_at timestamptz,   -- null => we have never successfully checked
  check_failures    integer not null default 0,

  ---------------------------------------------------------------- lifecycle
  status text not null default 'pending_moderation'
    check (status in ('pending_moderation','published','rejected','suspended')),
  moderation_reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,

  -- DECLARED ENTRIES EXPIRE. A WhatsApp invite link rots and nobody tells us.
  -- 90 days, then the submitter has to reconfirm. Measured entries do not
  -- expire — the daily check is the proof. Null for measured rows.
  confirm_by timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A measured row must carry the date it was measured, always.
  constraint channels_measured_has_a_date check (
    metrics_source = 'declared' or metrics_checked_at is not null
  ),
  -- A declared row must carry its expiry, always.
  constraint channels_declared_expires check (
    metrics_source = 'measured' or confirm_by is not null
  ),
  -- One entry per channel. Case-insensitive, so citext — the lesson from
  -- link_pages.handle (06-gotchas: "citext makes a regex CHECK
  -- case-insensitive too", so no regex CHECK goes on this column).
  constraint channels_one_per_handle unique nulls not distinct (platform, tg_username)
);
```

### Liveness is computed at read time, never stored

`job_posts` proved this: **expiry is not a status.** Same here — there is no
`activity` column and no cron that writes one.

```
active   = last_post_at > now() - 14 days
quiet    = last_post_at > now() - 90 days
dormant  = otherwise
unknown  = last_post_at is null   (every declared row starts here)
```

Lives in `@goplaza/core/channels.ts` next to `live-status.ts` and `jobs.ts`,
so web and mobile cannot disagree about what "فعال" means. This is the whole
point of the mobile-lags-web memory: a rule that lives in `apps/web` is a
rule in one app.

A dormant channel is **labelled, not hidden.** Removing it destroys the one
fact this section exists to publish.

### `channel_member_snapshots`

```sql
create table public.channel_member_snapshots (
  channel_id uuid not null references public.channels (id) on delete cascade,
  day date not null,
  member_count integer not null,
  primary key (channel_id, day)
);
```

Two columns and one insert per channel per day, written by the check cron.
After a month it answers *"این کانال ماه گذشته ۱۲٪ رشد کرد"*, which nobody
else in this market has.

**This is the only part of the build that is time-critical.** Every day it is
not written is a day of history that cannot be recovered later. It ships in
the same commit as the cron, not after.

### Analytics: extend, do not add

`analytics_daily` is already subject-generic (`subject_kind`, `subject_id`)
and `event_types` is already a registry. So:

- extend the `subject_kind` check on both to include `'channel'`;
- insert two rows into `event_types`: `channel_view`, `channel_join_click`
  (`min_feature` null — everything here is free);
- add a small `channel_events` raw table shaped like `link_events` minus the
  paid-tier dimensions, on the same 90-day prune;
- generalise `roll_up_link_day` or add `roll_up_channel_day` beside it.

`link_events.page_id` is NOT NULL and its dimensions exist to justify the $13
tier; bending it around a free feature would make both harder to read. The
**rollup** is shared, which is the part that matters — one definition of a
day, one definition of a unique visitor. (See the gotcha "A daily rollup is
not a total".)

**Join clicks matter more than views** and should be the ranking signal a
human sees. A view means the page opened; a click means somebody actually
went.

**View counts stay hidden below a threshold** (~50). On launch day every
channel has four views, and printing that makes the whole section read dead.
Same trap as "۰ نظر".

### Reports: extend `business_reports` again

Exactly what `20260830400000_link_page_reports.sql` did for bio pages: relax,
add `channel_id`, extend the `has_subject` check, index it. One queue, the
one the admin already opens. A second queue is the one nobody opens.

**The report button must do something.** In a section where most rows are
unverifiable claims, reports are the only quality control there is — and this
repo has already shipped a report button that only raised a toast.

---

## Surfaces

| Surface | Route |
|---|---|
| Index — paged (24/page), sorted, filtered by platform / subject / city / activity | `/channels` |
| Category | `/channels/category/[slug]` |
| Detail (English slug) | `/channels/[slug]` |
| Submit | `/channels/submit` (auth required) |
| My submissions | `/dashboard/channels` |
| Moderation queue | `/admin/channels` |
| Sitemap | published channels + categories, in `app/sitemap.ts` |
| Mobile | read side, same as every other feature |

`/channels/[city]` is **not** a route. That is the `/jobs/[city]` mistake:
it collides with `/channels/[slug]` in the same segment and a slug that reads
like a city resolves to the wrong page. City filtering is `/channels?city=…`
with chips built from cities that actually have entries.

Default sort on the index: **activity, then join clicks.** Not members.

### The cron

`/api/cron/channel-metrics`, daily, same `CRON_SECRET` bearer shape as
`blog-syndicate`. For every published row with `tg_username`:

1. read title, member count, last post time, 30-day post count from the
   public preview — **metadata only, no post text is stored or displayed**;
2. write the metrics and `metrics_checked_at`;
3. insert today's `channel_member_snapshots` row;
4. if the **title changed materially**, push the row back to
   `pending_moderation` with a reason. A group renamed after approval is the
   main abuse path and it is otherwise invisible;
5. on failure, increment `check_failures` — never blank an existing number,
   and never 500 the route. After N consecutive failures the row flips to
   `declared` and the UI stops claiming the number is measured.

Stagger the fetches; a few hundred rows against an unofficial endpoint is
polite-only-if-paced.

---

## Phase 2 — the bot (separate build, separate doc)

Not designed here. What it unlocks, and the only reason it is named now, is
so phase 1 does not paint over it:

- **real ownership proof** — the admin makes our bot an admin of the channel;
- live `last_post_at` instead of daily;
- a stats panel for the channel owner;
- private channels, which are unmeasurable today.

The constraint on phase 1: **`verified` must be a separate concept from
`measured`.** "We can read this channel's public page" and "this person
proved they own it" are different claims. If phase 1 conflates them, phase 2
has to redefine a column that is already being read in four places.

---

## What this design deliberately does not include

- **No channel content, ever, in any form.** No embeds, no post archive, no
  preview text. This is what keeps someone else's scam post off `goplaza.ca`.
- ~~No verified badge in phase 1.~~ **Reversed 26 Aug.** That rule confused
  "we have no automated proof" with "we have no proof". A GOPLAZA admin
  confirming a channel they know is a human attestation — the same thing
  `businesses.verification_method` has always recorded — and refusing to store
  it made the site's own channel read «مالکیت تأیید نشده». There is a badge,
  it names its method (`admin` today, `bot` in phase 2), and it lapses in 182
  days like a listing's. What stays true: nothing renders `bot` until the bot
  writes it, and no badge appears without a subject, a method, a time and an
  unexpired window.
- No paid placement, no promotion, no plan gate.
- No member-count leaderboard. Bought members are undetectable and ranking on
  them rewards exactly the wrong channels.
- No in-app messaging, no join-through-us flow.
- No WhatsApp metrics of any kind, at any point. There is no API. Every
  WhatsApp row is `declared` forever, and the UI says so.
