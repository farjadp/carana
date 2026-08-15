-- Full ISIRI 9147 Persian ↔ QWERTY map (previous version mis-mapped m and
-- lacked ک گ ج چ پ و). translate() maps by position; both strings 31 chars.
create or replace function public.keyboard_swap(t text)
returns text
language sql
immutable
as $$
  select translate(lower(coalesce(t,'')),
    'qwertyuiop[]asdfghjkl;''zxcvbnm,' || 'ضصثقفغعهخحجچشسیبلاتنمکگظطزرذدپو',
    'ضصثقفغعهخحجچشسیبلاتنمکگظطزرذدپو' || 'qwertyuiop[]asdfghjkl;''zxcvbnm,');
$$;
