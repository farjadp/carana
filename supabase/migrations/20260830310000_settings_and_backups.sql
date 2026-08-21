-- ============================================================================
-- Migration: site_settings + private backups bucket
-- Date: 2026-08-19
--
-- Two pieces behind the real admin settings page (which until now was a
-- placeholder claiming "همه پارامترها استاندارد است" over nothing):
--
--   1. site_settings — one key/value row per runtime-tunable setting. First
--      consumer: the smart-search kill switch and its daily model-call cap
--      (lib/search/smart.ts reads key 'smart_search'). Service-role only:
--      settings gate paid features, so a client-writable settings row would
--      be a self-service discount.
--
--   2. storage bucket 'backups' — private home for admin-made data
--      snapshots (one folder per backup: {id}/{table}.jsonl + manifest.json).
--      No storage.objects policies are added, which under storage RLS means
--      anon/authenticated can neither list nor read; only the service role
--      touches it, and downloads go through short-lived signed URLs minted
--      by an admin-only route.
-- ============================================================================

create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

comment on table public.site_settings is
  'Runtime-tunable settings, one row per key. Written only via the admin
   settings page (service role after requireAdmin). Consumers read with the
   service role and fall back to safe defaults when a key is absent.';

alter table public.site_settings enable row level security;
-- No policies: service-role only, both directions.

-- Private bucket for backups. 'on conflict do nothing' keeps this re-runnable.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
