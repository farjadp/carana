# Open tasks

**The operational board is Notion, not this file.** Mission Control on the
🧿 Charana page carries ~50 missions with per-task instructions, owners
(`Hands`: Farjad / Claude / Both), status and a Done log. This file is the
compressed summary for a cold start; when they disagree, Notion is fresher.

Board: https://app.notion.com/p/3bc370c6d6248007ba12da832b4ee80a

---

## One Supabase dashboard session — minutes, unblocks real signups

The first real phone signup (14 Aug) surfaced the whole auth-email chain:
junk folder, "Supabase Auth" sender, English template, link opening
localhost. Four dashboard settings fix all of it; the app-side code is done.

1. **SMTP through Resend** — Project Settings → Auth → SMTP. Host
   `smtp.resend.com`, port 465, username literally `resend`, password = the
   Resend API key, sender `noreply@charana.ca`, sender name `čārana`.
2. **Templates** — Auth → Email Templates. Paste-ready RTL HTML with subjects
   in `13-supabase-email-templates.md`.
3. **URL configuration** — Site URL `https://charana.ca`; Redirect URLs
   `https://charana.ca/**`, `https://www.charana.ca/**`,
   `https://carana-*.vercel.app/**`, and **`charana://**`** (the app — mobile
   signup redirects confirmation to `charana://auth/confirmed`, a welcome
   screen that signs the person in).
4. **While there:** check `SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING`
   in Vercel Production. If `"true"`, signup bypasses email verification
   entirely. Keep it Preview-only.

Then verify with a throwaway signup: inbox not junk, from čārana, Persian,
link opens the app.

## Other Farjad-side items, each minutes

- **`CRON_SECRET` on Vercel Production** — until set, the verification-renewal
  reminder cron refuses to run (by design).
- **Delete `GEMINI_API_KEY`** from Vercel *and revoke at Google*. Nothing
  reads it.
- **carana.ca does not resolve** — GoDaddy already delegates to Vercel's
  nameservers but no zone exists there (they answer REFUSED). Create the zone
  on Vercel, or take delegation back and set `A 76.76.21.21`.
- **Rotate the Twilio primary auth token** — it was pasted into a chat on
  14 Aug. The app uses API keys, not the token, so nothing breaks.
- **Twilio balance was $16.55** — top up before real verification volume.
- **D-U-N-S for Ashavid Inc.** — the single blocker under the whole store
  path. Check first at developer.apple.com/enroll/duns-lookup; it may exist.
- **End-to-end claim test** — now unblocked (Twilio live): claim an imported
  listing whose number you can answer, confirm the SMS and badge.

---

## Code, in priority order

**Search does not exist — the only open P0.** The hero search box is a prop:
no action, no handler, no `/search` route. The product's primary action does
nothing. Needs Persian-aware full-text (fold ی/ي, ک/ك, Persian digits),
URL-addressable results, and logging of zero-result queries from day one —
that list is users naming the missing supply. The home-page hero is blocked
on this.

**The report button still lies.** `handleReport` shows "sent to support" and
does nothing; `/admin/reports` is a static empty state with a hardcoded badge
of ۲. Build `business_reports` + queue (reuse the `moderateReview` pattern),
or remove the button.

**Conversion events.** Profile views now count (`view_count` via
`increment_business_view`), but call / WhatsApp / website / directions taps
are still bare anchors. `business_events` table per the Notion mission —
prerequisite for the owner analytics dashboard, which is the revenue surface.

**Then:** RLS regression tests (everything in `02-security.md` is verified by
hand only) · shared rate limiting (in-memory now) · service blueprints for
the remaining 7 core journeys · mobile: review submission, My Notes list,
in-app profile edit.

## Decisions waiting on Farjad

- Do edits to a published listing need re-review? (field lists in
  `lib/moderation/change-review.ts` are the whole policy)
- Should mobile ever carry the owner dashboard? (Apple 15–30% question —
  decide before store accounts arrive)
- Featured/ads pricing surface — nothing built; sell only after
  `business_events` can prove value.

## Known data debt

409 listings without a city · `businesses.category` is free text, no FK ·
two sources of truth for category labels · `ai@7` vs `@ai-sdk/openai@4` ·
four ESLint errors in recorder hooks · `globals.css` ~2.5k lines.
