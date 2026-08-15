-- ref_no is assigned by the BEFORE INSERT trigger, but without a column
-- default the generated Insert type marks it required and every client insert
-- fails to typecheck. A throwaway default satisfies the type; the trigger
-- still overwrites it with a unique value.
alter table public.businesses alter column ref_no set default 0;

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
  -- 0 is the placeholder default; anything else supplied explicitly is kept.
  if new.ref_no is not null and new.ref_no <> 0 then
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
