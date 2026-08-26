# Standing — phase 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the settled contribution ledger, its tuning rules, and the admin
page that owns them — with **no public UI whatsoever**.

**Architecture:** An append-only `standing_events` ledger is the only truth.
`standing_rules` is a per-kind tuning table the admin page edits. `user_standing`
is a cache of aggregates that SQL recomputes and never interprets — **SQL counts,
TypeScript judges**: the level itself is a pure function in `@goplaza/core`
computed at read time, so web and mobile cannot disagree and maintenance decay
needs no scheduled writer.

**Tech Stack:** Next.js App Router (`apps/web`), Supabase/Postgres, TypeScript,
`@goplaza/core` for anything shared with mobile, Tailwind.

**Spec:** `docs/16-standing-and-loyalty.md` — read it first. The plan argues from
the spec and does not restate its reasoning.

---

## Global constraints

Copied verbatim from the spec and from the house rules. Every task inherits these.

- **Nothing in phase 1 is visible to a visitor.** `standing.public_display`
  defaults to `false` and no phase-1 task may render standing outside `/admin`.
- **Nothing in phase 1 may read from `user_standing` on a public business page.**
  The wall in the spec is a code rule, not a guideline.
- **Points are frozen at settlement.** `standing_events.points` is copied from
  `standing_rules` at settle time along with `rule_version`, and is never
  rewritten afterwards by any code path in this plan.
- **The level is never stored.** No `level` column, no cached level in a session,
  no level computed in SQL. `levelFor()` in `@goplaza/core` is the only answer.
- **Only a verified account settles.** Unverified users' events are recorded as
  `pending` and stay there.
- Persian UI strings only; the app forces RTL. Any numeric input the admin page
  accepts must fold Persian digits with `toLatinDigits` before parsing —
  this has broken sign-in and verification already (`docs/06-gotchas.md`).
- Brand strings come from `packages/core/src/brand.ts`. `pnpm check:brand` must pass.
- Shared logic goes in `@goplaza/core`, never hand-copied into `apps/web` —
  see the `plans.ts` v3 note and `docs/06-gotchas.md`.

### Verification standard — read this before Task 1

**This repository has no test runner.** There is no `test` script in
`package.json`, no `*.test.ts` anywhere, and no harness to add one to inside
this plan's scope. Writing "run pytest" steps here would be fiction.

So the gate at the end of every task is, in this order:

1. `pnpm typecheck` — clean.
2. `pnpm lint` — clean.
3. `pnpm check:brand` — clean.
4. **Run it.** On this project, running it finds what reading and typechecking
   miss; four separate cases are recorded in the session log. A task is not
   done because it compiles.
5. Commit.

Where a task's deliverable is pure logic (Task 2), step 4 is a throwaway
`node --experimental-strip-types` scratch script under the scratchpad that
exercises the boundaries and prints the answers, **not** a committed test file.
Delete it after reading the output.

### The migration gotcha

`pnpm db:push` is blocked on this project by the CLI password prompt. Migrations
are applied by pasting into the Supabase **SQL Editor**, which is why the admin
settings page probes whether its own tables exist rather than assuming. Every
migration task here ends with "paste and run it, then confirm with a probe" —
never with "it should be applied by now".

---

## File structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260830420000_standing.sql` | The three tables, indexes, RLS, `recompute_standing`, seeded rules, seeded settings row |
| `packages/core/src/standing.ts` | **Pure.** Types, default thresholds, `levelFor()`, `privilegesFor()`, Persian labels, `LOW_RISK_FIELDS` |
| `packages/core/src/index.ts` | Re-export |
| `apps/web/lib/standing/ledger.ts` | Server-side writes: record, settle, reverse, recompute. All the guards. |
| `apps/web/lib/standing/rules.ts` | Read/write `standing_rules` + the `standing` settings key |
| `apps/web/lib/settings.ts` | Add `SETTING_KEYS.standing` |
| `apps/web/app/admin/(dashboard)/standing/page.tsx` | The admin page — server component, probes and counts |
| `apps/web/app/admin/(dashboard)/standing/rules-editor.tsx` | Green knobs (client) |
| `apps/web/app/admin/(dashboard)/standing/user-actions.tsx` | Amber actions (client) |
| `apps/web/app/api/admin/standing/route.ts` | Green writes |
| `apps/web/app/api/admin/standing/actions/route.ts` | Amber writes — reason required, logged |
| `apps/web/app/api/cron/standing-recompute/route.ts` | Nightly aggregate refresh |
| `apps/web/app/admin/(dashboard)/sidebar-nav.tsx` | One nav entry |

Emitters are edits to files that already exist; they get no new files.

---

## Tasks

### Task 1: Migration — the three tables

**Files:**
- Create: `supabase/migrations/20260830420000_standing.sql`

**Interfaces:**
- Produces: tables `standing_events`, `standing_rules`, `user_standing`;
  function `public.recompute_standing(p_user uuid) returns void`;
  six seeded rows in `standing_rules`; one seeded `site_settings` row, key
  `standing`, value `{"enabled": false, "public_display": false}`.

- [ ] **Step 1: Write the migration header**

Follow the house format used by every file in `supabase/migrations` — a banner
comment naming the migration, the date, and *why*, including the two decisions a
future reader will otherwise re-litigate: why points are frozen, and why there is
no `level` column.

- [ ] **Step 2: `standing_events`**

Exactly as in the spec's data model. Note three things the DDL must carry:

- the unique constraint `(kind, subject_type, subject_id, user_id)` — idempotency
  is enforced by the database, not by remembering to check first;
- `kind` is plain `text` with **no** check constraint, validated against
  `standing_rules.kind` by the write path. A check constraint would make adding a
  kind a migration, which the spec explicitly rules out;
- indexes `(user_id, state)`, `(state, created_at desc)`, `(subject_type, subject_id)`.

- [ ] **Step 3: `standing_rules` and `user_standing`**

Per the spec. `user_standing` has **no `level` column** — if you find yourself
adding one, re-read the spec's note in the DDL block.

- [ ] **Step 4: RLS**

- `standing_events`: no write policy at all (service role only, like
  `suggestions`). Admin read via `public.is_admin(auth.uid())`. **Self read** via
  `auth.uid() = user_id` — a user must be able to see their own reversals, which
  is the honest answer to "why did my number drop".
- `standing_rules`, `user_standing`: RLS enabled, admin read, no client write.
  Settings gate behaviour, and a client-writable rules table is a self-service
  discount — the same reasoning as `site_settings`.

- [ ] **Step 5: `recompute_standing(p_user uuid)`**

Writes **only** the aggregate columns of `user_standing`, upserting the row:
`xp` (sum of `points` where `state='confirmed'`), `confirmed_count`,
`reversed_count`, `distinct_kinds` (count distinct `kind` where confirmed),
`accuracy` (confirmed / nullif(confirmed + reversed, 0), over the trailing 365
days), `last_confirmed_at`, `recomputed_at`.

It must **not** compute a level, read thresholds, or touch `peak_level`,
`level_grant` or `frozen`. `security definer` with a pinned `search_path`.

- [ ] **Step 6: Seed the six rules**

`channel_submit`, `business_submit`, `business_edit`, `review_publish`,
`report_upheld`, `channel_reconfirm` — Persian labels, the subject types from
the spec's table, `version = 1`. Starting point values are **guesses** and the
migration comment should say so. `on conflict (kind) do nothing`, so re-running
the migration never resets tuning Farjad has already done.

- [ ] **Step 7: Seed the settings row**

`insert into site_settings (key, value) values ('standing', '{"enabled": false,
"public_display": false}') on conflict (key) do nothing`.

**Off by default.** The switch is flipped from the admin page after the page
exists, not by the migration.

- [ ] **Step 8: Apply it**

Paste into the Supabase SQL Editor and run. Then confirm from the CLI with a
service-role query that all three tables answer and that `standing_rules` has
six rows. **"The migration file exists" is not "the migration ran"** — this has
already caught this project out once.

- [ ] **Step 9: Regenerate types**

`pnpm gen:types`. Confirm the three tables appear in
`packages/core/src/database.types.ts`.

- [ ] **Step 10: Commit**

---

### Task 2: `@goplaza/core/standing.ts` — the pure half

**Files:**
- Create: `packages/core/src/standing.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: nothing. Pure, no IO, safe on server, client and Expo.
- Produces:
  ```ts
  export type StandingLevel = 0 | 1 | 2 | 3;
  export interface StandingAggregates {
    xp: number; confirmed_count: number; reversed_count: number;
    distinct_kinds: number; accuracy: number | null;
    last_confirmed_at: string | null;
    peak_level: number; level_grant: number | null; frozen: boolean;
  }
  export interface StandingThresholds { /* per level: xp, confirmed, accuracy, kinds */ }
  export const DEFAULT_THRESHOLDS: StandingThresholds;
  export const MAINTENANCE_WINDOW_DAYS: number;   // 180
  export const LEVEL_LABELS_FA: Record<StandingLevel, string>;
  export function levelFor(a: StandingAggregates, t?: StandingThresholds, now?: Date): StandingLevel;
  export function privilegesFor(level: StandingLevel): StandingPrivileges;
  export const LOW_RISK_FIELDS: readonly string[];
  ```

- [ ] **Step 1: Write the file header**

The house banner: Source / Version / Why / Env-Identity. The *why* must state
that this is the single definition of the ladder for web and mobile, and cite
the `plans.ts` v3 precedent.

- [ ] **Step 2: Thresholds and labels**

`DEFAULT_THRESHOLDS` with the spec's starting numbers (level 1: xp 100,
confirmed 5, accuracy 0.80, kinds 1 · level 2: xp 500, confirmed 25, accuracy
0.90, kinds 3). A comment must say these are **guesses to be tuned against real
data**, and that they are overridable from `site_settings` — otherwise a future
reader will treat them as researched.

Labels: `تازه‌وارد` / `مشارکت‌کننده` / `معتمد` / `نگهبان`.

- [ ] **Step 3: `levelFor()`**

Order of evaluation matters and is the whole correctness of this function:

1. `frozen` → 0.
2. `level_grant != null` → return it. This is how نگهبان exists; it bypasses
   every threshold **and** the maintenance window, because it is a role, not an
   earned rank.
3. `last_confirmed_at` older than `MAINTENANCE_WINDOW_DAYS` → 0. Absence.
4. `accuracy` below the candidate level's floor → the highest level whose floor
   it does meet. Being wrong demotes immediately, without waiting for the window.
5. Otherwise the highest level whose xp / confirmed / accuracy / kinds are **all**
   met.

`now` is a parameter with a default so the boundaries are testable without
mocking the clock.

- [ ] **Step 4: `privilegesFor()` and `LOW_RISK_FIELDS`**

`privilegesFor` returns `{ queuePriority, showsContributions, autoPublishLowRisk,
canSeeQueue }`. In phase 1 **every consumer of `autoPublishLowRisk` and
`canSeeQueue` is absent** — they are declared here so phase 2 has a name to
implement against, and the file must say that in a comment rather than leaving a
reader to think a feature is live.

`LOW_RISK_FIELDS` likewise: declared, listing the fields the spec allows
(hours, phone, temporary-closure status), and **unused in phase 1**. Cross-
reference `business_change_reviews.critical_fields`, which already encodes the
opposite judgement, so the two lists get reviewed together.

- [ ] **Step 5: Export from `index.ts`**

- [ ] **Step 6: Exercise the boundaries**

A throwaway script in the scratchpad, not a committed file. Print `levelFor()`
for: frozen user; granted نگهبان whose last contribution was two years ago
(must stay 3); a user one point under a threshold; a user at exactly the
threshold; a user one day inside the maintenance window and one day outside;
a user with high xp and accuracy 0.5; a user with 200 confirmed events of one
kind (must not reach 2 — this is the variety gate and it is the one most likely
to be written wrong). Read the output, then delete the script.

- [ ] **Step 7: `pnpm typecheck`, `pnpm lint`, `pnpm check:brand`, commit**

---

### Task 3: The ledger write path

**Files:**
- Create: `apps/web/lib/standing/ledger.ts`, `apps/web/lib/standing/rules.ts`
- Modify: `apps/web/lib/settings.ts` (add `SETTING_KEYS.standing`)

**Interfaces:**
- Consumes: `levelFor`, `DEFAULT_THRESHOLDS` from `@goplaza/core`;
  `createSupabaseAdminClient`; `getSetting`/`setSetting`.
- Produces:
  ```ts
  recordEvent(input: { userId, kind, subjectType, subjectId, meta? }): Promise<{ ok, skipped? }>
  settleSubject(kind, subjectType, subjectId, by?: string, reason?: string): Promise<...>
  reverseSubject(subjectType, subjectId, by: string, reason: string): Promise<...>
  recomputeUser(userId: string): Promise<void>
  getStanding(userId: string): Promise<{ aggregates, level } | null>
  ```

- [ ] **Step 1: `rules.ts`**

`getRules()` (all rows, cached per request), `getRule(kind)`, `setRule(kind, patch)`
— and `setRule` **bumps `version` whenever `points` changed**, never otherwise.
Plus `getStandingSettings()` reading key `standing` with a hard-coded safe
default, following the fail-soft contract already documented at the top of
`lib/settings.ts`: a missing table, a missing key and a network blip must all
behave like "no override set".

- [ ] **Step 2: `recordEvent()`**

Inserts a `pending` row. Idempotent by the unique constraint — a duplicate is a
success, not an error, and callers must never have to check first.

`recordEvent` does **not** consult the master switch. With the program disabled
we still record, so that turning it on later loses nothing. Getting this
backwards is the difference between a switch and a shredder.

- [ ] **Step 3: The settle guards**

`settleSubject` moves `pending → confirmed` only if **all** hold. Each rejection
must return a named reason, because a silent no-op here is undebuggable:

1. master switch enabled;
2. the rule exists and is `enabled`;
3. the user's account is verified (email or phone);
4. `frozen` is false;
5. not self-dealing — the user does not own, claim, or hold a
   `business_memberships` row for the subject, and is not the subject's own
   submitter where the spec says so (`channel_reconfirm`);
6. the user is under `daily_cap` for that kind today.

A blocked event **stays `pending`**. It is never deleted and never marked
`void`, so it can settle later when the blocker clears — a user verifying their
phone next month should collect their backlog.

- [ ] **Step 4: Freezing the points**

On settle, copy `points` and `version` from the rule into the event row, set
`settled_at`, `settled_by`, `state = 'confirmed'`. Nothing in this module ever
updates `points` on an already-settled row. Add the comment saying so, next to
the write.

- [ ] **Step 5: `reverseSubject()`**

Sets every `confirmed` event for that subject to `reversed`, with a **required**
reason. `points` stays frozen at its old value — `xp` falls because
`recompute_standing` only sums confirmed rows, not because history was edited.
Then update `peak_level` is **not** done here; peak only ever rises, in Step 6.

- [ ] **Step 6: `recomputeUser()` and `getStanding()`**

`recomputeUser` calls the SQL function, re-reads the row, computes the level with
`levelFor()` and the thresholds from settings, and raises `peak_level` if the
new level is higher. It never lowers `peak_level`.

`getStanding` returns the aggregates plus the computed level. Every read of a
user's level in the app goes through this, so there is one call path.

- [ ] **Step 7: Run it**

No UI exists yet, so drive it from a scratchpad script against the dev database
with a test user (the pattern the session log records as the one that worked):
record an event, confirm it is `pending`; settle it, confirm `xp` moved; reverse
it, confirm `xp` fell and the row still holds its original `points`; settle the
same subject twice and confirm the second is a no-op; settle for an unverified
user and confirm it stays `pending` with a named reason.

- [ ] **Step 8: Typecheck, lint, commit**

---

### Task 4: Emitter — channels

**Files:**
- Modify: `apps/web/app/channels/submit/*` (record on submit)
- Modify: `apps/web/app/admin/(dashboard)/channels/*` (settle on approve, reverse on reject/suspend)

**Interfaces:**
- Consumes: `recordEvent`, `settleSubject`, `reverseSubject` from Task 3.

- [ ] **Step 1: Record on submit**

After a channel row is created, `recordEvent({ kind: 'channel_submit',
subjectType: 'channel', subjectId: channel.id, userId })`. Fire-and-forget with
its own try/catch: **a ledger failure must never fail the submission.** The
contribution is the product; the points are bookkeeping.

- [ ] **Step 2: Settle on approve, reverse on reject or suspend**

In the admin approve path, `settleSubject('channel_submit', 'channel', id, adminId)`.
In reject and suspend, `reverseSubject('channel', id, adminId, reason)`.

Note the asymmetry with the cron: the metrics cron can push a renamed channel
back to `pending_moderation`, and that is **not** a reversal — the submitter did
nothing wrong. Only an explicit rejection reverses. Add the comment where a
future reader will otherwise "fix" it.

- [ ] **Step 3: Run it**

The channels table is empty, so this needs a seeded row first — which
`docs/05-open-tasks.md` lists as the outstanding job anyway. Submit one channel
as a test user, approve it in the admin queue, and read the ledger: one row,
`confirmed`, with frozen points. Then suspend it and confirm the reversal.

- [ ] **Step 4: Typecheck, lint, commit**

---

### Task 5: Emitter — reviews

**Files:**
- Modify: the review submit path (record on submit)
- Modify: `apps/web/app/admin/(dashboard)/reviews/*` (settle on publish, reverse on unpublish)

Same shape as Task 4, with `kind: 'review_publish'`, `subjectType: 'review'`,
keyed on `public_reviews.id` and its `status` transitions.

- [ ] **Step 1: Record on submit, settle on publish, reverse on unpublish**
- [ ] **Step 2: Confirm the self-dealing guard actually fires** — a review written
  by the owner of the business it is about must record and never settle. Check
  the returned reason, not just the absence of points.
- [ ] **Step 3: Run it, typecheck, lint, commit**

---

### Task 6: Admin page — the green knobs

**Files:**
- Create: `apps/web/app/admin/(dashboard)/standing/page.tsx`, `rules-editor.tsx`
- Create: `apps/web/app/api/admin/standing/route.ts`
- Modify: `apps/web/app/admin/(dashboard)/sidebar-nav.tsx`

**Interfaces:**
- Consumes: `getRules`, `setRule`, `getStandingSettings` from Task 3.

- [ ] **Step 1: Server page with probes, not assumptions**

Copy the habit of `settings/page.tsx`: probe whether `standing_events`,
`standing_rules` and `user_standing` actually answer, and render a red/green
row per probe. Migrations here are applied by hand, so "did it run?" is a real
question that belongs on screen.

Live counts beside them: pending events, settled today, 30-day reversal rate,
users per level.

- [ ] **Step 2: The knobs**

Master switch · public display · per-kind points / daily cap / enabled · the
level thresholds · the maintenance window.

- [ ] **Step 3: The sentence that has to be on the page**

Next to the points fields, in Persian: changing a number affects only future
settlements; events already settled keep the points and the rule version they
were settled with. The natural fear when editing a live economy is "did I just
rewrite everyone's history", and the page should answer it before it is asked.

- [ ] **Step 4: Persian digits**

Every numeric field folds with `toLatinDigits` before parsing. Non-negotiable —
this class of bug has shipped twice on this project.

- [ ] **Step 5: `requireAdmin` on the route**

The layout gates the section; the API route re-checks anyway, as every other
admin route here does.

- [ ] **Step 6: Run it**

Open the page. Flip a points value, reload, confirm it persisted and `version`
bumped. Flip it back. Confirm an already-settled event's `points` did not move.
Screenshot for the session log.

- [ ] **Step 7: Typecheck, lint, brand, commit**

---

### Task 7: Admin page — the amber actions

**Files:**
- Create: `apps/web/app/admin/(dashboard)/standing/user-actions.tsx`
- Create: `apps/web/app/api/admin/standing/actions/route.ts`

- [ ] **Step 1: The four actions**

Manually settle or reverse one event · grant or revoke نگهبان (`level_grant`) ·
freeze or unfreeze a user · force a recompute.

- [ ] **Step 2: Reason required, enforced server-side**

An empty reason is **refused by the API**, not merely discouraged by the form.
A client-side-only requirement is not a requirement.

- [ ] **Step 3: Log every one**

`settled_by` / `admin_note` on the row, plus a `user_activity_logs` entry. These
are the actions that will be asked about later.

- [ ] **Step 4: Run each of the four**, confirm the log rows, confirm an empty
  reason is rejected by hitting the route directly, not just through the form.

- [ ] **Step 5: Typecheck, lint, commit**

---

### Task 8: Nightly recompute cron, and close out the phase

**Files:**
- Create: `apps/web/app/api/cron/standing-recompute/route.ts`
- Modify: `apps/web/vercel.json`
- Modify: `docs/00-START-HERE.md`, `docs/05-open-tasks.md`, `docs/07-session-log.md`

- [ ] **Step 1: The route**

`CRON_SECRET`-gated, like the existing crons. Recomputes aggregates for users
with ledger activity since the last run, and raises `peak_level`.

It does **not** apply decay — there is nothing to apply. `levelFor()` reads
`last_confirmed_at` at read time, so a level lapses on its own. If you find
yourself writing decay logic here, the level has leaked into storage somewhere;
stop and find it.

- [ ] **Step 2: Schedule it** in `vercel.json`, at an hour that does not collide
  with the 06:40 UTC channel-metrics run or the blog writers at 11:00/12:00.

- [ ] **Step 3: Call it once by hand as an admin** and read what it wrote.

- [ ] **Step 4: Update the three doc layers**

`00-START-HERE` status table, `05-open-tasks` (what phase 1 proved and what it
did not), and a `07-session-log` entry — **including anything that was claimed
wrongly along the way**, which is the house rule and the reason the log is
worth reading.

- [ ] **Step 5: Commit and push**

---

## What phase 1 does not deliver, and must not claim to

Say this plainly in `05-open-tasks` at the end, because the temptation to round
it up will be real:

- No user sees anything. There is no profile page, no number, no badge.
- Level 2's auto-publish is **declared, not implemented** — `autoPublishLowRisk`
  has no consumer.
- Nothing is tuned. The thresholds are guesses that have never met real data.
- Owner loyalty is untouched.
