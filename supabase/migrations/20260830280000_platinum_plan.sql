-- ============================================================================
-- Migration: fourth plan tier "platinum" + repriced Starter/Premium
-- Date: 2026-08-19
--
-- Why: packages/core/src/plans.ts gained a fourth PlanId, "platinum" — capped
--      at PLATINUM_SEAT_CAP (21) businesses nationwide, quarterly billing
--      only — and BillingInterval gained "2year"/"quarter". The two check
--      constraints written by 20260830140000_billing.sql only allow
--      ('free','pro','featured') and interval in ('month','year'); both must
--      widen or the first platinum webhook write fails the constraint.
--
--      The constraints were created inline (`add column ... check (...)`),
--      so their names are whatever Postgres auto-assigned. Rather than guess
--      the default `<table>_<column>_check` name, each DO block below finds
--      the check constraint by which column it actually covers (via
--      pg_constraint.conkey matching the column's attnum) and drops that —
--      correct regardless of how it was named.
-- ============================================================================

-- ---------------------------------------------------- 1. businesses.plan
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'businesses'
      and c.contype = 'c'
      and c.conkey = (
        select array_agg(a.attnum) from pg_attribute a
        where a.attrelid = t.oid and a.attname = 'plan'
      )
  loop
    execute format('alter table public.businesses drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.businesses
  add constraint businesses_plan_check check (plan in ('free', 'pro', 'featured', 'platinum'));

-- --------------------------------------------------- 2. subscriptions.plan
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'subscriptions'
      and c.contype = 'c'
      and c.conkey = (
        select array_agg(a.attnum) from pg_attribute a
        where a.attrelid = t.oid and a.attname = 'plan'
      )
  loop
    execute format('alter table public.subscriptions drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('pro', 'featured', 'platinum'));

-- ----------------------------------------------- 3. subscriptions.interval
-- Stripe represents "2year" as interval=year, interval_count=2, and
-- "quarter" as interval=month, interval_count=3 — recurring.interval alone
-- collapses both back to 'year'/'month'. This column stores OUR label
-- (apps/web/app/api/stripe/webhook/route.ts computes it from interval +
-- interval_count), so it must accept all four.
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'subscriptions'
      and c.contype = 'c'
      and c.conkey = (
        select array_agg(a.attnum) from pg_attribute a
        where a.attrelid = t.oid and a.attname = 'interval'
      )
  loop
    execute format('alter table public.subscriptions drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_interval_check check (interval in ('month', 'year', '2year', 'quarter'));

-- Existing rows are untouched: 'pro'/'featured' and 'month'/'year' are still
-- valid values in the widened constraints, nothing to backfill.
