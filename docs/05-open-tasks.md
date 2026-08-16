# Open tasks

**Updated:** 2026-08-16, end of the 15–16 Aug session.
The live board is Notion → 🧿 Charana → Mission Control; this is the narrative.

## Farjad — dashboard work, minutes each

**Stripe, before any real charge:**
- **Roll the live secret key** — it was pasted into a chat transcript on 16 Aug
- Settings → Tax → set the head office address (automatic tax fails without it)
- Settings → Billing → enable the Customer Portal
- Create the production webhook endpoint at `https://charana.ca/api/stripe/webhook`
  and put its signing secret in Vercel as `STRIPE_WEBHOOK_SECRET`
- Run `scripts/seed-stripe-plans.mts` against live (it refuses live keys by
  design — create the live products deliberately), then set the four
  `STRIPE_PRICE_*` variables on Vercel
- Confirm the account's legal entity: the sidebar reads "Charana / Visa Roads"
  while the site says Ashavid Inc. The account owner is the merchant of record

**Security and config:**
- Rotate the Twilio auth token (pasted into a transcript)
- Remove the unused `GEMINI_API_KEY` from Vercel
- Delete the personal Supabase token from the dashboard
- Change the two temporary admin passwords, then delete
  `apps/web/.admin-credentials.local.txt`
- Point `carana.ca` DNS at Vercel
- Enable the Maps Embed API on the Google key to bring the profile map back

**One click, highest leverage:**
- `/admin/cleanup/cities` → "apply all" sets 365 Toronto-area listings that
  currently have no city. Then work the ~44 rows that need a human.

**Needs a real device:**
- Test the voice suggestion box on an iPhone (the simulator has no microphone)

## Blocked on something external

- D-U-N-S for Ashavid Inc. → Apple Developer and Google Play organisations →
  App Store / TestFlight → store screenshots

## Code — next slices, in order

1. **APK 1.2.0.** It carries the blog, conversion events, the report sheet and
   the voice suggestion box. None of it reaches users until it ships.
2. **Blog E-E-A-T pass.** Two or three first-hand sentences per post that a
   model cannot invent. Farjad supplies; I fold in.
3. RLS and authorization regression tests.
4. Rate limiting to shared infrastructure — it is per-instance memory today, so
   it resets on every deploy and does not hold across regions.
5. Anti-scraping for the directory.
6. `businesses.category` is free text, not a foreign key; category labels have
   two sources of truth.
7. `notFound()` in the city routes returns 200 (pre-existing, cosmetic —
   the body is noindex).

Featured placement is now fully backed: city × category, `/cities/[slug]`,
`/search`, and (16 Aug) the home page's `homepage_slot` section all sort and
label it. The section on `/` only renders when a business actually holds an
active Featured plan — today that's nobody, so it's correctly invisible.

## Plans v2 backlog (16 Aug brainstorm, tracked in Notion Mission Control)

An audit found most of the old Pro plan's bullets were sold but not built.
Renamed Pro → استارتر (Starter), Featured → پریمیوم (Premium) — display
names only, `PlanId` unchanged (`lib/billing/plans.ts`). **Shipped:** tiered
gallery — free 3 photos, Starter 5 + 1 video, Premium unlimited, enforced
server-side (`e6071c5`). **Not built yet, in priority-ish order:**

1. Announcements — free 1/month, Starter 3/month, Premium unlimited (schema
   and UI both new).
2. Review replies (Starter) — one `owner_reply` column + a small form.
3. "Busy now / quiet now" live status toggle (Starter) — cheap, high-signal.
4. Vanity English URL, e.g. `charana.ca/b/dr-ahmadi` (Premium) — build this
   one English-slugged from day one regardless of item 8 below.
5. Personalized targeted search suggestion — e.g. an "Iranian restaurant"
   search surfaces a Premium business as a custom suggestion.
6. Real in-app booking calendar replacing the external `booking_url` link,
   with SMS lead notification (Premium) — reuses the existing Twilio
   integration.
7. Monthly AI-generated blog article per Premium business + backlink —
   reuses `lib/blog/generate.ts`, the engine already exists.
8. Suppress the "similar businesses nearby" block on a business's own
   profile (Premium) — right now every profile advertises its competitors.
9. QR / short link with UTM-style source tracking in owner insights
   (Premium) — reuses `business_events`.
10. Real multi-branch UI with a map (Premium) — the `branches` column exists
    on `businesses` already but has no UI, same class of gap as the earlier
    `is_featured` dead-code bug.
11. Mobile gallery parity — the web edit form has it, `apps/mobile` doesn't yet.

**Cross-cutting finding, not tied to a plan:** business profile and blog
post URLs are Persian-language slugs today (`packages/core/src/slug.ts`
deliberately keeps the Persian/Arabic Unicode range) — this contradicts a
new standing rule ("all URLs must be English"). Affects ~680 indexed
business URLs and every blog post URL; fixing it site-wide needs 301
redirects to keep the SEO built up over the last few weeks. Bigger and
separate from item 4 above, which should just be English from the start.
