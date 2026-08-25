# The quiet-profile upsell — what a paid profile does not show, and the journey out of it

**Written:** 2026-08-24 · **Doc version:** 1.0 · **Code:** `packages/core/src/plans.ts`,
`apps/web/components/business/profile-upsell-banner.tsx`,
`apps/web/app/businesses/[slug]/page.tsx`

---

## The idea in one line

Everything we sell so far adds something to a profile. This adds *absence*:
the paid tiers take the other businesses off the bottom of your own page, and
the space they leave says why it is empty and who to talk to about it.

## What each tier removes

| | rival listings under the profile | article block under the profile |
|---|---|---|
| رایگان / استارتر | shown | shown |
| **پریمیوم** (`clean_profile`) | **removed** | shown |
| **پلاتینیوم** (`exclusive_profile`) | **removed** | **removed** |

Both entitlements are declared in `plans.ts` and read through
`entitlementsFor`, never from `businesses.plan` — an expired paid period must
stop hiding competitors the moment it lapses, even if the Stripe webhook is
late.

Platinum's line is the **first confirmed exclusive** it has ever had. Until
today its bullet list said only "the full list is coming"; it now names one
real thing.

## The honesty constraint that shaped the copy

**Premium has no seat cap. Platinum has 21, nationwide** (`PLATINUM_SEAT_CAP`).
Farjad's brief said "I think the number was limited" — it is, but on the tier
above the one he named. So the banner never says "limited" as a property of
Premium. The one scarcity sentence on the page names Platinum, reads the
number from the plan module, and changes its ending depending on which tier
the reader is standing on:

- on a Premium profile: «پلاتینیوم فقط ۲۱ جایگاه در کل کاناداست؛ پریمیوم سقف تعداد ندارد.»
- on a Platinum profile: «… — یکی از آن‌ها همین کسب‌وکار است.»

The banner is also only ever rendered when something really was removed, so it
cannot claim a plan the row does not hold. And the owner of the listing sees a
version with no buy button; selling Premium to the person who already bought
it is the same unbacked sentence pointing the other way.

---

## The journey

### 0. Who is actually reading this

Not the owner of the profile. The reader is another **business owner** who
arrived at a competitor's page — from Google, from a category list, or from a
WhatsApp link — and scrolled to the end expecting the usual "businesses like
this" strip. It is not there. That is the moment the product is sold in: they
came to look at a rival and found out the rival bought silence.

This is why the banner sits where the rivals used to be and nowhere else. On a
free profile the same space keeps doing its job — sending the visitor deeper
into the directory.

### 1. Notice — the empty space explains itself

An unexplained empty page bottom reads as a bug. The banner turns it into a
statement: *this business is Premium, and that is why you are not being shown
anyone else.* Named business, named tier, one sentence of consequence.

**Success looks like:** the reader understands the absence is bought, not broken.

### 2. Want — the pitch is the thing they just experienced

No feature list here. The proof is the page they are standing on: they wanted
to browse competitors and could not. The primary button is written from the
reader's side — «کسب‌وکار من هم همین را می‌خواهد» — not «خرید پلن».

Second button, «مقایسه‌ی پلن‌ها» → `/pricing#plans`, for the reader who wants
the table before the pitch.

### 3. Compare — `/pricing`

They land on the pricing page with one feature already understood, which is
more than a cold visitor has. The plan cards carry the new bullets:

- پریمیوم: «پایین پروفایلت هیچ کسب‌وکار دیگری نشان داده نمی‌شود»
- پلاتینیوم: «پایین پروفایلت هیچ‌چیز نیست — نه کسب‌وکار دیگری، نه مقاله. فقط خودت»

The Platinum seat cap does its work here, honestly: quarterly billing only,
21 seats, and checkout refuses when they are gone.

### 4. Qualify — the gate we already have

Checkout requires a listing they own. A reader with no listing has to register
one first (free, and verification is free), which is the funnel we want
anyway: the upsell recruits supply even when it does not convert to revenue.

### 5. Buy — Stripe checkout

Existing flow. Platinum additionally checks the seat cap at checkout
(`api/stripe/checkout/route.ts`).

### 6. See it work — the first minute after paying

This is the step most likely to disappoint, and the one to build next. The
moment the webhook lands, their own profile changes: rivals disappear from the
bottom of it. **Nothing currently tells them that.** They have to visit their
own public page and notice.

### 7. Keep it — lapse behaves correctly

When the paid period ends, `entitlementsFor` returns `free` and the rival
listings come back on the next render. That is correct and deliberate: unlike
`owner_privacy` (which stays honoured after a lapse because what would revert
is a person's name), this is a placement, and placements revert.

---

## Open, in order

1. **Confirmation after purchase.** Step 6 has no moment. The receipt email
   should say, in one line, what changed on their page and link straight to it.
2. **Nobody holds a paid plan yet.** All 10,680 listings are `free`, so this
   banner renders nowhere in production today. That is correct, not broken —
   but it also means the copy has never been read by a stranger.
3. **The SEO cost of Platinum, measured rather than assumed.** `exclusive_profile`
   removes three internal links to the blog from that profile. On 21 pages out
   of ~10,000 this is noise, but if the tier ever grows, re-check.
4. **Mobile has no version of this, in either direction.** Checked: the native
   profile screen (`apps/mobile/src/app/business/[slug].tsx`) renders neither a
   similar-businesses block nor an article block, so there is nothing there for
   a paid plan to remove — and equally, no place for the upsell moment to
   happen. A reader who meets a Premium profile in the app learns nothing about
   why. Worth a decision: either mobile gains both sections (and the gating
   with them), or the banner alone.
