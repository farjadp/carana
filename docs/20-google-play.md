# Google Play — listing, forms, release

Everything the Play Console asks for on the first GOPLAZA release, with the
answer and the code it was derived from. Written 8 Oct 2026 against `main` +
PR #6 (Android 1.5.0, versionCode 7). **If the app gains a feature that
touches data, the Data safety section below is wrong until it is updated.**

Developer account: AshaVid organisation, ID `7669166066468425161`. An
organisation account is exempt from the 12-testers / 14-days closed-test rule,
so the first release can go straight to Production.

---

## 1. Release (Test and release → Production)

- **App bundle:** the `.aab` from EAS build `f91cccdd` (production profile,
  versionCode 7). First upload must be by hand in the Console; `eas submit`
  works only from the second release on.
- **Play App Signing:** let Google generate the app signing key. The EAS
  keystore becomes the upload key. Consequence: anyone who sideloaded the
  1.5.0 APK from `/download` must uninstall once before installing from Play.
- **Release name:** `1.5.0 (7)`
- **Release notes** (`<fa-IR>`):

```
نخستین نسخه‌ی پلازا در گوگل‌پلی.
جست‌وجوی فارسی در کسب‌وکارهای ایرانیان کانادا، بر اساس دسته و شهر.
تماس، واتس‌اپ و مسیریابی با یک لمس.
ذخیره‌ی کسب‌وکارها و یادداشت خصوصی برای خودتان.
حذف حساب از داخل اپ.
```

---

## 2. Main store listing (Grow users → Store presence → Main store listing)

Default language: **Persian – fa-IR**.

**App name** (30 max — 7 used):
```
GOPLAZA
```

Alternative if the name alone looks bare in search (25 chars):
```
GOPLAZA - کسب‌وکار ایرانی
```

**Short description** (80 max — 68 used):
```
دایرکتوری فارسی کسب‌وکارهای ایرانیان کانادا؛ پیدا کنید، تماس بگیرید.
```

**Full description** (4,000 max):
```
پلازا دایرکتوری فارسی‌زبان کسب‌وکارهای ایرانیان در کاناداست. دنبال دندان‌پزشک، وکیل مهاجرت، مشاور املاک، رستوران یا تعمیرکار ایرانی در شهر خودتان هستید؟ اینجا بیش از ۹٬۰۰۰ کسب‌وکار را به فارسی جست‌وجو کنید و با یک لمس تماس بگیرید.

جست‌وجویی که فارسی را می‌فهمد
جست‌وجو با نام فارسی یا انگلیسی کار می‌کند و اگر با کیبورد اشتباه تایپ کنید هم نتیجه را پیدا می‌کند. می‌توانید با دسته‌بندی، استان یا شهر نتیجه‌ها را محدود کنید.

همه‌ی اطلاعات تماس در یک صفحه
برای هر کسب‌وکار، شماره تلفن، واتس‌اپ، آدرس و مسیریابی، ساعات کاری، خدمات و شعبه‌ها در یک صفحه آمده است. نظرهای منتشرشده‌ی کاربران و میانگین امتیاز را هم همان‌جا می‌بینید.

فهرست شخصی خودتان
با یک حساب رایگان کسب‌وکارها را ذخیره کنید، برایشان یادداشت و امتیاز خصوصی بنویسید که فقط خودتان می‌بینید، و با «باخبرم کن» از اطلاعیه‌های تازه‌شان با ایمیل باخبر شوید.

مقاله‌ها و آگهی‌های شغلی
مقاله‌های کاربردی درباره‌ی زندگی و کار در کانادا را در اپ می‌خوانید. کسب‌وکارهای عضو می‌توانند آگهی استخدام هم منتشر کنند.

کسب‌وکار دارید؟
کسب‌وکارتان را از داخل اپ ثبت کنید تا ایرانیان شهرتان پیدایتان کنند.

چند نکته
• بخشی از کسب‌وکارها از منابع عمومی گردآوری شده‌اند. اگر اطلاعاتی نادرست است، از دکمه‌ی «گزارش مشکل» در همان صفحه خبرمان کنید.
• برخی کسب‌وکارها با برچسب «ویژه» نمایش داده می‌شوند؛ این جایگاه تبلیغاتی پولی است.
• اپ رایگان است و خرید درون‌برنامه‌ای ندارد.
• حسابتان را هر وقت بخواهید از داخل اپ حذف کنید.

پلازا محصول Ashavid Inc. در انتاریو است.
وب‌سایت: goplaza.ca
```

**Category:** Travel & Local. (Business is for tools a business uses; this is
a consumer directory, which Play files under Travel & Local.)
**Tags:** Local business directory · Business directory
**Contact email:** `its@farjadp.com` (`company.email.support`) · **Website:**
`https://goplaza.ca` · **Privacy policy:** `https://goplaza.ca/privacy`

### Graphics

| Asset | Spec | File |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | `play-store/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPG, no alpha | `play-store/feature-graphic.png` |
| Phone screenshots | 2–8, 9:16, 320–3840 px | `play-store/screenshots/` |

Tablet screenshots are not needed: Play only asks for them if the app
declares tablet support in the listing, and we do not.

---

## 3. App content (Policy → App content)

| Form | Answer | Why |
|---|---|---|
| Privacy policy | `https://goplaza.ca/privacy` | Already names the mobile app (§2) |
| Ads | **Yes, contains ads** | «ویژه» listings and the 89% featured boost are paid placement. Play counts sponsored listings as ads. Saying "no" would be the house honesty rule broken in a government form |
| App access | **All or some functionality is restricted** → give a reviewer account | Saving, notes, «باخبرم کن» and business registration need sign-in. Farjad creates the account (email + password) and pastes it here; Claude does not create production accounts |
| Content rating | See §4 | |
| Target audience | **18 and over** only | Privacy §18 says not designed for under 16; choosing 18+ also keeps the app out of the Families policy |
| News app | No | The blog is guides, not news |
| Health apps | None | |
| Financial features | None | No payments in the app; plans are sold on the web |
| Government app | No | |
| Data safety | See §5 | |
| Account deletion | In-app: «حذف حساب» in the account tab. Web: `https://goplaza.ca/account/delete` | Same code path (`/api/mobile/account/delete`) |
| Foreground service permissions | Should not be asked | PR #6 removed the playback service. If Play asks, the AAB is from before PR #6 — rebuild |
| Advertising ID | **No** | No ad SDK, no `AD_ID` permission in the manifest |

---

## 4. Content rating questionnaire (IARC)

- Category: **All Other App Types** (not a game, not social/communication —
  users cannot message each other)
- Violence, sexuality, language, controlled substances, gambling: **No** to all
- Does the app let users interact or exchange content? **Yes** — published
  reviews by users are visible (writing is web-only, reading is in the app);
  moderated before publication
- Shares user's current location with others? **No** (no location permission)
- Allows purchases of digital goods? **No**
- Unrestricted internet / web browser? **No** (links leave the app via the
  system handler: dialler, WhatsApp, maps, browser)

Expected result: Everyone / PEGI 3, possibly with a "Users Interact" note.

---

## 5. Data safety

Derived from `apps/mobile/src` on 8 Oct. Manifest permissions after PR #6:
`INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `VIBRATE`. No analytics
SDK, no crash reporter, no ad SDK, no location.

**Overview questions**
- Does your app collect or share any of the required user data types? **Yes**
- Is all user data encrypted in transit? **Yes** (HTTPS to Supabase and goplaza.ca only)
- Do you provide a way for users to request deletion? **Yes** (in-app + URL above)

**Shared with third parties: nothing.** Supabase, Vercel, OpenAI (smart-search
query expansion) and Resend act as service providers on our behalf, which Play
excludes from "sharing". A listing the owner publishes is a user-initiated
public disclosure, also excluded.

| Data type (Play name) | Collected | Required? | Purposes | Source in code |
|---|---|---|---|---|
| Personal info → Name | Yes | Optional | Account management, App functionality | `auth/signup.tsx` (`full_name`), `account/edit.tsx` |
| Personal info → Email address | Yes | Optional | Account management, App functionality | `auth/signup.tsx`, `auth/login.tsx` |
| Personal info → Phone number | Yes | Optional | Account management, Fraud prevention/security | `account/edit.tsx` (`mobile_number`), `register/verify.tsx` |
| Personal info → User IDs | Yes | Optional | Account management | Supabase auth user id |
| Personal info → Address | Yes | Optional | App functionality | `register/form.tsx` — business address, owner's choice to show |
| Audio → Voice or sound recordings | Yes | Optional | App functionality | `suggestion-box.tsx` — voice suggestion, sent only on tap |
| App activity → App interactions | Yes | Required | Analytics | `lib/analytics.ts` — business id + event type (call, whatsapp, …), no user id |
| App activity → In-app search history | Yes | Required | App functionality | Smart search sends the query to `/api/mobile/search/smart`; the expansion is cached by query, not by user |
| App activity → Other user-generated content | Yes | Optional | App functionality | Private notes and ratings, reports (`report-sheet.tsx`), text suggestions, business listings |

Not collected: location, contacts, photos/videos, files, calendar, health,
financial info, messages, web history, device or other IDs, crash logs,
diagnostics.

"Optional" means the app works without it: browsing and search need no
account. App interactions and search are marked required because they happen
whenever the feature is used and cannot be switched off in the app.

---

## 6. What only Farjad can do

1. Upload the `.aab` and choose Google-generated signing (§1)
2. Create the reviewer account and paste it into App access (§3)
3. Answer the forms (§3–§5) — they are answered as a declaration by the developer
4. **Android developer verification** in the account sidebar: register
   `ca.charana.app` if it is asking for it
5. After the first release: add the **app signing key** SHA-256 (Setup → App
   signing) to `ANDROID_SHA256_FINGERPRINT` in Vercel so
   `/.well-known/assetlinks.json` verifies — the upload key's fingerprint is
   the wrong one once Play re-signs
