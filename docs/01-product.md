# Product, features and design

What GOPLAZA is, everything it can do today per audience, and the visual
system that holds it together.

---

## Feature inventory

**Written:** 2026-08-15 (night). Enumerated from the route tree, server actions,
API routes and mobile screens — not from memory. Legend: ✅ built and live ·
🟡 built, partial or gated · ⚪ page exists, no real backend yet.

---

### 1. Visitor / end-user

#### Discovery — web
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

#### Account — web
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

#### Mobile app (Expo, iOS + Android APK)
| Feature | State |
|---|---|
| Home v4: time-of-day greeting, real search input + quick chips, category photo shelf, "open now" rail (only when true), "verified" rail (only real badges), newest, city photo tiles + chips, owner card | ✅ (15 Aug night) |
| Tabs: home · categories · location · search · account | ✅ |
| Search tab — same RPC as web, category chips, `?q=` deep link | ✅ |
| Category / city / province listings | ✅ |
| Business profile — parity with web (cover, badge, open-now, actions, services, hours, branches, reviews) | ✅ |
| Auth: sign in / up / forgot / confirmed deep link (`goplaza://`, `charana://` kept for old installs) | ✅ |
| Account edit (name, phone) | ✅ |
| Business registration: verify email + phone → optional website import (AI) → 7-step form → review → submit | ✅ |
| Save/notes/reviews in app | ⚪ not yet (Notion: "My Notes list", "finish mobile review submission") |
| Suggestion box on home + search empty (text ✅ verified; voice via expo-audio — verify on a real phone; needs APK 1.2.0) | 🟡 |
| Store presence | 🟡 APK direct download live; App Store / Play blocked on D-U-N-S |

---

### 2. Business owner

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

### 3. Admin

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

### 4. Platform / infrastructure (for completeness)

- Supabase Postgres + RLS, explicit public column lists (`PRIVATE_BUSINESS_COLUMNS`), `search_businesses` RPC, `city_aliases`, `search_queries`, `ref_no` unique five-digit.
- Auth mail via Resend SMTP; SMS via Twilio (Canadian A2P pending).
- Vercel (web), EAS (mobile), Android app links via `assetlinks.json`; iOS associated domains gated on `APPLE_TEAM_ID`.
- Photography pipeline: OpenAI image scripts for categories/cities with locked art direction.
- Docs 00–13 + Notion Mission Control as the operational board.

---

## Design and brand

### Palette

| Token | Hex | Use |
|---|---|---|
| `--annabi` عنابی | `#800000` | primary accent, CTAs, active states |
| `--lajvard` لاجورد | `#0047AB` | secondary accent, links |
| `--text` | `#14213D` | body text, deep navy |
| `--muted-text` | `#5F6472` | secondary text |
| `--bg` | `#F6F1E8` | page background, cream |
| `--line` | `rgba(20,33,61,0.10)` | borders |

Mirrored in `apps/mobile/src/theme.ts`.

### Visual language

Pre-Islamic Persian, deliberately. The distinction matters and was got wrong
once already.

**Use:** the Achaemenid stepped merlon from the Persepolis parapets, the
twelve-petal Persepolis lotus, boteh jegheh (the paisley of Persian carpets),
the cypress, Achaemenid column geometry.

**Do not use:** pointed Islamic arches, eight-pointed shamseh stars, domes,
minarets, Arabic calligraphy, lanterns, or any generic "oriental" motif.

The first attempt at the category art used a pointed arch and an eight-pointed
star and read as Islamic rather than Iranian. It was rejected and redrawn.

### Category artwork

12 SVGs in `apps/web/public/images/categories/`, one per category slug, plus
`business-placeholder.svg`.

Shared system: Achaemenid stepped merlon frame, boteh in the corners, a minimal
glyph inside. Pomegranate for grocery, cypress for wellness, daf for events.

**These are adequate, not good.** They were hand-coded as SVG path data, which
works for geometry and poorly for illustration. If a designer is ever engaged,
this is the second thing to hand them.

A comparison of three cleaner directions was built and is worth revisiting:
Lucide icons on a cream tile, Lucide icons reversed on solid brand colour, and
a purely typographic treatment with no pictogram at all. The solid-colour
option read strongest at small sizes.

### App icon and splash

`apps/mobile/assets/images/` — `icon.png`, `splash-icon.png`, the three Android
adaptive layers, `favicon.png`. Generated from
`scratchpad/gen-app-icon.mjs`, rasterised through a browser canvas since no
rasteriser is installed.

Two details that are easy to get wrong and are correct here: the iOS icon is
**not** pre-rounded, because the system masks it and a rounded source gets
masked twice; the Android mark sits inside the adaptive safe zone so the
circular crop does not clip it.

### The logo — still needs doing

The current mark is a placeholder `č`. It is not a logo.

**This is the one piece worth paying a designer for.** It is permanent brand
identity, it sits next to competitors in the App Store, and changing it after
launch is expensive. Below is a brief ready to hand to a designer or paste into
an image model.

---

#### Brief

**Brand:** GOPLAZA (گوپلازا) — Persian-language directory of Iranian businesses
in Canada
**Company:** Ashavid Inc., Toronto
**Audience:** Iranians in Canada looking for a Persian-speaking lawyer, doctor,
restaurant, realtor

**It must convey:** trust and verification (every listing is reviewed before
publication — this is the differentiator); Iranian roots with a Canadian home,
without nostalgia or cliché; finding, not selling.

**Visual language:** as above — pre-Islamic Persian, never generic oriental.

**Colour:** `#800000`, `#0047AB`, `#14213D`, `#F6F1E8`.

**Technical:** legible at 16px; works in one colour; app icon in a square with
no rounded corners of its own; generous negative space; sits beside both
"گوپلازا" and "GOPLAZA".

#### Prompts for an image model

**1 — Geometric abstract**
```
Minimal geometric logo mark for a Persian business directory. Abstract symbol
derived from the stepped merlon crenellation of Persepolis, simplified to three
clean stepped forms suggesting both a rooftop and an upward path. Flat vector,
single weight, deep maroon #800000 on cream #F6F1E8. Generous negative space,
no gradients, no text, no Islamic arches or eight-pointed stars. Legible at 16
pixels. Centered on white, isolated logo mark.
```

**2 — Lotus**
```
Minimal flat vector logo: a twelve-petal Achaemenid lotus rosette from
Persepolis reliefs, radically simplified to six petals, geometric and perfectly
symmetrical, drawn with a single consistent stroke weight. Deep maroon and lapis
blue on cream. Modern tech-brand simplicity, not ornamental. No text. Isolated
on white.
```

**3 — Boteh (recommended)**
```
Modern minimal logo mark based on the boteh jegheh paisley of Persian carpets,
reduced to one confident closed curve with a curled tip. Geometric construction,
single stroke weight, deep maroon #800000. Reads as both a leaf and a location
pin. Flat vector, no gradient, no text, no ornament. Must work at 16 pixels and
in one colour. Isolated on white background.
```

**4 — Cypress**
```
Minimalist logo mark of a Persian cypress tree, the ancient Iranian tree of
life, abstracted into a single tapering geometric form with a subtle
characteristic bend at the top. Flat vector, deep maroon on cream, one solid
shape, generous negative space, no branches or texture, no text. Modern
identity design for a technology company. Isolated on white.
```

**Try 3 first.** It is the only one that is unmistakably Iranian, simple enough
to survive 16px, and can carry a second reading of "place" — which is what the
product does.

### Web CSS

`apps/web/app/globals.css`, ~2,700 lines. Hand-written classes alongside
Tailwind 4. It works but it is long and would benefit from being split by
concern. Sections added recently are commented with their date and purpose.

---

## Logo master pack

Approved direction: **Concept 1 — The Hidden Č**

### Files
- `goplaza-symbol.svg` — primary vector mark, #7A1831 (provisional geometry
  traced from the 2026-08-18 brand board; replace with the master when supplied)
- `goplaza-symbol-black.svg` — one-colour black
- `goplaza-symbol-white.svg` — reversed white
- `goplaza-app-icon.svg` — cream mark on burgundy tile
- `goplaza-favicon.svg` — tighter padding for 16–32px
- `goplaza-logo-horizontal.svg` — mark + GOPLAZA wordmark + tagline
- All rasters (favicons, touch icons, Expo icon/splash/adaptive) are generated
  by `scripts/generate-brand-assets.mjs` — never hand-edit a PNG

### Brand colours
- Annabi / Primary: `#800000`
- Lajvard / Secondary: `#0047AB`
- Deep Navy / Text: `#14213D`
- Cream / Background: `#F6F1E8`
- Gold / Optional accent: `#C9A24B`

### Production notes
SVG is the source-of-truth format for product and design teams. It imports cleanly into
Figma, Adobe Illustrator, Sketch, Affinity Designer and modern web/mobile workflows.

The horizontal wordmark intentionally remains editable text. Before sending artwork to a
printer, the designer should choose the final licensed brand typeface and convert the
wordmark to outlines.

Do not auto-trace the earlier AI concept PNG. This pack is a clean vector reconstruction
so the team can refine geometry without raster artefacts.
