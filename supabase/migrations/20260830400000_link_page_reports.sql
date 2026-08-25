-- ============================================================================
-- Migration: a bio page can be reported, and suspended
-- Date: 2026-08-25
--
-- `link_pages.status` has had a 'suspended' value and a `suspended_reason`
-- since 20260830330000, and nothing could ever set them. A page that turns out
-- to be a scam had no off switch and no way for anyone to say so — which is
-- the honesty problem in reverse: the schema described a capability the
-- product did not have.
--
-- WHY THIS EXTENDS business_reports RATHER THAN ADDING link_page_reports.
-- There is already a report table, an anonymous rate-limited endpoint, an
-- admin queue with statuses and notes, and a person in the habit of working
-- it. A second table would mean a second queue, and the second queue is
-- always the one nobody opens. The cost is relaxing one NOT NULL on a table
-- holding 4 rows.
--
-- WHAT THIS DELIBERATELY DOES NOT ADD, and why it would be theatre today:
-- an outbound-URL blocklist. A bio page currently contains no user-supplied
-- URL at all — every item is mirrored from a listing that admins already
-- moderate, and `link_items_mirror_has_no_copy` makes a cached URL
-- unrepresentable. The phishing surface arrives with the editor, and the scan
-- belongs in the same commit as the field it scans. Scanning nothing now
-- would be a control that looks like protection and tests nothing.
--
-- The surface that DOES exist today is small and real: `title`, `tagline` and
-- a paid custom `handle` are owner-supplied free text on a public page.
-- gplz.link/free-bitcoin needs an off switch. That is what this is.
-- ============================================================================

-- ------------------------------------------------- 1. reports about a page
alter table public.business_reports
  alter column business_id drop not null,
  add column if not exists link_page_id uuid references public.link_pages (id) on delete cascade;

alter table public.business_reports
  drop constraint if exists business_reports_has_subject,
  add constraint business_reports_has_subject
    check (business_id is not null or link_page_id is not null);

create index if not exists business_reports_link_page_idx
  on public.business_reports (link_page_id) where link_page_id is not null;

comment on column public.business_reports.link_page_id is
  'Set when the report is about a GPLZ Link bio page rather than a listing.
   Exactly one of business_id / link_page_id is populated — see
   business_reports_has_subject.';

-- ------------------------------------------------------------ 2. suspending
-- Admin-only, and written through a function so the reason can never be
-- forgotten: the column has a NOT NULL-when-suspended check on it already
-- (link_pages_suspended_has_reason), and an UPDATE that sets the status
-- without the reason simply fails. Doing it here means one place knows that.
create or replace function public.suspend_link_page(
  p_page_id uuid,
  p_reason  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a suspension needs a reason';
  end if;

  update public.link_pages
     set status = 'suspended',
         suspended_reason = btrim(p_reason)
   where id = p_page_id;
end $$;

comment on function public.suspend_link_page(uuid, text) is
  'Take a bio page off the air. Requires a reason, because a suspended page
   the owner cannot get an explanation for is an unappealable decision. The
   owner cannot lift it themselves — setLinkPageStatus refuses on a suspended
   page — and neither can this: restoring is a separate, deliberate act.';

create or replace function public.restore_link_page(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorised';
  end if;

  -- Back to draft, never straight to live. Whoever was suspended should have
  -- to look at their own page and publish it again, rather than having it
  -- silently reappear in front of the public.
  update public.link_pages
     set status = 'draft',
         suspended_reason = null,
         published_at = null
   where id = p_page_id
     and status = 'suspended';
end $$;

grant execute on function public.suspend_link_page(uuid, text) to authenticated;
grant execute on function public.restore_link_page(uuid) to authenticated;

-- ---------------------------------------------------- 3. one page per owner
-- The hard ceiling from 330000 was 10 — a runaway-loop backstop, not a
-- product rule. With the individual tier still closed the real cap is
-- enforced in the server action, but the ceiling is dropped to 3 here to
-- match the highest number any package actually sells (LINK_LIMITS.pro.pages).
-- A bug that creates pages in a loop should stop at the real limit, not at
-- three times it.
create or replace function public.link_pages_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.link_pages where owner_user_id = new.owner_user_id) >= 3 then
    raise exception 'link page limit reached for this owner';
  end if;
  return new;
end $$;
