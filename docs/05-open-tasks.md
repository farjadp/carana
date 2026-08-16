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
