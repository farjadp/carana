-- ============================================================================
-- Source: supabase/migrations/20260910100000_top_searches_typed_only.sql
-- Version: 1.0.0 — 2026-09-10
-- Why: 20260909100000 made «پرجستجو:» real. It also made it circular, and the
--      first look at the numbers showed it:
--
--        ۳۴۷  وکیل مهاجرت      ۳۵  دندانپزشک
--         ۹۱  املاک            ۳۱  مکانیک
--         ۴۳  رستوران ایرانی   ۳۰  سوپرمارکت ایرانی
--         ۳۸  حسابدار
--
--      Every one of those seven was already a hard-coded chip — six on the home
--      hero, eight in the /search empty state. Clicking a chip navigates to
--      /search, and /search logs every query it serves, so the chips had been
--      seeding the log for the ten days before this function could read it.
--      The label was not false: those queries really were run the most. It was
--      measuring our own suggestion rather than anyone's demand, and left alone
--      it would have frozen the chip row on those six terms permanently — each
--      click reinforcing the reason it was shown.
--
--      `search_queries.source` already existed and every row said 'web'. The
--      web app now writes 'chip' for a suggestion followed and 'smart' for one
--      of the model's expanded terms; only an absent `?from=` — a query someone
--      typed — stays 'web'. This function counts 'web' alone.
--
--      NOTE ON THE HISTORY. The ~10 days of rows written before this cannot be
--      relabelled: a chip click and a typed «وکیل مهاجرت» are identical in the
--      table, and guessing would be inventing data. They keep counting until
--      they age out of the 90-day window, so the chip row stays partly seeded
--      until roughly 9 Dec 2026 and then becomes real on its own. Lowering
--      p_days is the lever, and app/page.tsx now asks for 30 — clean by
--      ~10 Oct 2026 rather than ~9 Dec.
--
--      SECOND THING, found while checking that a 30-day window would help.
--      It did not — 90 days and 30 days return identical rows, because the
--      whole log is younger than 30 days — but the 7-day window showed what
--      is underneath the seeded terms:
--
--        ۲۸ کت · ۲۷ نور · ۲۰ هل · ۱۵ جو · ۱۵ زمین · ۱۵ گل
--
--      Two- and three-character fragments, anonymous, no city filter, spread
--      evenly around the clock (21:03, 22:23, 23:19, 00:25, 01:18, 05:58,
--      09:33, 14:25). Whatever is producing them, **they are what the chips
--      will show once the seeded terms age out**, and «جو» is not a suggestion
--      that helps anybody start a search.
--
--      So the length floor goes from 2 to 4. The justification is the chip's
--      job, not bot-detection: a chip has to be a usable starting query, and
--      below four characters a Persian term rarely is («وکیل» is 4, «رستوران»
--      is 7, «جو» and «کت» are 2). This costs us «گل» as a florist query,
--      which is a real search and a poor chip.
--
--      Where those ~3,000 searches a day come from is a separate question and
--      is in `05-open-tasks` — the 8 Sep scrape ceiling covers `/businesses/*`,
--      and `/search` is a page too.
-- ============================================================================

create or replace function public.top_searches(
  p_limit integer default 6,
  p_days integer default 90,
  p_min_hits integer default 3
)
returns table (term text, hits bigint)
language sql
security definer
set search_path = public
stable
as $$
  select q_norm as term, count(*) as hits
  from public.search_queries
  where created_at >= now() - make_interval(days => greatest(1, least(p_days, 365)))
    and result_count > 0
    -- Typed queries only. 'chip' and 'smart' are things we put in front of the
    -- visitor; counting them would make this function a mirror.
    and source = 'web'
    -- Four, not two: a chip has to be a usable starting query. See the note
    -- above — «جو» and «کت» top the recent log and neither helps anyone.
    and char_length(btrim(q_norm)) between 4 and 40
  group by q_norm
  having count(*) >= greatest(1, p_min_hits)
  order by count(*) desc, q_norm asc
  limit greatest(1, least(p_limit, 24));
$$;

revoke all on function public.top_searches(integer, integer, integer) from public;
grant execute on function public.top_searches(integer, integer, integer) to anon, authenticated;

comment on function public.top_searches is
  'Aggregated TYPED search terms for the home page chips — source = ''web'' only, so suggestions we showed cannot count as demand. SECURITY DEFINER over the admin-only search_queries table; returns terms and counts only, never rows.';
