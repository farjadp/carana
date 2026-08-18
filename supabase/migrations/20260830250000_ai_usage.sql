-- ============================================================================
-- Migration: ai_usage — a spend ledger for the AI endpoints
-- Date: 2026-08-18
--
-- lib/utils/rate-limit.ts says it plainly in its own header: in-memory, resets
-- on deploy, not shared between instances. That is acceptable for stopping
-- accidental hammering. It is not acceptable as the only thing standing
-- between a signed-in account and an unbounded OpenAI bill, because on a
-- multi-region deployment each instance grants the full quota independently.
--
-- So AI calls are counted here, the same way job posts are: in the database,
-- where the count is the same number no matter which instance asks.
--
-- Deliberately NOT a plan entitlement. The AI writing help on the jobs board
-- is free like the board itself; this row exists to bound cost and abuse, not
-- to meter a feature. If AI ever becomes a paid quantity it belongs in
-- plans.ts, and this table stays what it is — the floor under it.
-- ============================================================================

create table if not exists public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Free-text rather than an enum: a new AI surface should not need a
  -- migration to start being counted.
  feature text not null,
  business_id uuid references public.businesses (id) on delete set null,
  -- Rough spend signal. Null when the provider did not report one.
  tokens integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_feature_idx
  on public.ai_usage (user_id, feature, created_at desc);

alter table public.ai_usage enable row level security;

-- No policy for anyone. Every read and write is service-role, from the route
-- that spends the money. A user has no business reading this, and nothing
-- good comes of letting one write it.
drop policy if exists "ai usage admin read" on public.ai_usage;
create policy "ai usage admin read"
on public.ai_usage for select
to authenticated
using (public.is_admin(auth.uid()));

/**
 * How many times this user hit this AI feature in the last p_hours.
 *
 * SECURITY DEFINER so the counting route can call it without a policy that
 * would also expose the ledger; the route already proves who is asking.
 */
create or replace function public.ai_usage_recent_count(
  p_user_id uuid,
  p_feature text,
  p_hours integer default 24
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.ai_usage
  where user_id = p_user_id
    and feature = p_feature
    and created_at > now() - (greatest(1, least(p_hours, 720)) || ' hours')::interval;
$$;

grant execute on function public.ai_usage_recent_count(uuid, text, integer) to authenticated;
