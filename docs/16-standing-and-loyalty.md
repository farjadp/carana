# Standing & loyalty — architecture spec

**Written:** 2026-08-26 · **Status:** **SPEC ONLY — nothing built** ·
**Owner:** Claude
**Decisions by Farjad:** 26 Aug (brainstorm — recorded below with what each rules out)
**Names:** «اعتبار مشارکت» (users) · «وفاداری مالک» (business owners)

> This document is the design. No migration, no route and no core module from
> it exists yet. Read `## Build order` before starting anything.

---

## The one idea everything else follows from

**Points are settled, not granted.**

Every other loyalty system in this category pays at the moment of the action:
you submitted a channel, here are 20 points. For a directory that is the wrong
incentive, because our value is not the volume of contributions — it is
whether they are **true**. Volume we can get for free from anyone with a
keyboard.

So a contribution enters the ledger as **pending**, becomes **confirmed** only
when something independent agrees with it (an admin approved it, the metrics
cron reached the channel, the review survived moderation), and is **reversed**
when a report against it is upheld or it is later suspended.

The number a user sees is therefore not "how much did you do" but "how much of
what you did held up". That single property is what makes the rest of this
safe to build.

---

## Two programs, and the wall between them

| | **اعتبار مشارکت** (standing) | **وفاداری مالک** (owner loyalty) |
|---|---|---|
| Who | Any signed-in user | The owner of a listing |
| Earned from | Contributions that were confirmed | Continuous paid tenure + upkeep of the listing |
| Storage | An append-only ledger (`standing_events`) | **Nothing new** — derived from `subscriptions` / `invoices` at read time |
| Pays out in | Permission and recognition | Economic value: renewal discount, capacity, seat priority |
| Never pays out in | Money | A trust signal |

### The wall

**Neither program may ever contribute to what a visitor reads as the
credibility of a business.** The public trust block on a profile stays
evidence-only — verification state, age, owner identity, reviews, upheld
reports, data freshness. All of that already exists in the schema; none of it
is earned by activity.

The reason is `plans.ts`'s first product rule: verification is never sold. A
loyalty tier that shades into a trust badge sells it through the back door.
"۳ سال در گوپلازا" is a **fact** and may appear on a profile. "کسب‌وکار مورد
اعتماد" is a **claim** and may not.

Concretely, the code rule: nothing that renders on `/businesses/[slug]` above
the fold may read from `user_standing` or from tenure.

---

## Decisions taken (26 Aug)

| Fork | Chosen | What it rules out |
|---|---|---|
| Currency | **No spendable coin.** XP is a gate, not a wallet | A rewards shop; a balance that goes down; anything that looks like a discount you bought |
| Settlement | **Pending → confirmed → reversed** | Instant credit on submit; volume farming |
| Level names | **Functional Persian, no metals** | Bronze/Silver/Gold/Platinum — پلاتینیوم is a *paid plan* with 21 national seats and the collision is unacceptable |
| Level count | **Four**, each unlocking something real | A seven-rung ladder where five rungs are decoration |
| Streaks | **None** | A daily-login mechanic that punishes the healthy user, who visits when they need something |
| Maintenance | **An activity window, like verification's 182 days** | A user who was active in 2026 keeping a moderation privilege in 2028 |
| Badges | **Deferred to phase 3**, and they unlock nothing | Badges as a second permission system, which is a second thing to farm |
| Purchase axis | **Does not exist** | Everything in the ChatGPT sketch built on `orders` — we have no user↔business transactions, and the schema confirms it (no `orders`, no `coupons`, no `referral`) |
| Referrals | **Not in v1** | The single most farmable mechanic in a community this size |
| Leaderboard | **Never, without a decision recorded here** | A public ranking of neighbours in a small diaspora community |
| Who is a نگهبان | **Granted by an admin, never automatically** | An algorithm handing out moderation powers |

---

## Data model

Three tables. One is the truth, one is a cache, one is the tuning surface.

### 1. `standing_events` — the ledger (the truth)

Append-only. Rows are never deleted and `points` is never rewritten.

```sql
create table public.standing_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  -- What kind of contribution. Free text, validated against standing_rules.kind
  -- rather than a check constraint, so a new kind is a row and a call site,
  -- not a migration. See "Extending this".
  kind          text not null,

  -- What it was about. Generic on purpose: the subject may be a business, a
  -- channel, a review or a report today, and something else later.
  subject_type  text not null,
  subject_id    uuid,

  state         text not null default 'pending'
                check (state in ('pending','confirmed','reversed','void')),

  -- Points FROZEN at settlement, copied from standing_rules at that moment,
  -- with the rule version that produced them. Retuning the economy must never
  -- rewrite what someone already earned.
  points        int  not null default 0,
  rule_version  int,

  settled_at    timestamptz,
  settled_by    uuid references auth.users (id) on delete set null, -- null = system/cron
  reason        text,          -- required for a manual settle or reversal
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),

  -- Idempotency. One contribution produces at most one event, however many
  -- times the emitting code runs.
  constraint standing_events_once unique (kind, subject_type, subject_id, user_id)
);
```

Indexes: `(user_id, state)`, `(state, created_at desc)` for the admin queue,
`(subject_type, subject_id)` so a reversal can find its event.

RLS: service-role only for write. Admin read. **Self read** — a user may see
their own ledger, including the reversals, and that page is the honest answer
to "why did my number go down".

`void` exists for events that should never have been recorded at all (a
duplicate the unique constraint did not catch, a test row). It is not a
punishment state; `reversed` is.

### 2. `standing_rules` — the tuning surface

One row per contribution kind. **This table is what the admin page edits.**

```sql
create table public.standing_rules (
  kind          text primary key,
  label_fa      text not null,
  subject_type  text not null,
  points        int  not null default 0,
  daily_cap     int  not null default 10,  -- events per user per day that can settle
  enabled       boolean not null default true,
  version       int  not null default 1,   -- bumped on every points change
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null
);
```

Seeded kinds for v1 — every one of these has an existing table behind it:

| kind | subject | confirmed when | reversed when |
|---|---|---|---|
| `channel_submit` | `channels` | status → `published` | status → `rejected` / `suspended` |
| `business_submit` | `businesses` | listing goes live | listing removed as bogus |
| `business_edit` | `businesses` | `business_change_reviews` approved | change rolled back |
| `review_publish` | `public_reviews` | status → published | review unpublished by moderation |
| `report_upheld` | `business_reports` | report resolved as valid | — (an unfounded report simply never confirms) |
| `channel_reconfirm` | `channels` | reconfirm accepted before `confirm_by` | — |

Note `report_upheld` has no reversal path and that is deliberate: a report that
turns out to be wrong is not a betrayal, it is a guess. It earns nothing. What
we must not do is *punish* reporting, or nobody reports.

### 3. `user_standing` — the cache (never the truth)

```sql
create table public.user_standing (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  xp               int  not null default 0,   -- lifetime, monotonic, never decreases
  confirmed_count  int  not null default 0,
  reversed_count   int  not null default 0,
  distinct_kinds   int  not null default 0,   -- the variety requirement
  accuracy         numeric(4,3),              -- confirmed / (confirmed + reversed), trailing window
  last_confirmed_at timestamptz,

  -- NOTE: there is deliberately no `level` column. Level is a pure function of
  -- the aggregates above plus the thresholds, computed at read time by
  -- `levelFor()` in @goplaza/core. Storing it would create a second answer
  -- that can disagree with the first, and would have to be recomputed on
  -- every threshold change. peak_level IS stored, because a high-water mark
  -- is not derivable from a snapshot.
  peak_level       int  not null default 0,   -- lifetime high, never drops
  peak_level_at    timestamptz,

  -- Admin overrides. Both require a reason and are logged.
  level_grant      int,        -- non-null pins the level (this is how نگهبان is given)
  frozen           boolean not null default false,
  admin_note       text,

  recomputed_at    timestamptz
);
```

**`user_standing` is always fully derivable from `standing_events` +
`standing_rules`.** If the two ever disagree, the ledger wins and the cache is
wrong. One function owns the derivation:

```sql
public.recompute_standing(p_user uuid) returns void
```

called on settle, on reversal, and by a nightly cron for the whole table.

It writes **only the aggregate columns**. It does not compute a level: SQL
would then hold one definition of the ladder and `@goplaza/core` another, and
mobile would read the wrong one — exactly the split `plans.ts` v3 was written
to close. The division is: **SQL counts, TypeScript judges.**

Maintenance decay needs no writer at all as a result. `levelFor()` reads
`last_confirmed_at`, so a level lapses on its own the moment the window
passes, with nothing scheduled. The nightly cron exists only to keep the
aggregates fresh and to update `peak_level`.

Why a cache at all: level is read on every page that gates on it, and summing
a ledger per request does not survive contact with the listing pages.

---

## Levels

Four. Each one unlocks something that exists. A level that unlocks nothing
gets deleted from this table rather than kept as decoration.

| # | Name | Unlocks |
|---|---|---|
| 0 | **تازه‌وارد** | Nothing. Every contribution goes to the queue. |
| 1 | **مشارکت‌کننده** | Their queue items are sorted ahead of anonymous ones; their contribution count appears on their own profile |
| 2 | **معتمد** | **Low-risk edits publish without the queue**, audited afterwards |
| 3 | **نگهبان** | A read-only queue view and the ability to flag for admin attention |

### How a level is reached

Levels 1 and 2 are automatic and require **all** of:

- `xp` at or above the threshold,
- `confirmed_count` at or above a floor,
- `accuracy` at or above a floor,
- `distinct_kinds` at or above a floor — **variety, not volume**. Two hundred
  identical hour-corrections must not reach معتمد,
- `last_confirmed_at` inside the maintenance window.

Level 3 is **never automatic**. `level_grant` is set by an admin, with a
reason. Handing out moderation powers by arithmetic is how a queue gets
poisoned.

Defaults live in `@goplaza/core/standing.ts` and are overridable from
`site_settings`. Starting values, to be tuned once there is real data — they
are guesses and the doc should say so:

| | level 1 | level 2 |
|---|---|---|
| xp | 100 | 500 |
| confirmed | 5 | 25 |
| accuracy | 0.80 | 0.90 |
| distinct kinds | 1 | 3 |

### Maintenance and decay

Same philosophy as `VERIFICATION_WINDOW_DAYS`: a privilege granted on evidence
from a year ago is not evidence today.

- Window: **180 days** since `last_confirmed_at` (default, tunable).
- Past it, the computed level falls to 0. `peak_level` and `xp` **do not move**.
- The UI shows both: «بالاترین سطح: معتمد · سطح فعلی: تازه‌وارد». The first is
  a fact about the past and stays true.
- Recovery is by contributing again, not by re-earning from zero — the
  thresholds are cumulative, so one confirmed contribution restores the level.

Accuracy is separate and **immediate**: dropping below the floor demotes on the
next recompute, without waiting for the window. Decay is about absence;
accuracy is about being wrong.

---

## Anti-farming, in v1 and not as a phase 2

A points system in a diaspora community this size will be farmed within a week
by five people with fifty accounts. These are load-bearing, not hardening.

1. **Only a verified account accrues.** An unverified user's contributions are
   still *recorded* as `pending` — so that when they verify, the backlog can
   settle retroactively — but they never confirm before then.
2. **Daily cap per kind**, from `standing_rules.daily_cap`. Events past the cap
   stay `pending` and settle on later days; they are not thrown away.
3. **No self-dealing.** A contribution to a business the user owns, claims, or
   has a `business_memberships` row for earns nothing. The submitter of a
   channel does not earn from their own `channel_reconfirm` either — that is
   an obligation, not a favour.
4. **Reversal is symmetric.** An upheld report against a subject reverses every
   confirmed event pointing at that subject.
5. **Variety gate** on level 2, as above.
6. **`frozen`** stops all accrual for one user pending investigation, without
   destroying their history.

---

## Owner loyalty — derived, no new tables

Two numbers, both computed at read time from data we already bill against:

- **`tenure_months`** — continuous paid months from `subscriptions` /
  `invoices`. A lapse of more than one billing period resets continuity; the
  lifetime total is kept separately and shown as a fact.
- **`upkeep`** — a boolean set: verification currently valid, hours present and
  edited within the window, replies to reviews. Each element is already
  computed somewhere in the app.

Rewards, all economic, none of them a signal:

| | |
|---|---|
| Renewal discount | Stepped by `tenure_months`, applied as a Stripe coupon at renewal |
| Capacity | Gallery / announcement / AI-credit bumps, expressed in `plans.ts` as an additive layer over the plan's own limits — **never** by pretending the business is on a higher plan |
| Platinum seat priority | When one of the 21 seats frees, longest continuous tenure is offered it first |

The capacity rule matters: `entitlementsFor` must stay the single answer to
"what may this business do", so a loyalty bump is an argument into it, not a
second code path that can disagree with it.

**No new table.** Tenure that is derived cannot drift from what Stripe says;
tenure that is stored will, on the first late webhook.

---

## Admin surface — what Farjad can change

New page: `/admin/(dashboard)/standing`. The distinction below is the point of
this section — the safe knobs are safe *because* the ledger freezes points at
settlement, so retuning changes the future and never the past.

### Green — edit freely, no deploy, no migration

Stored in `standing_rules` and in `site_settings` under key `standing`.

- **Master switch** — the whole program off. With it off nothing accrues and
  no level gates anything; events keep being recorded as `pending`, so turning
  it back on loses nothing.
- **Per kind**: points, daily cap, enabled/disabled.
- **Level thresholds**: xp, confirmed floor, accuracy floor, variety floor.
- **Maintenance window** in days.
- **Public display on/off** — whether standing is visible anywhere outside the
  admin. **Default off**, see build order.

Changing points bumps `standing_rules.version`. Events already settled keep
their frozen `points` and their old `rule_version`. The page must say this on
screen, because the natural fear when editing a number is "did I just rewrite
everyone's history".

### Amber — allowed, but requires a typed reason and is logged

- Manually settle or reverse a single event.
- Grant or revoke **نگهبان** (`level_grant`).
- Freeze or unfreeze a user.
- Force a recompute for one user or for all.

Each writes `settled_by` / `admin_note` and a `user_activity_logs` row. An
amber action with an empty reason is refused by the form, not just discouraged.

### Red — not in the admin at all; code and migration only

- **Adding a new `kind`.** A kind without a call site emitting it is a rule
  that fires never; adding one in the UI would create a setting that silently
  does nothing. New kinds ship with the code that produces them.
- **What "low-risk edit" covers** — the field list that level 2 may publish
  without review. That is a safety boundary and belongs in
  `@goplaza/core`, reviewed in a diff, next to `critical_fields` which already
  encodes the same judgement for `business_change_reviews`.
- **Rewriting historical points or deleting ledger rows.** There is no UI for
  it and there should not be.

### What the page shows besides the knobs

Following the settings page's existing habit of probing rather than assuming:
pending event count, settled today, reversal rate over 30 days, users per
level, and a live probe of whether the migration is actually applied.

---

## Extending this

The shape was chosen so that each of these is additive.

1. **A new contribution type** → one `standing_rules` row + one call site that
   inserts a `pending` event + one settle hook. No schema change.
2. **A new axis** (if streaks are ever wanted after all) → a derived column on
   `user_standing` and a change to `recompute_standing`. The ledger already
   holds the timestamps; nothing needs backfilling, because the truth was
   never the cache.
3. **A new privilege** → an entry in the privileges map in
   `@goplaza/core/standing.ts`, keyed by level. Web and mobile read the same
   map, so a privilege cannot exist on one and not the other — the mistake
   `plans.ts` v3 was written to stop.
4. **Badges** (phase 3) → a pure function over the ledger, `badgesFor(events)`.
   No badge table. A badge is a *view* of history, so it can never disagree
   with history, and re-tiering a badge family is a code change with no data
   migration.
5. **A spendable currency**, if we are ever wrong about not wanting one → a
   `standing_wallet` table that debits against a *separate* balance derived
   from XP. XP itself stays monotonic, which is exactly the XP/coin split that
   makes this survivable. Nothing in this spec has to change.
6. **Standing for businesses rather than users** → `subject_type` is already
   generic and `user_id` would become nullable beside an `actor` column. This
   is the one extension that costs a migration, and it is listed so that a
   future session knows the shape rather than discovering it.

---

## Build order

The directory's user-contribution volume is low today and `channels` is empty.
A loyalty programme with no participants is a lit hall with nobody in it, so
the public-facing half is deliberately last.

1. **Ledger, rules, recompute, admin page. No public UI at all.**
   `standing.public_display` defaults **off**. Even with nothing rendered this
   pays for itself: it makes the moderation queues sortable by who has been
   right before.
2. **Level 2 — auto-publish for low-risk edits.** The only piece that returns
   its cost immediately. Needs the `LOW_RISK_FIELDS` list in core and an
   after-the-fact audit view.
3. **Public display** — the user's own standing page, their ledger including
   reversals, then badges.
4. **Owner loyalty** — tenure discount and capacity bumps.

Nothing in step 1 is visible to a visitor, which means step 1 cannot ship an
unbacked claim. That is the intended property, not a scheduling accident.

### Built out of order — step 4 shipped 26 Aug, before 2 and 3

Farjad's call: what steps 1–3 build is the *contributor* half, and the ask was
a loyalty system. Step 4 also turned out to be the smaller build, because it
stores nothing.

**What phase 4 shipped:** `@goplaza/core/loyalty.ts` (tenure walked from paid
invoice periods, the tier ladder, the capacity bonus), `lib/loyalty/*`
(status, settings, Stripe coupons, waitlist), the discount applied at checkout
and by an owner-triggered `/api/loyalty/apply` for live subscriptions, a
loyalty card on the billing page, `/admin/loyalty`, and
`20260830450000_platinum_waitlist.sql`.

**Four decisions taken during the build, none of them in the spec above:**

| Decision | Why |
|---|---|
| **Upkeep gates the capacity bonus only, never the discount** | Room is reversible; money must be predictable. A renewal price that changes because a review went unanswered is a surprise, not a feature. |
| **The capacity bonus is zero on Premium and Platinum** | Both are already `photos: null` / `announcements: null`. "+5 photos" on an unlimited gallery is not a small reward, it is a false one. Only Starter has a ceiling to raise. |
| **The bonus is an argument to `entitlementsFor`, not a layer over it** | One answer to "may this listing do X". A second code path is how a gate and a page start disagreeing. |
| **Owner-triggered apply, not a cron** | A nightly job silently changing subscription prices is a lot of unattended authority over real money for a benefit nobody waits on by the minute. |

**Two Stripe facts the code bends around** rather than discovering in
production: Checkout refuses `discounts` and `allow_promotion_codes` together
(so an earned discount and a typed promo code cannot coexist — the earned one
wins), and in the pinned API version a `Discount` carries its coupon at
`source.coupon`, unexpanded to a bare id.

**The master switch ships OFF and the percentages are defaults, not
decisions.** 5 / 10 / 15% at 12 / 24 / 36 months, every one a green knob at
`/admin/loyalty`. Nothing is offered, rendered or applied until a person turns
it on.

### Phases 2 and 3 — shipped 26 Aug, and what phase 2 turned out to require

**Phase 2 was not buildable as written.** The spec says "a معتمد's low-risk
edits publish without the queue". Two things found by reading the code first:

1. **There was no contributor edit path at all.** A stranger could report a
   listing as `wrong_info` in prose; an admin read it and retyped the value.
   `business_edit` had a rule in `standing_rules` and no emitter anywhere.
2. **For the owner, hours already publish instantly** —
   `lib/moderation/change-review.ts` treats them as operational. So
   "auto-publish hours" granted a معتمد nothing that did not already exist.

The unlock is therefore real **only for non-owners**, and phase 2 had to build
the thing it acts on: `business_corrections` (migration `20260830460000`) plus
a dialog on the profile that asks for the correct **value** rather than a
complaint — which is also what makes the contribution checkable, and
checkable is the entire basis of the ledger.

`LOW_RISK_FIELDS` was also wrong: it said `"hours"`, the column is
`working_hours`, so the string it shipped with could never have matched
anything. It now sits beside `CORRECTABLE_FIELDS` — a wider allow-list of what
may be *proposed* (contact fields included, since a human still looks) while
only the low-risk two publish unreviewed.

`/admin/corrections` leads with the audit phase 2 owes: every correction the
ladder published without a human. Handing publication rights to an algorithm's
verdict about a person is only safe if what it let through stays readable
afterwards.

**Phase 3** put `badgesFor()` in core as a pure function over the ledger — no
badge table, because a stored badge is a second copy of the truth that can
disagree with it, and badges unlock nothing. `/profile/standing` shows level,
badges and the ledger **including reversals**, and 404s unless both switches
are on.

**Two emitters that had rules and no code** were also wired: `report_upheld`
(settled when an admin resolves a report; a *rejected* report is deliberately
**not** reversed — a wrong guess is not a betrayal, and punishing guesses is
how a directory stops being told about its own bad data) and `business_submit`
(settled at publication, not submission, because most listings here were
imported under the `imports@` system profile).

**All six seeded kinds now have emitters.**

---

## What this design deliberately does not include

- Streaks of any kind.
- A spendable currency, a rewards shop, or a balance.
- Referrals.
- A leaderboard.
- Any purchase-derived axis — we have no user↔business transactions.
- Metal-named tiers.
- Any surface where standing or tenure alters how credible a business looks to
  a visitor.
