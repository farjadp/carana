-- ============================================================================
-- Migration: Count profile views
-- Date: 2026-08-27
--
-- The home page has carried a "most visited businesses" section since launch,
-- ordered by `view_count`. That column exists in no migration, so the query
-- errored, the result came back null, and the section silently rendered
-- nothing. Same shape as the verified badge that could never appear.
--
-- Rather than delete the section, give it the number it was always asking for.
-- This is also the first real piece of the first-party analytics the owner
-- dashboard will need.
-- ============================================================================

alter table public.businesses
  add column if not exists view_count integer not null default 0;

create index if not exists idx_businesses_view_count
  on public.businesses (view_count desc)
  where status = 'PUBLISHED';

-- ----------------------------------------------------------------------------
-- Increment through a function, not a table update.
--
-- The alternative is granting anon UPDATE on businesses, which would let any
-- visitor rewrite any column on any listing. A SECURITY DEFINER function with
-- a single hardcoded statement can only ever do this one thing.
--
-- No user id, no IP, no timestamp: a counter, not a visitor log. Anything
-- finer is a privacy liability that this section does not need.
-- ----------------------------------------------------------------------------
create or replace function public.increment_business_view(target_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.businesses
     set view_count = view_count + 1
   where id = target_id
     and status = 'PUBLISHED';
$$;

revoke all on function public.increment_business_view(uuid) from public;
grant execute on function public.increment_business_view(uuid) to anon, authenticated;

comment on function public.increment_business_view is
  'Bumps a published listing''s view counter. The only write anon may perform
   on businesses. Deliberately records nothing about who viewed it.';
