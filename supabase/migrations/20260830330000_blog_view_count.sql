-- ============================================================================
-- Migration: Count blog post views
-- Date: 2026-08-24
--
-- Same shape as `increment_business_view` (20260827090000), deliberately:
-- a plain counter on the row, incremented through a SECURITY DEFINER function
-- so that anon never needs UPDATE on blog_posts. A visitor who could update
-- the table could rewrite the article.
--
-- The function only touches PUBLISHED rows. A post sitting in the review
-- queue is visible to admins, and an admin reading their own draft five times
-- while editing it must not inflate a number the public will later see.
--
-- No user id, no IP, no timestamp: a counter, not a visitor log. Both the app
-- and the website call the same function, so the number on the article page
-- is the total across surfaces rather than one platform's slice — which is
-- the only reading of "بازدید" that is not a lie by omission.
-- ============================================================================

alter table public.blog_posts
  add column if not exists view_count integer not null default 0;

create index if not exists blog_posts_view_count_idx
  on public.blog_posts (view_count desc)
  where status = 'published';

create or replace function public.increment_blog_post_view(target_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.blog_posts
     set view_count = view_count + 1
   where id = target_id
     and status = 'published';
$$;

revoke all on function public.increment_blog_post_view(uuid) from public;
grant execute on function public.increment_blog_post_view(uuid) to anon, authenticated;

comment on function public.increment_blog_post_view is
  'Bumps a published post''s view counter, from the website and the app alike.
   The only write anon may perform on blog_posts. Records nothing about who
   viewed it. Ignores unpublished rows so admin previews never count.';
