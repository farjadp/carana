-- ============================================================================
-- Migration: billing — plans on businesses, subscriptions, invoices, webhook log
-- Date: 2026-08-16
--
-- Design notes that matter later:
--   * Stripe is the source of truth for money. These tables are a local mirror
--     so the product can answer "what may this listing do" without a network
--     call, and so an owner can see their own history.
--   * `stripe_events` exists for idempotency. Stripe retries webhooks, and a
--     retry must not double-apply anything.
--   * Nothing here is writable by a user. Every write comes from the webhook
--     with the service role. A plan a customer can set themselves is not a
--     plan, it is a wish.
--   * `plan` on businesses is denormalised on purpose: it is read on every
--     listing render and must not require a join.
-- ============================================================================

-- ------------------------------------------------------------------- 1. plan
alter table public.businesses
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'featured')),
  add column if not exists plan_until timestamptz,
  add column if not exists stripe_customer_id text;

comment on column public.businesses.plan is
  'Entitlement level. Written only by the Stripe webhook; never by the owner.';
comment on column public.businesses.plan_until is
  'End of the paid period. A lapsed row keeps its plan value until the webhook
   downgrades it, so read entitlements through lib/billing, never this column
   alone.';

create index if not exists businesses_plan_idx on public.businesses (plan) where plan <> 'free';

-- ---------------------------------------------------------- 2. subscriptions
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references public.businesses (id) on delete cascade,
  owner_user_id          uuid references auth.users (id) on delete set null,
  plan                   text not null check (plan in ('pro', 'featured')),
  status                 text not null check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  stripe_customer_id     text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id        text,
  interval               text check (interval in ('month', 'year')),
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_business_idx on public.subscriptions (business_id);
create index if not exists subscriptions_status_idx   on public.subscriptions (status);

create or replace function public.subscriptions_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.subscriptions_touch();

-- -------------------------------------------------------------- 3. invoices
-- A local copy of what the owner was charged, so the billing page can render
-- without calling Stripe on every load. The PDF always stays hosted by Stripe.
create table if not exists public.invoices (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid references public.businesses (id) on delete set null,
  stripe_invoice_id  text not null unique,
  stripe_customer_id text,
  number             text,
  status             text,
  amount_due         integer,
  amount_paid        integer,
  currency           text not null default 'cad',
  tax                integer,
  hosted_invoice_url text,
  invoice_pdf        text,
  period_start       timestamptz,
  period_end         timestamptz,
  paid_at            timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists invoices_business_idx on public.invoices (business_id, created_at desc);

-- --------------------------------------------------------- 4. webhook events
create table if not exists public.stripe_events (
  id            text primary key,          -- Stripe's event id: the idempotency key
  type          text not null,
  processed_at  timestamptz not null default now(),
  payload       jsonb
);

-- ------------------------------------------------------------------- 5. RLS
alter table public.subscriptions enable row level security;
alter table public.invoices      enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "subscriptions owner read" on public.subscriptions;
drop policy if exists "subscriptions admin read" on public.subscriptions;
drop policy if exists "invoices owner read"      on public.invoices;
drop policy if exists "invoices admin read"      on public.invoices;
drop policy if exists "stripe events admin read" on public.stripe_events;

-- Read-only for humans. Writes are service-role only, from the webhook.
create policy "subscriptions owner read" on public.subscriptions for select to authenticated
  using (exists (select 1 from public.businesses b
                 where b.id = business_id
                   and (b.owner_user_id = auth.uid() or b.created_by = auth.uid())));
create policy "subscriptions admin read" on public.subscriptions for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "invoices owner read" on public.invoices for select to authenticated
  using (exists (select 1 from public.businesses b
                 where b.id = business_id
                   and (b.owner_user_id = auth.uid() or b.created_by = auth.uid())));
create policy "invoices admin read" on public.invoices for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "stripe events admin read" on public.stripe_events for select to authenticated
  using (public.is_admin(auth.uid()));
