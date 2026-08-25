-- ============================================================================
-- Migration: GPLZ Link — link-in-bio pages on gplz.link
-- Date: 2026-08-24
--
-- A link-in-bio page per business (Linktree-class), served from the second
-- hostname `gplz.link` by the SAME Next app — `proxy.ts` rewrites
-- `gplz.link/<handle>` to an internal `/link/<handle>`. There is no second
-- product, database or deploy. See the Notion page "GPLZ Link — link-in-bio
-- (spec & decisions)".
--
-- Four design decisions are encoded here; each one is load-bearing.
--
-- 1. THE OWNER IS A USER, NOT A BUSINESS. The free tier is open to people who
--    have no listing at all — freelancers, coaches, artists. So `link_pages`
--    keys on `owner_user_id` and `business_id` is nullable. Keying on the
--    business would have forced a shadow `businesses` row per individual,
--    which pollutes the directory, the counts and the sitemap.
--
-- 2. ONE HANDLE NAMESPACE, AND IT LIVES HERE. `businesses.vanity_slug` was
--    the Premium-only English URL segment behind /b/<slug>. Two namespaces
--    means the same string can be free on one and taken on the other, forever.
--    So the handle is `link_pages.handle` and nothing else. The old column is
--    dropped in a LATER migration (20260830350000) — deliberately separate,
--    because three source files still select it and the drop must not be able
--    to run before they are repointed.
--
--    `citext` rather than a `lower()` unique index: the vanity_slug index had
--    to spell case-insensitivity by hand, and anything comparing the column
--    without `lower()` silently got case-sensitive equality. The type makes
--    that impossible instead of merely discouraged.
--
--    Format IS checked in SQL here, departing from the vanity_slug note that
--    put format in the server action next to the plan check. There is no plan
--    check to sit next to any more — an individual's page has no plan — so
--    the constraint has nowhere else to live.
--
-- 3. A MIRROR ITEM MAY NOT KEEP A COPY. The whole reason this beats Linktree
--    is that the page is already full: phone, hours, directions, gallery,
--    announcements and jobs are read live from the business row, so a changed
--    phone number changes the link page and an expired offer removes itself.
--    The moment an item is allowed to cache a URL, that stops being true and
--    we get the drift class of bug this project keeps paying for (the mobile
--    gallery limits, the hand-typed second copy of the plan quantities).
--    `link_items_mirror_has_no_copy` makes the cache unrepresentable.
--
-- 4. `position` IS NOT UNIQUE. A unique (page_id, position) forces every
--    drag-to-reorder into deferrable constraints or temporary values. A plain
--    index with `id` as tie-break lets a reorder be one UPDATE ... FROM.
--
-- Env / Identity: no secrets. Every write path is either the owner through
--      RLS or the Stripe webhook with the service role.
-- ============================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------- 1. handles
-- The namespace has three claimants: live pages, names we keep for ourselves,
-- and names released recently enough that handing them straight to the next
-- person would hijack whatever is already printed on a sticker or a card.

create table if not exists public.reserved_handles (
  handle citext primary key,
  reason text not null check (reason in ('route', 'brand', 'system'))
);

comment on table public.reserved_handles is
  'Handles nobody may claim. `route` entries must match the real top-level
   segments served on gplz.link — add a row in the same commit that adds a
   route, or the first collision is a live page shadowing a real path.';

insert into public.reserved_handles (handle, reason) values
  -- the short-link prefixes and every top-level route on either host
  ('b','route'), ('j','route'), ('a','route'), ('api','route'),
  ('link','route'), ('links','route'), ('admin','route'), ('app','route'),
  ('www','route'), ('login','route'), ('signup','route'), ('auth','route'),
  ('account','route'), ('profile','route'), ('dashboard','route'),
  ('search','route'), ('blog','route'), ('jobs','route'), ('cities','route'),
  ('provinces','route'), ('categories','route'), ('businesses','route'),
  ('pricing','route'), ('support','route'), ('contact','route'),
  ('about','route'), ('terms','route'), ('privacy','route'), ('claim','route'),
  -- ours
  ('goplaza','brand'), ('gplz','brand'), ('charana','brand'), ('go','brand'),
  -- infrastructure names that must never resolve to a user page
  ('mail','system'), ('smtp','system'), ('ftp','system'), ('cdn','system'),
  ('static','system'), ('assets','system'), ('img','system'), ('www2','system'),
  ('test','system'), ('staging','system'), ('dev','system'), ('status','system')
on conflict (handle) do nothing;

create table if not exists public.link_handle_history (
  handle           citext not null,
  previous_page_id uuid,
  released_at      timestamptz not null default now()
);

create index if not exists link_handle_history_idx
  on public.link_handle_history (handle, released_at desc);

comment on table public.link_handle_history is
  'Cooldown ledger. A released handle stays unclaimable for 90 days so a QR
   code already printed on a shop window cannot be pointed at a stranger.';

-- ------------------------------------------------------------ 2. link_pages
create table if not exists public.link_pages (
  id            uuid primary key default gen_random_uuid(),

  handle        citext not null unique
                constraint link_pages_handle_format
                check (handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'),

  owner_user_id uuid not null references auth.users (id) on delete cascade,
  business_id   uuid references public.businesses (id) on delete cascade,

  title         text not null,
  tagline       text,
  avatar_url    text,
  cover_url     text,

  theme         jsonb not null default '{"preset":"default"}'::jsonb,
  locale_mode   text not null default 'fa'
                check (locale_mode in ('fa', 'en', 'both')),

  -- Stored as a WISH. The renderer must re-ask the entitlement every time:
  -- unlike `owner_privacy` — where what would come back is a person's name,
  -- so hiding is honoured after a plan lapses — what comes back here is our
  -- own footer. It returns the moment the subscription does not.
  footer_hidden boolean not null default false,

  pixel_meta    text,
  pixel_ga      text,

  status        text not null default 'draft'
                check (status in ('draft', 'live', 'suspended')),
  suspended_reason text,

  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint link_pages_suspended_has_reason
    check (status <> 'suspended' or suspended_reason is not null)
);

create index if not exists link_pages_owner_idx    on public.link_pages (owner_user_id);
create index if not exists link_pages_business_idx on public.link_pages (business_id) where business_id is not null;
create index if not exists link_pages_live_idx     on public.link_pages (status) where status = 'live';

comment on column public.link_pages.handle is
  'THE handle namespace for the whole platform: gplz.link/<handle> and
   goplaza.ca/b/<handle> resolve this one column. Availability must be asked
   through public.handle_available(), never by querying this table alone —
   reserved names and the 90-day cooldown live elsewhere.';
comment on column public.link_pages.business_id is
  'Null for an individual with no listing. When set it must be a business the
   owner actually owns — enforced by link_pages_check_business, because a
   foreign key cannot express "and belongs to this user".';
comment on column public.link_pages.footer_hidden is
  'What the owner asked for, not what is rendered. Ask the entitlement at
   render time; this flag alone is not permission.';

-- ------------------------------------------------------------ 3. link_items
create table if not exists public.link_items (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.link_pages (id) on delete cascade,
  position   integer not null default 0,

  -- No CHECK on an enumeration we expect to grow? No — this one is different
  -- from event_type (see 20260830340000): each kind here needs matching
  -- render code shipped anyway, so a new kind is never a data-only change.
  kind       text not null check (kind in (
               'custom', 'header', 'divider',
               'phone', 'whatsapp', 'directions', 'hours', 'website', 'email',
               'instagram', 'telegram', 'booking',
               'gallery', 'menu', 'announcements', 'jobs', 'reviews',
               'open_now', 'lead_form')),

  label_fa   text,
  label_en   text,
  url        text,
  icon       text,

  enabled    boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint link_items_custom_shape check (
    kind <> 'custom' or (url is not null and label_fa is not null)),

  -- The rule the whole product rests on: a mirror item is a POINTER, never a
  -- copy. See design note 3 in this file's header.
  constraint link_items_mirror_has_no_copy check (
    kind in ('custom', 'header', 'divider') or url is null),

  constraint link_items_window_ordered check (
    starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists link_items_page_pos_idx on public.link_items (page_id, position, id);

comment on column public.link_items.starts_at is
  'Scheduling window, paid tier. Expiry is a window, not a status — the same
   rule the jobs board follows. Nothing writes a state field when time passes.';

-- ------------------------------------------------- 4. rules a FK cannot say
create or replace function public.link_pages_check_business()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.businesses b
    where b.id = new.business_id
      and (b.owner_user_id = new.owner_user_id or b.created_by = new.owner_user_id)
  ) then
    raise exception 'link page owner % does not own business %', new.owner_user_id, new.business_id;
  end if;
  return new;
end $$;

drop trigger if exists link_pages_check_business on public.link_pages;
create trigger link_pages_check_business
  before insert or update of business_id, owner_user_id on public.link_pages
  for each row execute function public.link_pages_check_business();

-- A mirror item has nothing to mirror on a page with no business behind it.
create or replace function public.link_items_check_mirror()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind not in ('custom', 'header', 'divider')
     and not exists (select 1 from public.link_pages p
                     where p.id = new.page_id and p.business_id is not null) then
    raise exception 'item kind % needs a page attached to a business', new.kind;
  end if;
  return new;
end $$;

drop trigger if exists link_items_check_mirror on public.link_items;
create trigger link_items_check_mirror
  before insert or update of kind, page_id on public.link_items
  for each row execute function public.link_items_check_mirror();

-- A backstop, not the product rule. The real cap is 1 page free / 3 paid and
-- it is computed in the server action from entitlements — SQL has no business
-- re-deriving plan maths that @goplaza/core already owns. This only stops a
-- runaway loop or a bug from creating thousands.
create or replace function public.link_pages_cap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.link_pages where owner_user_id = new.owner_user_id) >= 10 then
    raise exception 'hard ceiling of 10 link pages per user reached';
  end if;
  return new;
end $$;

drop trigger if exists link_pages_cap on public.link_pages;
create trigger link_pages_cap before insert on public.link_pages
  for each row execute function public.link_pages_cap();

-- ------------------------------------------------------- 5. handle lookup
create or replace function public.handle_available(p_handle citext)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_handle ~ '^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$'
    and not exists (select 1 from public.link_pages      where handle = p_handle)
    and not exists (select 1 from public.reserved_handles where handle = p_handle)
    and not exists (select 1 from public.link_handle_history
                    where handle = p_handle and released_at > now() - interval '90 days');
$$;

comment on function public.handle_available(citext) is
  'The only correct way to ask whether a handle can be claimed. Callers must
   fold Persian digits with toLatinDigits BEFORE calling — the app forces RTL
   and an ASCII-digit field has silently broken sign-in and verification here
   before.';

grant execute on function public.handle_available(citext) to anon, authenticated;

-- Releasing a handle records the cooldown. Both ways of releasing one count:
-- deleting the page, and renaming it. Recording only the delete would leave a
-- free rename as a way to drop a handle with no cooldown at all, which is
-- precisely the hole the cooldown exists to close.
create or replace function public.link_pages_release_handle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.link_handle_history (handle, previous_page_id) values (old.handle, old.id);
  return coalesce(new, old);
end $$;

drop trigger if exists link_pages_release_handle on public.link_pages;
create trigger link_pages_release_handle after delete on public.link_pages
  for each row execute function public.link_pages_release_handle();

drop trigger if exists link_pages_rename_handle on public.link_pages;
create trigger link_pages_rename_handle after update of handle on public.link_pages
  for each row when (old.handle is distinct from new.handle)
  execute function public.link_pages_release_handle();

-- ------------------------------------------------------------ 6. lead capture
create table if not exists public.link_leads (
  id             uuid primary key default gen_random_uuid(),
  page_id        uuid not null references public.link_pages (id) on delete cascade,
  name           text,
  email          citext,
  phone          text,
  source_item_id uuid references public.link_items (id) on delete set null,

  -- A snapshot, not a reference. If the consent wording changes six months
  -- from now, we must still be able to show what THIS person agreed to.
  consent_text   text not null,
  consent_at     timestamptz not null default now(),

  created_at     timestamptz not null default now(),
  constraint link_leads_has_contact check (email is not null or phone is not null)
);

create index if not exists link_leads_page_idx on public.link_leads (page_id, created_at desc);

comment on table public.link_leads is
  'Personal data collected from the public. Owner-read only, never public, and
   inserted only through a rate-limited endpoint with the service role — there
   is deliberately no insert policy for anon.';

-- ----------------------------------------------------------- 7. touch triggers
create or replace function public.link_pages_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists link_pages_touch on public.link_pages;
create trigger link_pages_touch before update on public.link_pages
  for each row execute function public.link_pages_touch();

create or replace function public.link_items_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists link_items_touch on public.link_items;
create trigger link_items_touch before update on public.link_items
  for each row execute function public.link_items_touch();

-- --------------------------------------------------------------- 8. billing
-- `link_pro` is a SECOND AXIS, not a fifth PlanId. It is bought standalone at
-- $13/mo, and granted for free by every paid directory plan, so Starter ($21)
-- strictly dominates it instead of competing with it.
--
-- Verified 24 Aug 2026 before writing this: subscriptions has 0 rows and no
-- business is on a paid plan, so relaxing the constraints touches nothing.

alter table public.subscriptions
  alter column business_id drop not null,
  add column if not exists product text not null default 'directory';

do $$
declare con record;
begin
  -- Same defensive shape as the platinum migration: the original constraints
  -- were created inline, so their generated names are not knowable here.
  for con in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.subscriptions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%plan%'
      and pg_get_constraintdef(c.oid) not ilike '%product%'
  loop
    execute format('alter table public.subscriptions drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.subscriptions
  add constraint subscriptions_plan_check
    check (plan in ('pro', 'featured', 'platinum', 'link_pro'));

alter table public.subscriptions
  drop constraint if exists subscriptions_product_check,
  add constraint subscriptions_product_check
    check (product in ('directory', 'link_pro'));

alter table public.subscriptions
  drop constraint if exists subscriptions_has_subject,
  add constraint subscriptions_has_subject
    check (business_id is not null or owner_user_id is not null);

comment on column public.subscriptions.product is
  'Which axis this subscription buys. A link_pro row may have a null
   business_id — an individual with no listing can still be a customer.';

-- Denormalised read paths, one per kind of owner, mirroring what
-- businesses.plan/plan_until already does. Written only by the webhook.
alter table public.businesses
  add column if not exists link_pro_until timestamptz;

alter table public.profiles
  add column if not exists link_pro_until     timestamptz,
  add column if not exists stripe_customer_id text;

comment on column public.businesses.link_pro_until is
  'End of the Link Pro period. Never read alone: a paid directory plan grants
   link_pro too, and an expired column may not have been downgraded yet. Ask
   hasLinkPro() in @goplaza/core, which recomputes instead of trusting.';

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- -------------------------------------------------------------------- 9. RLS
alter table public.link_pages          enable row level security;
alter table public.link_items          enable row level security;
alter table public.link_leads          enable row level security;
alter table public.reserved_handles    enable row level security;
alter table public.link_handle_history enable row level security;

drop policy if exists "link pages public read"  on public.link_pages;
drop policy if exists "link pages owner all"    on public.link_pages;
drop policy if exists "link pages admin read"   on public.link_pages;
drop policy if exists "link items public read"  on public.link_items;
drop policy if exists "link items owner all"    on public.link_items;
drop policy if exists "link leads owner read"   on public.link_leads;
drop policy if exists "link leads owner delete" on public.link_leads;
drop policy if exists "reserved handles read"   on public.reserved_handles;

-- Public sees a page only when it is live AND, if it is attached to a
-- business, that business is itself published. A suspended listing must not
-- keep a live storefront through this side door.
create policy "link pages public read" on public.link_pages for select to anon, authenticated
  using (
    status = 'live'
    and (business_id is null or exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status in ('APPROVED', 'PUBLISHED')))
  );

create policy "link pages owner all" on public.link_pages for all to authenticated
  using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "link pages admin read" on public.link_pages for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "link items public read" on public.link_items for select to anon, authenticated
  using (exists (
    select 1 from public.link_pages p
    where p.id = page_id
      and p.status = 'live'
      and (p.business_id is null or exists (
        select 1 from public.businesses b
        where b.id = p.business_id and b.status in ('APPROVED', 'PUBLISHED')))
  ));

create policy "link items owner all" on public.link_items for all to authenticated
  using (exists (select 1 from public.link_pages p
                 where p.id = page_id and p.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.link_pages p
                      where p.id = page_id and p.owner_user_id = auth.uid()));

-- Leads: the owner may read and delete their own. Nobody may read anyone
-- else's, and inserts come from the service role only.
create policy "link leads owner read" on public.link_leads for select to authenticated
  using (exists (select 1 from public.link_pages p
                 where p.id = page_id and p.owner_user_id = auth.uid()));

create policy "link leads owner delete" on public.link_leads for delete to authenticated
  using (exists (select 1 from public.link_pages p
                 where p.id = page_id and p.owner_user_id = auth.uid()));

-- Readable so the sign-up form can explain why a name is unavailable.
create policy "reserved handles read" on public.reserved_handles for select to anon, authenticated
  using (true);
