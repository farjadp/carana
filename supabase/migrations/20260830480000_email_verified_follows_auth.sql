-- ============================================================================
-- Migration: profiles.email_verified_at follows auth.users.email_confirmed_at
-- Date: 2026-08-27
--
-- Two columns have been holding one fact — "we have proof this account's
-- address belongs to whoever is using it" — with nothing keeping them in step.
--
--   auth.users.email_confirmed_at   set when the signup link is clicked, or by
--                                   an OAuth provider that vouches for it
--   profiles.email_verified_at      set only by the in-app six-digit code
--                                   (lib/verification/contact-codes.ts)
--
-- So a brand-new account was asked to verify, by a code, the exact address it
-- had just proved by clicking a link mailed to it. That column is half the
-- gate on /dashboard/business/new and /dashboard/business/[id]/edit, and it is
-- required by verifyOwnListing, so the answer to "why can't I register my
-- business" was a verification the person had already done.
--
-- Both are proof of control of the same address. The link is arguably the
-- stronger of the two. This makes the profile follow auth, rather than adding
-- a third way to say the same thing.
--
-- WHY THE TIMESTAMP IS COPIED, NOT now():
-- the gates compare against a six-month window. Stamping now() would restart
-- everyone's clock at whatever moment this ran; copying keeps the window
-- counting from when the proof actually happened.
--
-- WHY greatest() RATHER THAN AN OVERWRITE:
-- someone who confirmed at signup and later re-verified in-app has a NEWER
-- timestamp on the profile. Moving it backwards would shorten their window
-- for no reason.
-- ============================================================================

-- ------------------------------------------------------- 1. keep them in step
create or replace function public.sync_email_verified_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  -- Only when it changed: this trigger fires on every UPDATE of auth.users,
  -- including a plain sign-in, and an unconditional write would touch every
  -- profile row on every login.
  if tg_op = 'UPDATE'
     and old.email_confirmed_at is not distinct from new.email_confirmed_at then
    return new;
  end if;

  update public.profiles
     set email_verified_at = greatest(
           coalesce(email_verified_at, new.email_confirmed_at),
           new.email_confirmed_at
         ),
         updated_at = timezone('utc', now())
   where id = new.id
     and (email_verified_at is null or email_verified_at < new.email_confirmed_at);

  return new;
end $$;

comment on function public.sync_email_verified_at() is
  'Copies auth.users.email_confirmed_at onto profiles.email_verified_at. The
   two columns are the same fact and drifted apart: confirming the signup link
   left the profile column null, which is half the gate on business
   registration. Never moves the timestamp backwards.';

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.sync_email_verified_at();

-- ------------------------------------------------------------- 2. backfill
-- Everyone already confirmed in auth but never stamped on their profile. As of
-- 27 Aug that is 29 of 31 accounts — the column has essentially never been set
-- except by the in-app code flow.
update public.profiles p
   set email_verified_at = u.email_confirmed_at,
       updated_at = timezone('utc', now())
  from auth.users u
 where u.id = p.id
   and u.email_confirmed_at is not null
   and (p.email_verified_at is null or p.email_verified_at < u.email_confirmed_at);
