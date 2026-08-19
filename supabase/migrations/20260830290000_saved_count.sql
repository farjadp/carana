-- ============================================================================
-- Migration: saved_count — how many people saved a listing
-- Date: 2026-08-19
--
-- Why: /businesses gets a "پرمخاطب‌ترین" (most-saved) sort. The signal
--      already exists — user_business_interactions.personal_status = 'saved'
--      — but counting it live with a join/subquery on every listing-page
--      request over ~5,100 businesses is the same mistake the SEO audit just
--      finished removing (unbounded queries, PostgREST's 1,000-row cap).
--      Denormalise it onto businesses, same pattern as view_count
--      (20260827090000): a plain indexed integer, kept correct by a trigger
--      instead of a client UPDATE.
--
-- Maintained by a trigger on user_business_interactions, not written by the
-- client directly — a user has RLS write access to their own interaction
-- row, never to businesses.saved_count. The trigger function runs
-- SECURITY DEFINER so it can bump the counter regardless of the caller's own
-- grants on businesses, and it is intentionally narrow: it can only ever
-- +1/-1 this one column.
-- ============================================================================

alter table public.businesses
  add column if not exists saved_count integer not null default 0;

comment on column public.businesses.saved_count is
  'Count of user_business_interactions rows with personal_status = ''saved''
   for this business. Written only by businesses_saved_count_sync — never by
   the client. Backfilled once below; kept correct by the trigger after that.';

create index if not exists idx_businesses_saved_count
  on public.businesses (saved_count desc)
  where status = 'PUBLISHED';

-- ---------------------------------------------------------------- backfill
update public.businesses b
   set saved_count = coalesce(counted.n, 0)
  from (
    select business_id, count(*) as n
      from public.user_business_interactions
     where personal_status = 'saved'
     group by business_id
  ) counted
 where counted.business_id = b.id;

-- ------------------------------------------------------------------ trigger
create or replace function public.businesses_saved_count_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.personal_status = 'saved' then
      update public.businesses set saved_count = saved_count + 1 where id = new.business_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- personal_status transitioned into or out of 'saved', or the row moved
    -- to a different business (not a real app flow today, handled anyway).
    if old.business_id is distinct from new.business_id then
      if old.personal_status = 'saved' then
        update public.businesses set saved_count = greatest(saved_count - 1, 0) where id = old.business_id;
      end if;
      if new.personal_status = 'saved' then
        update public.businesses set saved_count = saved_count + 1 where id = new.business_id;
      end if;
    elsif old.personal_status is distinct from new.personal_status then
      if new.personal_status = 'saved' and old.personal_status <> 'saved' then
        update public.businesses set saved_count = saved_count + 1 where id = new.business_id;
      elsif old.personal_status = 'saved' and new.personal_status <> 'saved' then
        update public.businesses set saved_count = greatest(saved_count - 1, 0) where id = new.business_id;
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.personal_status = 'saved' then
      update public.businesses set saved_count = greatest(saved_count - 1, 0) where id = old.business_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

revoke all on function public.businesses_saved_count_sync() from public;

drop trigger if exists businesses_saved_count_sync on public.user_business_interactions;
create trigger businesses_saved_count_sync
  after insert or update or delete on public.user_business_interactions
  for each row execute function public.businesses_saved_count_sync();
