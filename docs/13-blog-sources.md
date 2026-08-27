# Blog: writing from external sources, and syndication

**Added:** 2026-08-24 · Code: `apps/web/lib/blog/*`, migration
`20260830320000_blog_sources.sql`

The blog had one way to find a topic: our own data — category rotation, city
counts, zero-result searches, suggestions, the calendar. Good, but slow, and
blind to anything happening outside the directory. This adds a second way:
read what other Persian-Canadian publications are covering, and write our own
article about the same subject.

## The line we do not cross

**We take the subject and the facts. We never take the prose.**

That is not a stylistic preference. Republishing a rewrite of someone's
article is their copyright, and Google files it under scaled content abuse —
the exact thing the data-driven generator was designed to avoid. So the source
pipeline is built the long way round:

1. The model reads the source article and produces a **fact sheet** — discrete
   claims, each with an attribution ("۲۴٪ افزایش" [مرکز آمار کانادا]) — plus
   **GOPLAZA's own angle**: what this means for an Iranian family here and
   what they should do about it. It may also refuse; see "Refusals" below.
2. A second call drafts an original article **from the fact sheet**, with our
   headings, our order, our numbers and our internal links. It has no access
   to the source's wording at that point.
3. The **originality gate** compares the finished body with the source text.
4. The source is cited on the published page and stored on the row.

### The originality gate

`originality()` in `source-writer.ts` counts ten-word runs (نیم‌فاصله folded,
punctuation and harakat stripped) shared between our body and the source.

| Case | Shared runs |
|---|---|
| The source fed back as if it were ours | 386 |
| A real draft, first measured run | 2 |
| A real draft, second measured run | 4 |
| An unrelated article from the same site | 0 |
| A loose paraphrase | 0 |

The threshold is **6 runs or 2%**, whichever trips first. Restating a statistic
legitimately collides — "لباس کودکان ۸/۵ درصد و کفش ۷ درصد ارزان‌تر شده" is the
same nine words in any honest retelling — so the gate sits an order of
magnitude below "copied" and just above "restated a number". A rejected
article is written into the ledger with the offending run as its reason, so a
badly-set threshold shows up as something an admin can read.

## Sources and the ledger

`blog_sources` is the registry; `blog_source_articles` is the ledger of every
article we have seen. The ledger is what makes "ten **new** ones" mean anything
across daily runs, and it is what makes the fallback possible.

**atash.ca** is seeded: WordPress, REST collection at `/wp-json/wp/v2/posts`,
15,438 posts. Discovery is the REST collection, not the sitemap — the same
lesson as `scrape-gooya.mts`. Category 121 (`advertorial`) is excluded because
those are paid placements.

**"If fewer than ten are new, take from the archive."** `harvest(n)` pulls the
fresh window first (`fresh_days`, default 21). If that is short, it pulls a
**random page** of the archive within the last ~3 years — always reading from
one end would mine the same decade forever. Anything the run does not reach
stays `new` in the ledger for tomorrow.

### Refusals

The read step returns `usable: false` with a reason for: paid placements,
dated news with nothing left to act on, partisan politics, crime, stories about
a named private individual, subjects unrelated to living or spending money in
Canada, and anything whose facts cannot be restated without leaning on the
source's wording. Archive articles are held to the "still live?" test strictly.
Refusals are recorded so the same article is never read twice.

## AIO / GEO

Both writers now share `AIO_RULES` and produce `key_takeaway` — 40–60 Persian
words that answer the article's question outright, rendered as the first block
on the page and mirrored into the Article LD as `description`. It is the
passage an answer engine lifts. Also enforced: every `##` is a question or a
plain noun phrase answered completely in its first two sentences; a GFM table
whenever anything is comparable (`.prose-fa table` already styles them);
entities in full on first mention with their province; a date on every
time-sensitive claim; `citation` in the Article LD from `sources`.

## Honesty guards

Two model passes are allowed to be creative — `expand()` and `humanise()` —
and creativity is where a model invents "۱۵ درصد صرفه‌جویی" or "تابستان ۲۰۲۳".
`inventedNumbers()` compares the digits before and after each pass. `expand`
keeps the shorter draft if it offends; `humanise` retries once with the
offending figures named, then falls back to the draft prose. A stiffer article
is a far cheaper mistake than a confident wrong one.

The same guards caught first-person singular leaking into the humanised prose
("وقتی به این اعداد نگاه می‌کنم") — `HUMAN_VOICE` now bans first-person singular
verbs explicitly, and limits the "ما در گوپلازا" aside to restating a number
already in the article. GOPLAZA launched in 2026 and has no observations from
before it.

## Syndication (Telegram, LinkedIn)

`blog_syndications` holds one row per (post, channel) with a unique key — that
key is the only thing standing between a retry and a double-post. Nothing
decides "have we posted this?" from memory.

- A channel with no credentials is **skipped**, never failed, and the desk only
  renders a share button for a channel `configuredChannels()` reports.
- Nothing is ever shared from a draft; `syndicate()` refuses any post whose
  status is not `published`, because the link would 404 for everyone else.

Wiring them up:

| Channel | Env | How |
|---|---|---|
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID` | @BotFather → new bot → add it to the channel as an admin with "post messages". Channel id is `-100…` or `@name`. |
| LinkedIn | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_ORG_ID` | Community Management API app with `w_organization_social`, a company-page token, and the numeric page id. `LINKEDIN_API_VERSION` defaults to `202508`. |

`BLOG_SYNDICATE_ON_PUBLISH=true` shares automatically the moment a post is
published. Off by default: with it off, an admin presses the button.

### The GOPLAZA Telegram channel

`@GoPlaza` (peer id 4473764647). Connecting it needs two variables and one
step that is not a variable:

```
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_CHANNEL_ID=@GoPlaza
```

**The bot must be an administrator of the channel with "post messages".**
Without that every send fails with `CHAT_ADMIN_REQUIRED`, and the token being
correct makes no difference. This is the single most likely reason a
freshly-connected channel sends nothing.

### The backlog

Telegram was connected when the blog already had 74 published posts.
`syndicateBacklog()` works through "published but never successfully sent on
this channel", **oldest first**, so the channel reads in the order the blog was
written rather than backwards.

Two decisions worth keeping:

- **It is paced, 3.5 s between sends.** Telegram throttles a channel at about
  twenty messages a minute, but the real reason is editorial: 74 back-to-back
  notifications to a channel with one subscriber reads as a bot dumping, not a
  publication publishing. `BLOG_SYNDICATE_PER_RUN` (default 3) is the daily
  drip; the admin desk can send a larger batch by hand.
- **It stops on the first failure.** A failure here is nearly always one of the
  two configuration problems above, and both would otherwise repeat 74 times.

| | |
|---|---|
| Cron | `/api/cron/blog-syndicate`, 15:00 UTC daily |
| Check without sending | `/api/cron/blog-syndicate?dry=1` — reports the backlog per channel |
| Send more, one channel | `/api/cron/blog-syndicate?channel=telegram&n=20` |
| Admin | Blog desk → «هم‌رسانی», which shows how many each channel still owes |

## What the first live runs proved

Run against the real site on 24 Aug, after the migration landed:

- Harvest banked **17 unused articles** from the fresh window on the first
  call; the daily run now has a queue rather than a scramble.
- Of four articles read, **two were refused** with reasons — a Trudeau/Katy
  Perry security-cost story ("صرفاً یک بحث سیاسی … هیچ پیام عملی") and a
  police-and-a-statue piece. That is the filter working, not failing.
- A finished post: **1,141 words**, a GFM table, cover + inline image in the
  `blog` bucket, **8 internal links** with natural Persian anchors, the source
  cited, status `review`.

Three defects were found and fixed by those runs, all written up in
`06-gotchas.md`: refusals could not satisfy the schema; a link without a
leading slash passed the link gate invisibly; and the expand guard abandoned
the expansion on the first slip, leaving articles at ~520 words.

## The daily card (Telegram snippets)

A channel that only ever says "new article: <title>, <link>" is a feed, and
nobody subscribes to a feed they could have bookmarked. Snippets are the other
half: one interesting thing lifted out of an article we already published,
written to stand alone. You should be able to read the card, learn the thing,
and never click.

`blog_snippets` + `lib/blog/snippets.ts`. Seven kinds — آمار جالب، دانستنی،
نکتهٔ عملی، مقایسه، اشتباه رایج، پرسش و پاسخ، خبر — each briefed as a *test the
card must pass* rather than a topic, because "write a fun fact" produces a fun
fact about nothing.

**No link.** A card carries no "متن کامل در…" line. It was always written to
stand alone, and a link underneath reframes a finished thought as a teaser. The
brief is stricter for it: nothing is appended, so the last sentence written is
the last thing anyone reads, and whatever is left out is lost.

Four things keep it from becoming slop:

- **Nothing is invented.** The writer gets one published article and must lift
  something already in it; then `inventedNumbers()` — the same guard the
  article pipeline uses — checks every digit in the card against that article,
  and a card that introduced one is stored as `skipped` with the reason instead
  of being sent. This is the whole reason a card can be auto-published without
  a human reading it first.
- **It cannot repeat itself.** `unique (source_post_id, kind)` in the database.
  The picker prefers articles never drawn from, and among the free kinds takes
  the one used least recently across the channel.
- **The writer may refuse.** `usable: false` on an article with nothing worth
  saying in that format. There are 74 others; a weak card is worse than none.
- **It cannot claim what we are not.** Three checks, each written after a real
  card failed it: a verification count must name the brand (`brand.nameFa`, not
  a literal — see `06-gotchas`) or it is a claim about Canada rather than about
  us; a capability the card names (فیلتر، ابزار، قابلیت، نقشه، اعلان) must
  already appear in the source article, because a card once offered readers a
  product filter that does not exist; and a card may never claim to have
  observed anything (`دیده‌ایم`, `متوجه شده‌ایم`) — a listings table does not
  know what customers choose.

**Acceptance rate so far: about half.** Of the first five cards read by a human,
two were publishable and three invented something — an official approval, a
"second largest hub" ranking, a product feature. Each failure produced a check.
Whether that is now good enough for unattended nightly publishing is the open
question in `05-open-tasks`.

Rejected cards are kept and shown in the admin queue. "The writer keeps making
up figures about this post" should be readable, not inferred from silence.

| | |
|---|---|
| Cron | `/api/cron/blog-snippet`, 17:30 and 22:30 UTC — two runs of one, not one run of two, because two cards in the same minute read as a batch |
| Count | `BLOG_SNIPPETS_PER_RUN`, default 1, max 5 |
| Sample the tone | `?dry=1` — writes nothing, sends nothing, returns what it would have said |
| Queue without sending | `?send=0` |
| Admin | Blog desk → «کارت‌های روزانهٔ تلگرام»: write, edit, publish, archive. A **sent** card is not editable — editing the row would not change the message in Telegram, only make the record disagree with what subscribers saw. |

## Running it

| | |
|---|---|
| Cron | `/api/cron/blog-source`, 12:00 UTC daily (data-driven writer stays at 11:00) |
| Count | `BLOG_SOURCE_PER_DAY`, default 5, hard max 10 per run |
| By hand | `/api/cron/blog-source?n=3&dry=1` — `dry=1` skips the image spend, `publish=1` goes live instead of into the review queue |
| Admin | Blog desk → **از منابع بنویس**. The source panel shows how many unused articles each source still holds. |

Articles are written **sequentially**, not concurrently: three model passes and
two images each, and ten in parallel would blow the rate limit and the
serverless budget. A run of ten will not finish inside one invocation; the
remainder stays in the ledger. That is why the default is five.
