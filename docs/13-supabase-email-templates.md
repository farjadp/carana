# Supabase auth email templates

Paste-ready replacements for the default Supabase auth emails, which arrive
in Persian users' inboxes as English text from "Supabase Auth" — anonymous,
unbranded, and (combined with the shared IP of the built-in sender) reliably
in the junk folder.

**Where:** Supabase dashboard → Authentication → **Email Templates**. Each
template below goes in its named tab. Set the subject line too — the subject
field is above the HTML editor.

These match the shell in `apps/web/lib/email/templates.ts`: cream ground,
maroon brand, `dir="rtl"` on the body (the attribute Outlook actually
honours), everything inline because mail clients strip `<style>`.

`{{ .ConfirmationURL }}` is Supabase's variable — leave it exactly as is.

Sender identity ("Supabase Auth" → čārana) is **not** set here; it comes from
the SMTP settings. See `12-integrations.md` and the SMTP mission in Notion.

---

## Confirm signup

**Subject:** `تایید ایمیل شما در چارانا`

```html
<div dir="rtl" style="margin:0;padding:0;background:#f6f1e8;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;color:#800000;">čārana</span>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;color:#14213d;font-size:15px;line-height:2;text-align:right;">
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">به چارانا خوش آمدید. برای فعال شدن حسابتان کافی است روی دکمه‌ی زیر بزنید:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#800000;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:bold;font-size:15px;">تایید ایمیل و ورود</a>
      </div>
      <p style="margin:0 0 10px;color:#5f6472;font-size:13px;">اگر دکمه کار نکرد، این نشانی را در مرورگر باز کنید:</p>
      <p style="margin:0 0 18px;font-size:12px;direction:ltr;text-align:left;word-break:break-all;"><a href="{{ .ConfirmationURL }}" style="color:#0047ab;">{{ .ConfirmationURL }}</a></p>
      <p style="margin:0;color:#5f6472;font-size:13px;">اگر شما در چارانا ثبت‌نام نکرده‌اید، این ایمیل را نادیده بگیرید — بدون این تایید هیچ حسابی فعال نمی‌شود.</p>
    </div>
    <div style="text-align:center;margin-top:20px;color:#5f6472;font-size:12px;line-height:1.9;">
      <div>چارانا — دایرکتوری کسب‌وکارهای ایرانی کانادا</div>
      <div style="margin-top:6px;">
        <a href="https://charana.ca/privacy" style="color:#5f6472;">حریم خصوصی</a> ·
        <a href="https://charana.ca/support" style="color:#5f6472;">پشتیبانی</a>
      </div>
    </div>
  </div>
</div>
```

---

## Reset password

**Subject:** `بازنشانی رمز عبور چارانا`

```html
<div dir="rtl" style="margin:0;padding:0;background:#f6f1e8;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:26px;font-weight:bold;color:#800000;">čārana</span>
    </div>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px;color:#14213d;font-size:15px;line-height:2;text-align:right;">
      <p style="margin:0 0 14px;">سلام،</p>
      <p style="margin:0 0 18px;">درخواست بازنشانی رمز عبور برای حساب شما ثبت شد. برای انتخاب رمز جدید روی دکمه‌ی زیر بزنید:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#800000;color:#ffffff;text-decoration:none;padding:13px 30px;border-radius:999px;font-weight:bold;font-size:15px;">انتخاب رمز جدید</a>
      </div>
      <p style="margin:0;color:#5f6472;font-size:13px;">اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید — رمز شما بدون این لینک تغییر نمی‌کند.</p>
    </div>
    <div style="text-align:center;margin-top:20px;color:#5f6472;font-size:12px;line-height:1.9;">
      <div>چارانا — دایرکتوری کسب‌وکارهای ایرانی کانادا</div>
      <div style="margin-top:6px;">
        <a href="https://charana.ca/privacy" style="color:#5f6472;">حریم خصوصی</a> ·
        <a href="https://charana.ca/support" style="color:#5f6472;">پشتیبانی</a>
      </div>
    </div>
  </div>
</div>
```

---

## Magic link — only if magic-link login is ever enabled

Same shell; headline «ورود به چارانا», button label «ورود», and the
"ignore this" line: «اگر شما درخواست ورود نداده‌اید، این ایمیل را نادیده
بگیرید.»

---

## The other half of the fix

Templates fix how the mail **looks**. Three more dashboard settings fix
everything else that was wrong with the screenshot from 14 August:

| Problem | Fix | Where |
| --- | --- | --- |
| Lands in junk | Custom SMTP through Resend (own domain, own reputation) | Project Settings → Auth → SMTP |
| Sender reads "Supabase Auth" | Sender name `čārana`, sender `noreply@charana.ca` | Same SMTP form |
| Link opens localhost | Site URL `https://charana.ca` | Auth → URL Configuration |
| App signups should reopen the app | Add `charana://**` to Redirect URLs | Auth → URL Configuration |

The app side is already done in code: mobile signup passes
`emailRedirectTo: "charana://auth/confirmed"`, and that screen greets the
person by name, hands them a session, and points them at their profile.
