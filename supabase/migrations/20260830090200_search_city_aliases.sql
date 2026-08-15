-- Search v1.2: Persian names for cities so «املاک ریچموند» finds Richmond
-- Hill and «دندانپزشک تورنتو» finds Toronto. Small alias table, joined into
-- the search blob. Add rows as new cities appear.
create table if not exists public.city_aliases (
  city_en text primary key,
  aliases text not null  -- space-separated Persian/alt spellings
);
insert into public.city_aliases (city_en, aliases) values
  ('Toronto',        'تورنتو تورونتو'),
  ('North York',     'نورث یورک نورث‌یورک نورت یورک'),
  ('Richmond Hill',  'ریچموند هیل ریچموندهیل ریچموند'),
  ('Vaughan',        'وان واگان ووگان'),
  ('Thornhill',      'تورنهیل ثورنهیل تورن هیل'),
  ('Markham',        'مارکهام مارکام'),
  ('Newmarket',      'نیومارکت نیو مارکت'),
  ('Aurora',         'آرورا اورورا'),
  ('Scarborough',    'اسکاربرو اسکاربورو'),
  ('Etobicoke',      'اتوبیکو اتوبیکوک'),
  ('Mississauga',    'میسیساگا می‌سی‌ساگا'),
  ('Brampton',       'برمپتون'),
  ('Oakville',       'اوکویل اکویل'),
  ('Burlington',     'برلینگتون'),
  ('Hamilton',       'همیلتون هامیلتون'),
  ('Ottawa',         'اتاوا اوتاوا'),
  ('Montreal',       'مونترال مونتریال'),
  ('Vancouver',      'ونکوور ونکور'),
  ('North Vancouver','نورث ونکوور'),
  ('Burnaby',        'برنابی'),
  ('Coquitlam',      'کوکیتلام'),
  ('Surrey',         'سوری ساری'),
  ('Calgary',        'کلگری کالگری'),
  ('Edmonton',       'ادمونتون ادمنتون'),
  ('Kitchener',      'کیچنر'),
  ('Waterloo',       'واترلو'),
  ('London',         'لندن'),
  ('Windsor',        'ویندزور'),
  ('Halifax',        'هالیفکس'),
  ('Winnipeg',       'وینیپگ')
on conflict (city_en) do update set aliases = excluded.aliases;
alter table public.city_aliases enable row level security;
drop policy if exists "city aliases are public" on public.city_aliases;
create policy "city aliases are public" on public.city_aliases for select to anon, authenticated using (true);

create or replace function public.business_search_text(b public.businesses)
returns text
language sql
stable
as $$
  select public.fa_normalize(
    concat_ws(' ',
      b.name, b.name_en, b.tagline, b.short_description, b.sub_category,
      b.city, b.province, b.address,
      (select a.aliases from public.city_aliases a where lower(a.city_en) = lower(coalesce(b.city,''))),
      (select c.name || ' ' || c.slug from public.categories c where c.slug = b.category),
      (select string_agg(coalesce(s->>'name','') || ' ' || coalesce(s->>'description',''), ' ')
         from jsonb_array_elements(case when jsonb_typeof(b.services) = 'array' then b.services else '[]'::jsonb end) s)
    )
  );
$$;
update public.businesses b set search_text = public.business_search_text(b);
