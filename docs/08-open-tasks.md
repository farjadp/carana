# Open tasks

**Updated:** 2026-08-15 (late night). The operational board is Notion → 🧿 Charana
→ Mission Control; this file is the readable snapshot for a cold session.
Every task below also exists there with owner, priority and instructions.

---

## Farjad-side, each minutes

- **Change the two passwords and delete the credentials file.**
  `apps/web/.admin-credentials.local.txt` (git-ignored) holds temporary
  passwords for `farjad@ashavid.ca` (admin) and `its@farjadp.com` (personal,
  owner of the three showcase listings). Log in, change, delete the file.
- **Retire `admin@charana.ca`** once you are in as the new admin (tell Claude).
- **Rotate the exposed Twilio auth token** and **delete `GEMINI_API_KEY`**
  from Vercel (revoke at Google). P0 since 14 Aug.
- **`CRON_SECRET` on Vercel Production** — the renewal-reminder cron refuses
  to run without it.
- **Point carana.ca DNS to Vercel** (misspelled domain → 308).
- **Enable Maps Embed API** on the Google key → the profile map iframe can
  come back (two-line restore, marked in `business-profile-client.tsx`).
- **Delete the Supabase personal access token** `sbp_fcb5…` at
  supabase.com/dashboard/account/tokens — it was pasted in chat on 15 Aug and
  used for the auth config; already removed from `.env.local`.
- **D-U-N-S → Apple + Google organisation accounts** (external; blocks
  TestFlight, App Store, Play, `APPLE_TEAM_ID`).
- **Decide:** re-review on edits to published listings? Tiers for paid
  packages? Offer for early-stage businesses? (three Notion decisions).

## Code — next slices, in order

0. **Verify mobile voice on a real iPhone** and then **build APK 1.2.0**
   (expo-audio is a new native module — the 1.1.0 APK cannot record). Then
   admin sidebar badges "۵"/"۲" → live counts (Notion mission exists).

1. **Report button tells a falsehood** (P0, small): either a
   `business_reports` table + admin queue, or remove the button. The toast
   was already deleted from the profile; the button in older surfaces may
   remain — grep for it.
2. **Instrument the conversion moment** (P1): count call / WhatsApp /
   directions / website taps per business per day (`business_events`).
   Unblocks the owner analytics dashboard.
3. **Onboarding draft duplication** (P2, web only): `saveBusinessDraft`
   fires before the first `businessId` returns → several DRAFT rows per
   session. Mobile awaits and does not have the bug.
4. **Missing-city cleanup queue** (P1): 409 imported rows have no city.
5. **Search follow-ups**: admin view of `search_queries` zero-result
   queries; search by ref number; suggestions/autocomplete; category
   synonyms table (کافه ↔ رستوران is one category today).
6. **Big backlog ideas** (all in Notion with notes): anti-scraping, subdomain
   per business, paid packages, AI assistant, business announcements, user
   wall, "why is there no X in Newmarket" requests, early-stage support,
   jobs board.

## Housekeeping

- Test user `charana-onboarding-test@charana.ca` (verified email + phone,
  no listings) exists for exercising flows; keep or delete.
- Four pre-existing ESLint errors (recorder hooks, use-color-scheme) are
  untouched — their own Notion mission.
- `docs/13-supabase-email-templates.md` is now historical: the templates are
  applied on the project. Keep as the source if they ever need re-pasting.
