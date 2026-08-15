# Feature inventory

**Written:** 2026-08-15 (night). Enumerated from the route tree, server actions,
API routes and mobile screens — not from memory. Legend: ✅ built and live ·
🟡 built, partial or gated · ⚪ page exists, no real backend yet.

---

## 1. Visitor / end-user

### Discovery — web
| Feature | State | Where |
|---|---|---|
| Home: brand hero, live counters (listings · verified · cities · categories), real search box, category photo grid, newest, most-visited, city photo tiles, APK button | ✅ | `/` |
| Search — ranked, Persian-aware (`fa_normalize`), wrong-keyboard forgiving (`keyboard_swap`), city aliases, filters city/category/verified-only, every query logged (`search_queries`) | ✅ | `/search`, header field, hero |
| Browse by category (12, photographed) | ✅ | `/categories`, `/categories/[slug]` |
| Browse by city / province | ✅ | `/cities`, `/cities/[slug]`, `/provinces`, `/provinces/[slug]` |
| All businesses, paginated | ✅ | `/businesses` |
| Business profile: cover (owner's or category photograph), verified badge (computed from `verified_until` + contact match), open-now from `working_hours`, five-digit reference number, action row (call · WhatsApp · directions · website · booking), services + prices, hours table, branches, languages, contact channels (email/Instagram/Telegram/LinkedIn), established year, service type/area, share, breadcrumbs, view counter | ✅ | `/businesses/[slug]` |
| Map embed on profile | 🟡 disabled until Maps Embed API is enabled (two-line restore) | same |
| Public reviews (rating + text) shown after moderation | ✅ | profile |
| SEO: sitemap, per-listing metadata, Persian slugs indexed | ✅ | `sitemap.xml` |
| Public pages: about, team, roadmap, releases, download (APK 1.1.0), how-it-works, trust, support, contact (form → email), story, architecture, privacy, terms, disclaimer | ✅ | header groups شهرها / راهنما / درباره ما + footer legal |
| Header: three grouped menus, search field, sign-in, one CTA; mobile drawer | ✅ | `header-nav.tsx` |

### Account — web
| Feature | State |
|---|---|
| Sign up / sign in / forgot / update password, branded Persian auth mail via Resend | ✅ |
| Persian-digit-safe credential fields (`latin` prop) | ✅ |
| Profile page: account info, role, quick access to notebook / business panel / admin | ✅ |
| Edit profile (name, phone), password reset from profile | ✅ |
| Delete own account | ✅ `/account/delete` |
| **Notebook** ("برای خودتان"): mark a business *saved / want-to-go / visited / customer*, private note with title, photo / voice / video attachments | ✅ `interaction-bar`, `interaction-modal`, `media-upload-section` |
| My interactions list (saved, notes, reviews) | ✅ `/profile/interactions` |
| Write a public review (rating + one-line + text) → moderation queue | ✅ |
| Report a listing | ⚪ button was a fake toast; removed from profile — **P0 open** |
| **Suggestion box** — "چی کم داریم؟" typed or voice, no sign-in needed; on home, /support and the zero-result search | ✅ (15 Aug night) `suggestion-box.tsx`, `/api/suggestions` |

### Mobile app (Expo, iOS + Android APK)
| Feature | State |
|---|---|
| Home v4: time-of-day greeting, real search input + quick chips, category photo shelf, "open now" rail (only when true), "verified" rail (only real badges), newest, city photo tiles + chips, owner card | ✅ (15 Aug night) |
| Tabs: home · categories · location · search · account | ✅ |
| Search tab — same RPC as web, category chips, `?q=` deep link | ✅ |
| Category / city / province listings | ✅ |
| Business profile — parity with web (cover, badge, open-now, actions, services, hours, branches, reviews) | ✅ |
| Auth: sign in / up / forgot / confirmed deep link (`charana://`) | ✅ |
| Account edit (name, phone) | ✅ |
| Business registration: verify email + phone → optional website import (AI) → 7-step form → review → submit | ✅ |
| Save/notes/reviews in app | ⚪ not yet (Notion: "My Notes list", "finish mobile review submission") |
| Suggestion box on home + search empty (text ✅ verified; voice via expo-audio — verify on a real phone; needs APK 1.2.0) | 🟡 |
| Store presence | 🟡 APK direct download live; App Store / Play blocked on D-U-N-S |

---

## 2. Business owner

| Feature | State | Where |
|---|---|---|
| Register a business (web): 7 steps — identity, contact, location, details, services, hours/booking, media → review → submit; autosaves draft | ✅ (draft-duplication bug P2) | `/dashboard/business/new` |
| "Read it from my website" — AI import pre-fills the form from a URL | ✅ web + mobile | `/api/ai/generate`, `/api/mobile/business/import` |
| Verify contact points (email + phone OTP) before/while registering | ✅ | `/dashboard/verify-contact`, `/api/mobile/verify/*` |
| Owner panel: my businesses, status (pending / needs changes / published), profile-completion %, last update | ✅ | `/dashboard/business` |
| Edit a published/pending listing, resubmit for review | ✅ | `/dashboard/business/[id]/edit` |
| In-app (mobile) profile edit | ✅ | `account/edit`, register flow |
| **Claim an existing listing**: find-your-business search → 3-step SMS proof → ownership | ✅ | `/claim`, `/claim?businessId=` |
| Verify own self-onboarded listing (SMS to the listed number) | ✅ | `verifyOwnListing` |
| Verified badge with expiry (6 months), voids if the proven phone/email changes | ✅ | `lib/verification/status.ts` |
| Renewal: banner on profile, `startRenewal`, reminder cron | 🟡 cron blocked on `CRON_SECRET` | `/api/cron/verification-reminders` |
| Owner-only "ویرایش پروفایل" chip on public page | ✅ | profile |
| Booking link surfaced as an action when `accepts_appointments` | ✅ | profile |
| Owner analytics (calls / WhatsApp / directions / website taps) | ⚪ blocked on `business_events` (P1 next) | — |
| Paid packages / tiers, announcements, subdomain, jobs board | ⚪ backlog | Notion |

---

## 3. Admin

| Feature | State | Where |
|---|---|---|
| Admin login (role from `profiles`, `is_admin()` SECURITY DEFINER) | ✅ | `/admin/login` |
| Dashboard overview | ✅ | `/admin` |
| Listings: list, open one, change status (draft → pending → approved / published / rejected / needs-changes), delete | ✅ | `/admin/listings`, `[id]` |
| Bulk import from spreadsheet + AI categorisation | ✅ | `/admin/listings/import`, `/api/admin/businesses/bulk-insert`, `ai-categorize` |
| Categories CRUD (name, icon, photo, order, active) | ✅ | `/admin/categories` |
| Review moderation (approve / reject public reviews) | ✅ | `/admin/reviews`, `moderateReview` |
| Users: list, view, change role, delete | ✅ | `/admin/users`, `[id]` |
| Activity log (last 100 events: sign-in, sign-up, profile edits, …) | ✅ | `/admin/logs`, `logUserActivity` |
| Claims queue | 🟡 page queries the table; the flow itself is automatic (SMS proof), so the queue is mostly empty by design | `/admin/claims` |
| **Suggestions inbox** — filter new/read/done, play voice (signed URL), internal note | ✅ | `/admin/suggestions` |
| Reports (abuse) | ⚪ placeholder page — no table, no data | `/admin/reports` |
| System settings | ⚪ placeholder page | `/admin/settings` |
| Sidebar badges "۵" claims / "۲" reports | ❌ **hard-coded numbers** — an honesty violation of the same class as the old verified chip; should be live counts or removed | `sidebar-nav.tsx` |
| Search-demand view (zero-result queries from `search_queries`) | ⚪ not yet (search follow-up) | — |

---

## 4. Platform / infrastructure (for completeness)

- Supabase Postgres + RLS, explicit public column lists (`PRIVATE_BUSINESS_COLUMNS`), `search_businesses` RPC, `city_aliases`, `search_queries`, `ref_no` unique five-digit.
- Auth mail via Resend SMTP; SMS via Twilio (Canadian A2P pending).
- Vercel (web), EAS (mobile), Android app links via `assetlinks.json`; iOS associated domains gated on `APPLE_TEAM_ID`.
- Photography pipeline: OpenAI image scripts for categories/cities with locked art direction.
- Docs 00–13 + Notion Mission Control as the operational board.
