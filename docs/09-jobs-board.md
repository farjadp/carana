# Jobs board — design

**Written:** 2026-08-18 · **Status:** designed, not built · **Owner:** Claude
**Decisions by Farjad:** 18 Aug (four forks, recorded below with what they rule out)

The Notion row "Jobs board: businesses post hiring ads" has been in Backlog
since 15 Aug with one sentence of description. This is that sentence turned
into something buildable.

---

## Why this and not something else

`08-competitors.md` §9 recommends نیازمندی first: cheapest to build, highest
repeat visits, and directly connected to business supply. Three reasons, in
the order they actually matter:

1. **Google Jobs.** A `JobPosting` JSON-LD block puts a listing inside
   Google's jobs widget. None of the seven competitors has it. This is the
   largest free-traffic lever available to the project and it is the real
   argument for the feature — bigger than the `/jobs` page itself.
2. **A reason to come back.** A directory is static. Hiring ads change weekly.
3. **Acquisition.** Whoever posts a job *is* a business. The requirement to own
   a listing before posting is the funnel, not a limitation.

---

## Decisions taken (18 Aug)

| Fork | Chosen | What it rules out |
|---|---|---|
| Who may post | **Owner of an existing listing** (`created_by` or `owner_user_id`) | No listing-less posters; no auto-created DRAFT businesses |
| Moderation | **Verified publishes directly; everyone else queues** | Not blanket manual review; not a free-for-all |
| Plan caps | **Free and unlimited for everyone, for now** | No `jobs` feature in `plans.ts`, and nothing on the pricing or features page may claim it as a paid perk |
| Scope | **Jobs only** | Rent and buy/sell are a later build on the same foundation, not this one |

The plan-cap answer has a consequence that has to be designed around rather
than argued with: with no cap **and** direct publish for verified businesses,
one account can post fifty ads. See "Abuse ceiling" below — that guard is a
rate limit, deliberately not a plan gate, so it never turns into a thing to
sell later.

---

## Data model

`job_posts`, following `business_announcements` exactly: no client-facing
insert/update/delete policy at all, every write through a server action with
the service role after it re-proves ownership.

| Column | Notes |
|---|---|
| `id`, `business_id`, `created_by` | `business_id` is required — a job always belongs to a listing |
| `slug` | **English**, unique. Per the standing URL rule. Needs `latinSlug` moved out of `scripts/import-listings.mts` into `@charana/core` |
| `title`, `description` | Persian or English, owner's choice |
| `employment_type` | `full_time` \| `part_time` \| `contract` \| `casual` \| `internship` |
| `workplace_type` | `on_site` \| `hybrid` \| `remote` |
| `city`, `province` | Default from the business, overridable — a Toronto office may hire in Vancouver |
| `salary_min`, `salary_max`, `salary_period`, `salary_is_public` | `hour` \| `month` \| `year`, CAD |
| `requires_persian`, `requires_english` | **The differentiator.** The reason this board exists rather than Indeed |
| `apply_method`, `apply_value` | `email` \| `phone` \| `url` |
| `status`, `moderation_reason`, `reviewed_by`, `reviewed_at`, `published_at` | Mirrors `public_reviews` |
| `expires_at`, `closed_at`, `view_count` | |

### Status

`pending_moderation` → `published` → `closed`, plus `rejected`.

**Expiry is not a status.** A post is live when
`status = 'published' and closed_at is null and expires_at > now()`, computed
at read time — the same rule `verified_until`, `plan_until` and
`busy_status_until` already follow in this codebase. Nothing is ever trusted
past its own timestamp, and no cron job is needed to make the board honest.

Default `expires_at` = 30 days. Owner can extend or close early. This is not
negotiable: a jobs board full of dead ads is worse than no jobs board, and
Google requires `validThrough` and expects filled postings to disappear.

---

## Three rules that are part of the design, not options

1. **Applications happen off-site.** `apply_value` is an email, phone or URL.
   Building an applicant tracker is a different product. But the contact is
   **revealed on click**, and the click writes a `job:apply_click` row into
   `business_events` — which is exactly the "۱۲ نفر روی درخواست کلیک کردند"
   number `08-competitors.md` §9.5 calls the key to revenue.
2. **Salary: a number or an explicit "توافقی".** Never a silently empty field.
   **Farjad must check before launch:** Ontario's pay-transparency rules for
   publicly advertised postings came into force in 2026. I am not in a
   position to state the details — verify against a primary source. If it is
   mandatory, `salary_min` stops being optional and the form must enforce it.
3. **No fake counts.** "۳ فرصت شغلی" only ever renders from a live count;
   sections are absent when empty, per the house rule.

### Abuse ceiling (because there is no plan cap)

Counted in the database, not `lib/utils/rate-limit.ts` (which resets on
deploy and is not shared between instances — the lesson from the review caps
in `5c80228`):

- **5 new posts per business per rolling 24h.**
- Business must be `PUBLISHED`/`APPROVED` — no jobs on a listing the public
  cannot open.
- Verified-publishes-directly is revocable: an admin can flip a business to
  "always moderate" if it abuses the fast path.

---

## Surfaces

| Surface | Route |
|---|---|
| Index, filterable by city / category / type / language | `/jobs` |
| City | `/jobs/[city]` |
| Detail (English slug, `JobPosting` JSON-LD) | `/jobs/[slug]` |
| On the business profile | «فرصت‌های شغلی» section, live posts only |
| Owner management | `/dashboard/business/[id]/jobs` |
| Moderation queue (unverified posters only) | `/admin/jobs` |
| Sitemap | live posts, added to `app/sitemap.ts` |
| Mobile | read side: list + detail, same as every other feature |

### Emails

Reuse the review-moderation notifier (`5c80228`): published / rejected mail to
the poster carrying the moderator's reason. Plus a 3-days-before-expiry nudge
— "تمدید کن یا ببند" — reusing the reminder-stage pattern from
`verification-status.ts`.

---

## What this design deliberately does not include

Listed because omitting it silently is what would make the rest untrustworthy:

- No applicant tracking, no CV upload, no in-app messaging.
- No salary benchmarking, no company reviews-as-employer.
- No paid promotion of a job ad. (When that arrives it belongs in `plans.ts`
  as a labelled placement, under the same "ویژه is always labelled" rule.)
- No rent / buy-sell classifieds — a later build on this foundation.
- Imported listings (≈5,600) cannot post anything, because nobody has claimed
  them. That is correct and it is also the acquisition pitch.
