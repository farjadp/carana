# Security and accounts

The threat model, the rules that keep data private, and where every
credential lives (never the credential itself).

---

## Security

### The problem that shaped everything

Authorization lived in Next.js server actions rather than in the database. That
works for a web-only product. It stops working the moment a mobile client talks
to Supabase directly with the anon key — which is exactly what `apps/mobile`
does. Every check that lived only in a server action was, from that client's
point of view, not there at all.

The fix was to move every rule that matters into RLS, and treat the server
actions as a convenience layer that produces better error messages.

---

### What was found and closed

Each of these was verified against the live database after the fix, with a real
signed-in test user, not by reading the policy.

| Hole | What it allowed | Status |
|---|---|---|
| `handle_new_user()` trusted `desired_role` from client metadata | **Anyone could sign up as `admin`** | Closed |
| `profiles_update_self_or_admin` covered the whole row | A user could set their own `role` | Closed |
| `businesses_owner_update` covered every column | An owner could publish their own listing | Closed |
| `is_admin()` was not `SECURITY DEFINER` | It recursed against the profiles policies and returned false, **silently disabling every admin policy in the schema** | Closed |
| "Users can update own reviews" | A review author could set their review to `published` | Closed |
| `verification_codes` RLS `FOR ALL USING (auth.uid() = user_id)` | The user could read their own OTP, making verification meaningless | Closed |
| `businesses` storage bucket | Any authenticated user could write anywhere in it | Closed |
| `/api/admin/businesses/bulk-insert` | **No role check** — any signed-in user could insert PUBLISHED listings | Closed |
| `/api/admin/businesses/ai-categorize` | **No auth at all** — anyone on the internet could spend the OpenAI budget | Closed |
| `moderateReview()` | Carried a `// TODO: Verify Admin Status` in place of a check | Closed |
| Business detail page | Fell back to the service-role client, exposing DRAFT listings and verification fields | Closed |
| PostgREST `.or()` filters built by string interpolation | Filter injection from a URL parameter | Closed |
| `saveBusinessEditDraft` spread the whole client payload into `update()` | Mass assignment — `status: 'PUBLISHED'` in the body was applied | Closed |
| `scrapeWebsiteForBusiness` | SSRF: fetched any URL including localhost and cloud metadata | Closed |
| AI endpoints | No rate limit of any kind | Mitigated — see below |
| `SUPABASE_SECRET_KEY` hard-coded in four repo-root scripts | Full database access to anyone with the file | Key rotated and revoked; files deleted |

**The leaked service key was never committed.** `git log -S` across all
branches confirms it. The old key now returns 401.

---

### Verification results

Run against production with a throwaway account:

```
signup with desired_role=admin        → role became "user"        BLOCKED
PATCH own profiles.role = admin       → HTTP 403                  BLOCKED
INSERT business status=PUBLISHED      → HTTP 403                  BLOCKED
INSERT DRAFT then PATCH to PUBLISHED  → HTTP 403                  BLOCKED
PATCH own listing content only        → HTTP 200                  allowed (correct)
SELECT own verification code          → []                        BLOCKED
anon SELECT status != PUBLISHED       → 0 rows                    BLOCKED
PATCH a live listing via PostgREST    → 0 rows                    BLOCKED
INSERT a forged change-review row     → HTTP 403                  BLOCKED
service key in any browser bundle     → not present               clean
```

---

### The change-review system

Editing a **published** listing does not go straight live. Three layers:

1. **Deterministic rules.** Identity, location and trust fields always go to a
   human: name, name_en, category, sub_category, city, province, country,
   address, ownership_status, business_number, license_info, is_iranian_owned,
   verification_notes, logo_url, cover_url. No tokens spent.

2. **AI review.** Free text and outbound links — description, tagline, services,
   branches, website, social links — are checked for unsupported medical, legal
   or financial claims, fake credentials, mismatched or shortened domains,
   offensive content, and contact details planted to bypass the platform.

3. **Everything else publishes immediately.** Hours, phone, email, brand colour,
   postcode, languages, service type.

**It fails closed.** If OpenAI errors or is unreachable, the edit goes to a
human rather than being published unreviewed. This was tested by removing the
API key.

**The bypass is closed too.** RLS forbids an owner from updating a `PUBLISHED`
row at all, so the classifier cannot be skipped by calling PostgREST directly.
The edit goes through the server action, which proves ownership and then writes
with the service role.

Policy lives at the top of `packages/core/…` — no, precisely:
`apps/web/lib/moderation/change-review.ts`. The two `Set`s at the top **are**
the policy; changing them is a one-line change.

---

### Known remaining weaknesses

**Rate limiting is in-memory.** `apps/web/lib/utils/rate-limit.ts` resets on
deploy and is not shared between serverless instances. It stops accidental
hammering, not a determined attacker. Move it to Supabase or Upstash before the
AI features see real traffic. Currently 20/hour for generation, 10/hour for
scraping, per user.

**`verification_codes.code`** — the old plaintext column still exists alongside
`code_hash`. Nothing writes it. Drop it once you are sure no old codes are in
flight.

**`businesses.category` is free text**, not a foreign key to `categories`.
Nothing stops an invalid category slug.

**No tests.** Not one. Every claim in this document was verified by hand against
the live database, which does not protect against a future regression.

**`business_claims` and `business_memberships`** exist but the claim workflow
was never built. RLS uses `created_by` only.

---

## Accounts and credentials

**No secrets in this folder.** Variable names only.

### Where secrets live

| Location | Contents |
|---|---|
| `apps/web/.env.local` | all web secrets — gitignored |
| `apps/mobile/.env.local` | Expo public vars only — gitignored |
| Vercel → Settings → Environment Variables | production and preview |
| `~/Library/Application Support/com.vercel.cli/auth.json` | Vercel CLI token |

`.env.example` at the repo root documents every variable the app reads.

### Accounts

| Service | Account | State |
|---|---|---|
| GitHub | `farjadp/carana` | active, `main` up to date |
| Vercel | team `ashavidproject`, project `carana`, Pro | live |
| Supabase | project `flrpuzmqsqgrfutzoyop` | live |
| OpenAI | API key in env | active |
| Google Maps | key in env | **restrict by HTTP referrer** |
| expo.dev | organisation created | slug not yet wired into `app.json` |
| Apple Developer | — | blocked on D-U-N-S |
| Google Play | — | blocked on D-U-N-S |
| Domains | goplaza.ca (primary), charana.ca (308 → goplaza.ca), carana.ca | goplaza DNS + charana redirect: external action pending; carana DNS not pointed |

### Stripe (added 16 Aug 2026)

| Item | Value |
|---|---|
| Profile | display name **Charana**, handle `@charana` |
| Network ID | `profile_61VEWMEFjAxTJ5LqbA6VEWMDIsA82MjEvYYItmIgy2Fs` (public identifier, not a secret) |
| Mode | **sandbox only.** Test keys live in `apps/web/.env.local`; nothing is on Vercel yet |
| Profile address | 205 Parkview Crescent, Newmarket, ON L3Y 2C9 |
| Profile email | `farjad@visaroads.com` |

**Open question before a single charge is taken:** the Stripe account sits
under **Visa Roads**, while every legal surface of GOPLAZA — `lib/data/company.ts`,
the Terms, the Privacy page, the App Store plan and the Twilio account — names
**Ashavid Inc.** of Toronto. Whoever owns the Stripe account is the merchant of
record: their name appears on receipts and disputes, and their address is the
seller's address for tax. Either move the account under Ashavid Inc., or change
the legal entity on the site to match. Do not take money until these agree.

### Legal entity

**Ashavid Inc.**, Toronto, Ontario, Canada. GOPLAZA is one of its products.

The App Store seller name will be **Ashavid Inc.**, not GOPLAZA — normal, and
the app's own name is unaffected. Use the exact registered legal name and
address when applying for D-U-N-S; any mismatch means rejection and weeks lost.

Public contact addresses: `hello@`, `support@`, `privacy@`, `partners@`
`goplaza.ca`. Single source of truth in `apps/web/lib/data/company.ts` — legal
pages, footer and the future store listing all read from it.

### Security notes

**The Supabase service key was rotated on 2026-08-23.** The old key had been
hard-coded in four repo-root scripts; those are deleted and the key is revoked
and returns 401. It was never committed — `git log -S` across all branches
confirms it.

Rotating a Supabase key does **not** revoke the old one. You must delete it
explicitly, and propagation takes about 30 seconds.

**Never put `SUPABASE_SECRET_KEY` behind a `NEXT_PUBLIC_` prefix** or in
`next.config.ts`'s `env` block. Either would inline it into the browser bundle
on every page.

**`SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` must never be `true` in
production.** It creates pre-confirmed accounts through the admin API.
