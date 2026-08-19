-- ============================================================================
-- Source: supabase/migrations/20260830270000_rebrand_goplaza.sql
-- Version: 1.0.0 — 2026-08-18
-- Why: čārana → GOPLAZA rebrand. Display data only — the blog category rows
--      and the author default that 20260830120000_blog.sql seeded carry the
--      old name in user-visible text. History stays untouched; this migration
--      corrects the live rows and the default forward.
--      Nothing structural changes. No table, column, function, bucket or
--      identifier is renamed: `imports@charana.ca` remains the system owner
--      of imported listings by decision (REBRAND_PLAN.md D6).
-- Env / Identity: Idempotent; safe to re-run.
-- ============================================================================

update public.blog_categories
   set description = 'آنچه اعداد گوپلازا می‌گویند: چه کسب‌وکارهایی کجا رشد می‌کنند، مردم دنبال چه می‌گردند.'
 where slug = 'data'
   and description like '%چارانا%';

update public.blog_categories
   set name = 'اخبار گوپلازا',
       name_en = 'GOPLAZA updates'
 where slug = 'product'
   and (name like '%چارانا%' or name_en like '%ārana%');

alter table public.blog_posts
  alter column author_name set default 'تیم گوپلازا';

-- Existing posts written under the old house byline get the new one; a post
-- with a named human author is left alone.
update public.blog_posts
   set author_name = 'تیم گوپلازا'
 where author_name = 'تیم چارانا';
