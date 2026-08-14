-- ============================================================================
-- Migration: First-party error and job telemetry
-- Date: 2026-08-26
--
-- Replaces the Sentry integration. The value of that work was never the
-- vendor: it was naming the class of failure this codebase actually produces.
-- Nothing here throws. sendEmail and sendSms return { sent: false } and carry
-- on, which is correct behaviour and also why three outages in one week were
-- all found by auditing rather than by being told.
--
-- Two tables, because they answer two different questions:
--   system_errors — something failed quietly. What, when, how often.
--   cron_runs     — did the scheduled job run at all. A job that stops
--                   running writes nothing anywhere, so its absence has to be
--                   detectable from the presence of earlier rows.
-- ============================================================================

create table if not exists public.system_errors (
  id uuid primary key default gen_random_uuid(),

  -- A stable slug: email_not_configured, sms_carrier_rejected, and so on.
  -- Grouping is done on this, so it must not carry variable text.
  kind text not null,

  -- Free-form context. Never put a phone number, an email address or a
  -- message body in here — this table is for diagnosis, not for a copy of
  -- the data that failed to send.
  detail jsonb not null default '{}'::jsonb,

  environment text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_system_errors_kind_time
  on public.system_errors (kind, created_at desc);

create index if not exists idx_system_errors_time
  on public.system_errors (created_at desc);

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  status text not null check (status in ('ok', 'error')),
  summary jsonb not null default '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_cron_runs_job_time
  on public.cron_runs (job, created_at desc);

-- ----------------------------------------------------------------------------
-- Both tables are operator-only. No client-facing policy at all: writes go
-- through the service role, and reads belong to the admin panel, which also
-- uses the service role. RLS on with no policy means no anon access.
-- ----------------------------------------------------------------------------
alter table public.system_errors enable row level security;
alter table public.cron_runs enable row level security;

comment on table public.system_errors is
  'Failures the product swallowed on purpose. Written by reportQuietFailure.';

comment on table public.cron_runs is
  'One row per scheduled-job execution. The absence of recent rows is the
   alert: nothing is written when nothing runs.';
