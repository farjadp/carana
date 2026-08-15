-- ============================================================================
-- Migration: suggestions — "tell us what you want", text or voice
-- Date: 2026-08-15
--
-- One row per suggestion. Anyone may leave one, signed in or not; the write
-- goes through /api/suggestions with the service role, so there is no anon
-- insert policy here on purpose. Reading is admin-only.
-- ============================================================================

create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  body        text,                       -- typed text, may be null when voice-only
  voice_path  text,                       -- storage path in the `suggestions` bucket
  voice_seconds int,
  contact     text,                       -- optional email/phone the person typed
  source      text not null default 'web' check (source in ('web', 'mobile')),
  page        text,                       -- where the box was on ("/", "/search?q=…", "home")
  status      text not null default 'new' check (status in ('new', 'read', 'done')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  constraint suggestions_has_content check (body is not null or voice_path is not null)
);

create index if not exists suggestions_created_idx on public.suggestions (created_at desc);
create index if not exists suggestions_status_idx  on public.suggestions (status);

alter table public.suggestions enable row level security;

drop policy if exists "suggestions admin read"   on public.suggestions;
drop policy if exists "suggestions admin update" on public.suggestions;

create policy "suggestions admin read"
on public.suggestions for select
using (public.is_admin(auth.uid()));

create policy "suggestions admin update"
on public.suggestions for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Private bucket for the voice notes. Uploads happen server-side; admins read
-- through signed URLs.
insert into storage.buckets (id, name, public)
values ('suggestions', 'suggestions', false)
on conflict (id) do nothing;

drop policy if exists "suggestions admin select" on storage.objects;
create policy "suggestions admin select"
on storage.objects for select
using (bucket_id = 'suggestions' and public.is_admin(auth.uid()));
