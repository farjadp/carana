-- ============================================================================
-- Migration: retire businesses.vanity_slug — one handle namespace, not two
-- Date: 2026-08-24
--
-- `link_pages.handle` (20260830330000) is now the platform's handle namespace.
-- Leaving `vanity_slug` alongside it would mean the same string can be free on
-- one and taken on the other, forever, with no single place to ask.
--
-- THIS IS A SEPARATE FILE ON PURPOSE, and it is numbered last on purpose too.
-- It was written as 20260830350000 on 24 Aug and deliberately held back while
-- 360000, 370000 and 380000 went in ahead of it, which left it out of order —
-- the CLI then refuses it without --include-all. Renumbering costs nothing
-- because it had never been applied anywhere, and it keeps the history
-- monotonic so a rebuild from scratch runs in the same order production did.
-- Reaching for --include-all instead would have made an exception into a habit.
--
-- These source files selected the column, and all of them were repointed to
-- link_pages.handle in the same commit that applies this:
--     apps/web/app/b/[slug]/route.ts            -> resolves link_pages.handle
--     apps/web/lib/actions/vanity-url.ts        -> deleted
--     apps/web/components/business/vanity-url-editor.tsx -> deleted
--     apps/web/lib/actions/owner-visibility.ts  -> stopped selecting it
--     apps/web/app/dashboard/business/[id]/edit/edit-form.tsx -> links to the
--       link page instead of embedding the old editor
--     apps/web/app/features/page.tsx            -> copy now sells the handle
-- Dropping the column while they
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
