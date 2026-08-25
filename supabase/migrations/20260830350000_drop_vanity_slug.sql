-- ============================================================================
-- Migration: retire businesses.vanity_slug — one handle namespace, not two
-- Date: 2026-08-24
--
-- `link_pages.handle` (20260830330000) is now the platform's handle namespace.
-- Leaving `vanity_slug` alongside it would mean the same string can be free on
-- one and taken on the other, forever, with no single place to ask.
--
-- THIS IS A SEPARATE FILE ON PURPOSE. Three source files still select the
-- column:
--     apps/web/app/b/[slug]/route.ts
--     apps/web/app/businesses/[slug]/page.tsx
--     apps/web/app/dashboard/business/[id]/edit/edit-form.tsx
-- plus apps/web/lib/actions/vanity-url.ts. Dropping the column while they
-- still read it breaks a live page — and per the gotchas note, `pnpm db:push`
-- now blocks exactly that class of failure. Keeping the drop in its own file,
-- ordered after the others, makes "code first" a property of the migration
-- sequence rather than a comment somebody has to remember.
--
-- Do not push this file until those files read link_pages.handle.
--
-- Safe today: checked against production on 24 Aug 2026 — 0 of 10,680
-- businesses have a vanity_slug, 0 are on a paid plan, and subscriptions is
-- empty. The guard below re-checks rather than trusting that snapshot, so
-- running this against any other environment fails loudly instead of
-- destroying data.
-- ============================================================================

do $$
declare n integer;
begin
  select count(*) into n from public.businesses where vanity_slug is not null;
  if n > 0 then
    raise exception
      'refusing to drop vanity_slug: % rows still hold one. Backfill them into link_pages.handle first.', n;
  end if;
end $$;

drop index if exists public.businesses_vanity_slug_idx;

alter table public.businesses drop column if exists vanity_slug;
