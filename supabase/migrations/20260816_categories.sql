-- ============================================================================
-- Migration: Create Categories Table and Seed Default Categories
-- Date: 2026-08-16
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  image_url text,
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS
alter table public.categories enable row level security;

-- Public can read active categories
drop policy if exists "Categories are viewable by everyone" on public.categories;
create policy "Categories are viewable by everyone"
on public.categories for select
using (is_active = true or public.is_admin(auth.uid()));

-- Only admins can insert/update/delete categories
drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
on public.categories for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Insert seed data for the 10 core categories
insert into public.categories (name, slug, icon, image_url, description, display_order) values
('رستوران و کافه', 'restaurant-cafe', '☕️', '/images/categories/cat_restaurant.png', 'رستوران‌ها، کافه‌ها، کترینگ و شیرینی‌فروشی‌های ایرانی', 10),
('پزشک و کلینیک', 'medical-clinic', '🩺', '/images/categories/cat_medical.png', 'پزشک خانواده، دندانپزشک، روانشناس و خدمات سلامت', 20),
('وکیل و مهاجرت', 'legal-immigration', '⚖️', '/images/categories/cat_legal.png', 'وکیل دادگستری، مشاور رسمی مهاجرت و خدمات حقوقی', 30),
('املاک و وام', 'real-estate-mortgage', '🏠', '/images/categories/cat_realestate.png', 'مشاور املاک، متخصص وام مسکن و خدمات مسکن', 40),
('حسابداری و مالیات', 'accounting-tax', '📊', '/images/categories/cat_financial.png', 'حسابداری، مشاوره مالیاتی و خدمات بیمه و سرمایه‌گذاری', 50),
('زیبایی و سلامت', 'beauty-wellness', '✨', '/images/categories/cat_beauty.png', 'سالن زیبایی، آرایشگاه، اسپا و خدمات مراقبت شخصی', 60),
('فروشگاه ایرانی', 'iranian-grocery', '🛒', '/images/categories/cat_grocery.png', 'سوپرمارکت، قصابی، خشکبار و فروشگاه‌های تخصصی', 70),
('آموزش', 'education', '📚', '/images/categories/cat_education.png', 'تدریس خصوصی، آموزشگاه، مربیگری و خدمات آموزشی', 80),
('خدمات فنی', 'skilled-trades', '🔧', '/images/categories/cat_trades.png', 'برق‌کار، لوله‌کش، تعمیرات، تاسیسات و مکانیک', 90),
('رویدادها', 'events', '🎟️', '/images/categories/cat_events.png', 'برگزاری رویداد، کنسرت، سرگرمی و کلوب‌های فرهنگی', 100)
on conflict (slug) do update set 
  name = excluded.name,
  icon = excluded.icon,
  image_url = excluded.image_url,
  description = excluded.description;
