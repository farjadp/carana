-- ============================================================================
-- Migration: channels — a real ownership claim, and a baseline for renames
-- Date: 2026-08-26
-- Design: docs/15-channels-directory.md
--
-- Two columns' worth of work, both from the same afternoon's live use.
--
-- 1. OWNERSHIP WAS UNREPRESENTABLE, WHICH IS NOT THE SAME AS UNKNOWN.
--    The design deferred all ownership proof to the phase-2 bot, so the page
--    said «مالکیت تأیید نشده» on every entry — including GOPLAZA's own channel,
--    submitted by a GOPLAZA admin who does administer it. That is the honesty
--    rule pointed the wrong way: refusing to record a fact we have is as wrong
--    as printing one we do not.
--
--    What we have today is a human attestation, and it is exactly what
--    `businesses` already calls verification: a named person, at a recorded
--    time, by a recorded method. So this mirrors that shape rather than
--    inventing a second vocabulary — owner_verified_at / _until / _method /
--    _by, with _method naming HOW, because "verified" without a method is the
--    kind of badge this project has had to remove before.
--
--    Two methods, and the second one does not exist yet:
--      'admin' — a GOPLAZA admin confirmed it. Available now.
--      'bot'   — our bot is an administrator of the channel. Phase 2.
--    The column accepts both so phase 2 is an INSERT of behaviour, not a
--    migration. Nothing may render 'bot' until something writes it.
--
--    IT EXPIRES. 182 days, the same window `verified_until` uses on listings,
--    computed against now() at read time — no cron. An attestation is a
--    statement about a moment; a channel changes hands, and a badge that
--    cannot go stale is a badge that eventually lies. Expiry is not a status
--    here either.
--
-- 2. THE RENAME CHECK HAD NO BASELINE. It compared Telegram's title against
--    `channels.title` — what a SUBMITTER typed — and on its first real run
--    pushed a healthy live channel off the public list because a Persian
--    directory had given it a Persian name. `tg_title` holds the title WE last
--    read, so the check compares a reading against a reading. See
--    docs/06-gotchas.md.
--
-- Env / Identity: no secrets. Ownership is written only by the admin server
--      action (service role, after requireAdmin) or the metrics cron.
-- ============================================================================

alter table public.channels
  -- The title as Telegram reports it. Written by the metrics cron on every
  -- successful read; null until the first one. Never shown to the public —
  -- the directory displays the title a human chose.
  add column if not exists tg_title text,

  -- Who is claimed to administer the channel. Nullable, and null is the
  -- ordinary case: most entries are submitted by people who simply know the
  -- channel exists.
  add column if not exists owner_user_id uuid references auth.users (id) on delete set null,

  add column if not exists owner_verified_at timestamptz,
  add column if not exists owner_verified_until timestamptz,
  add column if not exists owner_verified_method text
    check (owner_verified_method is null or owner_verified_method in ('admin','bot')),
  add column if not exists owner_verified_by uuid references auth.users (id) on delete set null;

-- A verification is a person, a time, a method and a subject. Any one of them
-- missing makes the other three unreadable, so the row may not carry a partial
-- claim at all.
alter table public.channels
  drop constraint if exists channels_ownership_is_whole,
  add constraint channels_ownership_is_whole check (
    (owner_verified_at is null
      and owner_verified_until is null
      and owner_verified_method is null
      and owner_verified_by is null)
    or (owner_verified_at is not null
      and owner_verified_until is not null
      and owner_verified_method is not null
      and owner_user_id is not null)
  );

create index if not exists channels_owner_idx
  on public.channels (owner_user_id) where owner_user_id is not null;

comment on column public.channels.tg_title is
  'The title as Telegram reports it, from the last successful read. The
   baseline the rename check compares against — never a display value, and
   never compared against the human-chosen `title`.';
comment on column public.channels.owner_verified_method is
  'HOW ownership was established. admin = a GOPLAZA admin confirmed it.
   bot = our bot is an administrator of the channel (phase 2, nothing writes
   this yet). "Verified" without a method is the badge this project has had to
   remove before.';
comment on column public.channels.owner_verified_until is
  'An attestation is a statement about a moment. 182 days, judged against now()
   at read time — no cron, and expiry is not a status.';
