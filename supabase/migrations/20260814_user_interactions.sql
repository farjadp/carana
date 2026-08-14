-- ============================================================================
-- Migration: User-Business Interactions and Reviews
-- Date: 2026-08-14
-- ============================================================================

-- 1. Create Enums
create type public.personal_interaction_status as enum (
  'none',
  'saved',
  'want_to_go',
  'visited_liked',
  'visited_neutral',
  'visited_disliked',
  'customer',
  'recommended',
  'follow_up_needed'
);

create type public.public_review_status as enum (
  'draft',
  'submitted',
  'pending_moderation',
  'approved',
  'published',
  'needs_changes',
  'rejected',
  'hidden',
  'deleted_by_user'
);

create type public.display_identity_type as enum (
  'real_name',
  'display_name',
  'anonymous'
);

create type public.would_return_type as enum (
  'yes',
  'maybe',
  'no'
);

-- 2. Create user_business_interactions Table
create table public.user_business_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  
  personal_status public.personal_interaction_status not null default 'none',
  
  -- Ratings (Private initially)
  personal_rating integer check (personal_rating >= 1 and personal_rating <= 5),
  service_quality_rating integer check (service_quality_rating >= 1 and service_quality_rating <= 5),
  communication_rating integer check (communication_rating >= 1 and communication_rating <= 5),
  value_rating integer check (value_rating >= 1 and value_rating <= 5),
  cultural_fit_rating integer check (cultural_fit_rating >= 1 and cultural_fit_rating <= 5),
  would_return public.would_return_type,
  
  -- Dates
  visited_at timestamp with time zone,
  planned_visit_at timestamp with time zone,
  reminder_at timestamp with time zone,
  
  -- Private Note
  private_title text,
  private_note text,
  private_tags text[],
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Ensure only one interaction record per user per business
  constraint user_business_interaction_unique unique (user_id, business_id)
);

-- 3. Create public_reviews Table
create table public.public_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  source_interaction_id uuid references public.user_business_interactions(id) on delete set null,
  
  public_title text,
  public_body text not null,
  public_rating integer not null check (public_rating >= 1 and public_rating <= 5),
  display_identity public.display_identity_type not null default 'display_name',
  experience_date timestamp with time zone,
  recommends boolean,
  
  status public.public_review_status not null default 'draft',
  moderation_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  published_at timestamp with time zone,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  -- Rule: each user should have only one active review per business
  -- We don't enforce at DB level with simple UNIQUE since deleted/draft could be multiple,
  -- but we can use partial index if we want. For now, handled by application logic.
  constraint public_review_rating_check check (public_rating >= 1 and public_rating <= 5)
);

-- Index for fast queries
create index idx_ubi_user on public.user_business_interactions(user_id);
create index idx_ubi_business on public.user_business_interactions(business_id);
create index idx_pr_business on public.public_reviews(business_id);
create index idx_pr_user on public.public_reviews(user_id);
create index idx_pr_status on public.public_reviews(status);

-- 4. Enable RLS
alter table public.user_business_interactions enable row level security;
alter table public.public_reviews enable row level security;

-- 5. RLS Policies for user_business_interactions
-- Users can read, insert, update their own interactions
create policy "Users can read own interactions"
on public.user_business_interactions for select
using (auth.uid() = user_id);

create policy "Users can insert own interactions"
on public.user_business_interactions for insert
with check (auth.uid() = user_id);

create policy "Users can update own interactions"
on public.user_business_interactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own interactions"
on public.user_business_interactions for delete
using (auth.uid() = user_id);


-- 6. RLS Policies for public_reviews
-- Everyone can read published reviews
create policy "Anyone can read published reviews"
on public.public_reviews for select
using (status = 'published');

-- Admins can read all reviews
create policy "Admins can read all reviews"
on public.public_reviews for select
using (public.is_admin(auth.uid()));

-- Users can read their own reviews
create policy "Users can read own reviews"
on public.public_reviews for select
using (auth.uid() = user_id);

-- Users can insert their own reviews
create policy "Users can insert own reviews"
on public.public_reviews for insert
with check (auth.uid() = user_id);

-- Users can update their own reviews
create policy "Users can update own reviews"
on public.public_reviews for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins can update all reviews
create policy "Admins can update reviews"
on public.public_reviews for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 7. Add trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_interaction_updated
  before update on public.user_business_interactions
  for each row execute procedure public.handle_updated_at();

create trigger on_review_updated
  before update on public.public_reviews
  for each row execute procedure public.handle_updated_at();
