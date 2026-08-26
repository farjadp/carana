// ============================================================================
// Source: packages/core/src/auth-errors.ts
// Version: 1.1.0 — 2026-08-26
// Why: Supabase Auth returns terse English messages ("email rate limit
//      exceeded", "Invalid login credentials"). Persian users deserve a
//      sentence that says what happened and what to do. One map, used by the
//      web auth form and the mobile auth screens.
// Env / Identity: Pure.
// ============================================================================

const RULES: [RegExp, string][] = [
  [/rate limit|too many requests|over_email_send_rate_limit/i,
    "تعداد ایمیل‌های ارسال‌شده به این نشانی زیاد بوده است. صندوق ورودی و پوشه‌ی هرزنامه را ببینید؛ لینک قبلی هنوز معتبر است. اگر لازم شد، یک ساعت دیگر دوباره تلاش کنید."],
  [/invalid login credentials|invalid_credentials/i, "ایمیل یا رمز عبور درست نیست."],
  [/email not confirmed/i, "ایمیل شما هنوز تایید نشده است. لینک تایید را در صندوق ورودی (یا هرزنامه) پیدا کنید."],
  [/user already registered|already been registered|already exists/i, "با این ایمیل قبلاً حسابی ساخته شده است. وارد شوید یا رمز را بازیابی کنید."],
  [/password should be at least|password.*too short|weak_password/i, "رمز عبور باید حداقل ۶ حرف باشد."],
  [/same_password|new password should be different/i, "رمز جدید باید با رمز قبلی متفاوت باشد."],
  [/otp_expired|token has expired|link is invalid|invalid.*token|expired/i, "این لینک منقضی یا استفاده شده است. دوباره درخواست بازیابی بدهید."],
  [/user not found/i, "حسابی با این ایمیل پیدا نشد."],
  [/invalid email|unable to validate email|is invalid/i, "نشانی ایمیل معتبر نیست."],
  // Before the generic signup rule below: this is what signInWithOtp() with
  // shouldCreateUser:false returns for an address that has no account. It is
  // not "signups are disabled" — signup is open, this email just is not one.
  [/signups? not allowed for otp/i,
    "حسابی با این ایمیل وجود ندارد. اول ثبت‌نام کن، بعد لینک ورود برایت فرستاده می‌شود."],
  [/signups? not allowed|signup is disabled/i, "ثبت‌نام در حال حاضر غیرفعال است."],
  // The provider is off in the Supabase dashboard. The button is meant to be
  // hidden in that case (lib/auth/providers.ts) — if this message is ever
  // seen, the settings probe and the dashboard disagree.
  [/unsupported provider|provider is not enabled/i,
    "ورود با گوگل روی این حساب فعال نیست. با ایمیل و رمز وارد شو."],
  [/network|fetch failed|failed to fetch|timeout/i, "ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید."],
];

/** Map any Supabase Auth error (or unknown error) to a Persian sentence. */
export function authErrorMessage(err: unknown, fallback = "خطایی رخ داد. دوباره تلاش کنید."): string {
  const raw =
    typeof err === "string" ? err
    : err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message)
    : "";
  for (const [re, fa] of RULES) if (re.test(raw)) return fa;
  return fallback;
}
