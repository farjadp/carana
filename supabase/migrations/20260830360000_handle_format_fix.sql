-- ============================================================================
-- Migration: fix two handle-format holes found by running 330000, not reading it
-- Date: 2026-08-25
--
-- 20260830330000 shipped a format rule that the TypeScript side and the
-- database did not actually agree on. A checker in @goplaza/core asserted the
-- two regexes were byte-identical — and they were. Both were wrong in the same
-- two ways, which is exactly what an equality assertion cannot catch. Calling
-- `handle_available()` against the real database found it in one minute:
--
--   handle_available('ab')          → true   -- should be false
--   handle_available('Kabab-Sara')  → true   -- should be false
--
-- HOLE 1 — NO MINIMUM LENGTH.
--   `^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$` matches a single character: the
--   whole tail is optional. The 3-character minimum lived only in
--   validateHandle() in TypeScript, so the database would happily have taken
--   `a`. Two-letter handles are exactly what a squatter wants first.
--   The replacement expresses the minimum in the pattern itself —
--   1 + {1,28} + 1 gives 3 to 30 characters, and nothing has to remember it.
--
-- HOLE 2 — citext MADE THE REGEX CASE-INSENSITIVE.
--   `handle` is citext, chosen so that lookups cannot be accidentally
--   case-sensitive. But the regex operator inherits that too, so a pattern
--   spelling out `[a-z0-9]` silently accepted `Kabab-Sara` and would have
--   STORED it with the capitals. The app lowercases before writing, so this
--   would only bite whenever something wrote without going through it — an
--   import, a fix-up script, the SQL editor. Casting to text restores the
--   case sensitivity the pattern was written to express, while leaving
--   uniqueness and lookups case-insensitive, which is what citext was for.
--
-- Safe: `link_pages` has 0 rows — it was created minutes ago.
-- ============================================================================

alter table public.link_pages
  drop constraint if exists link_pages_handle_format;

alter table public.link_pages
  add constraint link_pages_handle_format
  check (handle::text ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');

create or replace function public.handle_available(p_handle citext)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_handle::text ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$'
    and not exists (select 1 from public.link_pages      where handle = p_handle)
    and not exists (select 1 from public.reserved_handles where handle = p_handle)
    and not exists (select 1 from public.link_handle_history
                    where handle = p_handle and released_at > now() - interval '90 days');
$$;

comment on function public.handle_available(citext) is
  'The only correct way to ask whether a handle can be claimed. The format
   test casts to text on purpose: `handle` is citext so that uniqueness and
   lookup are case-insensitive, but the pattern is meant to reject capitals,
   and on citext it would not. Callers must fold Persian digits with
   toLatinDigits BEFORE calling — the app forces RTL and an ASCII-digit field
   has silently broken sign-in and verification here before.';
