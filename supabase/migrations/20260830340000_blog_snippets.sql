-- ============================================================================
-- Migration: blog snippets — the short daily card for the Telegram channel
-- Date: 2026-08-26
--
-- Sharing an article is one kind of post. A channel that only ever says
-- "new article: <title>, <link>" is a feed, not a channel — there is no
-- reason to be subscribed to it rather than to the blog.
--
-- A snippet is the other kind: one genuinely interesting thing lifted out of
-- an article we already published, written to stand on its own. A number
-- worth raising an eyebrow at, a practical rule, a common mistake, a
-- comparison. It reads as a post in its own right and the article link sits
-- underneath for whoever wants more.
--
-- Two constraints are enforced here rather than trusted to the writer:
--
--   · `unique (post_id, kind)` — an article may give us a statistic AND a
--     practical tip, but it may not give us the same angle twice. This is what
--     stops the channel slowly turning into the same five posts rephrased.
--   · `source_post_id` is not nullable and the send path refuses a snippet
--     whose post is no longer published. A card is a claim about an article;
--     if the article is gone the claim has nothing behind it.
--
-- Snippets are stored even when they are rejected, with the reason, because
-- "the writer keeps inventing numbers about this post" is something an admin
-- should be able to see rather than infer from silence.
-- ============================================================================

create table if not exists public.blog_snippets (
  id             uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.blog_posts (id) on delete cascade,
  kind           text not null check (kind in ('stat', 'fun_fact', 'tip', 'comparison', 'mistake', 'question', 'news')),
  hook           text not null,                 -- the first line, the thing that stops a thumb
  body           text not null,                 -- 2–4 sentences, Persian
  tags           text[] not null default '{}',
  status         text not null default 'ready' check (status in ('ready', 'sent', 'failed', 'skipped', 'archived')),
  channel        text not null default 'telegram' check (channel in ('telegram', 'linkedin')),
  external_id    text,
  url            text,
  error          text,
  ai_model       text,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz,
  unique (source_post_id, kind)
);

create index if not exists blog_snippets_queue_idx  on public.blog_snippets (status, created_at);
create index if not exists blog_snippets_source_idx on public.blog_snippets (source_post_id);

alter table public.blog_snippets enable row level security;

drop policy if exists "blog snippets admin" on public.blog_snippets;
create policy "blog snippets admin" on public.blog_snippets
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

comment on table public.blog_snippets is
  'Short standalone cards for the Telegram channel, each lifted from one
   published article. One angle per article per kind. Every number in a
   snippet must already appear in its source post — enforced in
   lib/blog/snippets.ts, not here.';
