-- ============================================================================
-- Source: supabase/migrations/20260829090000_business_ref_no.sql
-- Version: 1.0.0 — 2026-08-15
-- Why: Every business gets a short, unique, human-readable reference number
--      (five digits, 10000–99999) — quoted on the profile, usable in support
--      mail, claims and phone calls where a UUID or a Persian slug is useless.
--      Random, not sequential, so the number reveals nothing about volume or
--      order of registration. Assigned by trigger on insert; backfilled here.
-- ============================================================================

alter table public.businesses
  add column if not exists ref_no integer;

-- Random 5-digit, retry on the (rare) collision. 90,000 values; at 680 rows
-- the collision probability per insert is under 1%, and the loop handles it.
create or replace function public.assign_business_ref_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate integer;
  tries integer := 0;
begin
  if new.ref_no is not null then
    return new;
  end if;
  loop
    candidate := 10000 + floor(random() * 90000)::integer;
    exit when not exists (select 1 from public.businesses where ref_no = candidate);
    tries := tries + 1;
    if tries > 50 then
      raise exception 'could not allocate a unique ref_no after 50 tries';
    end if;
  end loop;
  new.ref_no := candidate;
  return new;
end;
$$;

drop trigger if exists businesses_assign_ref_no on public.businesses;
create trigger businesses_assign_ref_no
  before insert on public.businesses
  for each row execute function public.assign_business_ref_no();

-- Backfill existing rows one at a time so the uniqueness check sees each new value.
do $$
declare
  r record;
  candidate integer;
begin
  for r in select id from public.businesses where ref_no is null order by created_at loop
    loop
      candidate := 10000 + floor(random() * 90000)::integer;
      exit when not exists (select 1 from public.businesses where ref_no = candidate);
    end loop;
    update public.businesses set ref_no = candidate where id = r.id;
  end loop;
end $$;

alter table public.businesses
  alter column ref_no set not null;

create unique index if not exists businesses_ref_no_key on public.businesses (ref_no);

comment on column public.businesses.ref_no is
  'Five-digit public reference number (10000–99999), random, unique. Quote it in support and claims.';
