// ============================================================================
// Source: lib/data/releases.ts
// Version: 1.0.0 — 2026-08-15
// Why: One source of truth for "where do I get the app" and "what changed".
//      The download page, the releases page and the home app section all read
//      this. Store URLs are empty until the listings exist — the UI must say
//      "coming" rather than link nowhere. The APK is served from EAS, not
//      from public/ (107 MB does not belong in git or a Vercel deploy).
// Env / Identity: Public information only.
// ============================================================================

export const APP_VERSION = "1.2.0";

export const STORES = {
  /** Fill when the App Store listing is live (blocked on the paid Apple account / D-U-N-S). */
  appStore: "",
  /** Fill when the Play listing is live. */
  playStore: "",
  /** Direct APK — Android only, sideload. Latest preview build from EAS. */
  apkDirect: "https://expo.dev/artifacts/eas/SH-Fh00zi3xLZu862JVY2QsFli-L0LHBvFkj2Mv33mo.apk",
  apkVersion: "1.2.0",
  apkSizeMb: 110,
  apkBuiltAt: "2026-08-16",
  /** iOS TestFlight invite — empty until the Apple organisation account exists. */
  testFlight: "",
} as const;

export type Release = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  platforms: ("web" | "ios" | "android")[];
};

/** Newest first. Keep in step with git tags / EAS builds. */
export const RELEASES: Release[] = [
  {
    version: "1.2.0",
    date: "2026-08-16",
    title: "اعلان‌ها، وضعیت زنده، وبلاگ و ساعت تهران",
    highlights: [
      "اعلان‌های کسب‌وکارها: در صفحه‌ی اول، روی پروفایل، و «باخبرم کن» برای دنبال کردن",
      "وضعیت زنده‌ی «الان شلوغیم / خلوته» روی کارت‌ها و پروفایل",
      "وبلاگ چارانا داخل اپ",
      "دکمه‌ی گزارش مشکل و جعبه‌ی پیشنهاد صوتی",
      "ساعت تهران با تاریخ شمسی و شاهنشاهی، و نرخ روز دلار، یورو و دلار کانادا",
    ],
    platforms: ["ios", "android"],
  },
  {
    version: "1.1.0",
    date: "2026-08-15",
    title: "ثبت کسب‌وکار در اپ، پروفایل جدید",
    highlights: [
      "ثبت کسب‌وکار داخل اپ — با تایید ایمیل و موبایل و «بخوان از سایتم»",
      "پروفایل کسب‌وکار از نو طراحی شد: کاور، نشان احراز، «باز است»، ساعات، خدمات، شعب",
      "ویرایش پروفایل کاربر داخل اپ",
      "پیام‌های خطای فارسی برای ورود و ثبت‌نام",
    ],
    platforms: ["web", "ios", "android"],
  },
  {
    version: "1.0.0",
    date: "2026-08-14",
    title: "اولین نسخه‌ی عمومی",
    highlights: [
      "هویت برند Hidden Č در وب و اپ",
      "۶۷۷ کسب‌وکار در ۱۲ دسته و ۲۴ شهر",
      "احراز مالکیت با پیامک، اعتبار شش‌ماهه",
      "ذخیره، یادداشت خصوصی و نظر عمومی",
      "اولین APK اندروید",
    ],
    platforms: ["web", "ios", "android"],
  },
];

/**
 * The public roadmap. `done` is a claim about real state, so it is audited
 * rather than edited by feel — on 18 Aug three items were still listed as
 * pending months after they shipped (search, the owner dashboard and the
 * report button), which is the same class of untruth as a badge nothing
 * backs, pointing the other way.
 */
export const ROADMAP: { when: string; items: { title: string; body: string; done?: boolean }[] }[] = [
  {
    when: "همین حالا",
    items: [
      { title: "ایمیل و یادآور آگهی استخدام", body: "نتیجه‌ی بررسی به آگهی‌دهنده، و یادآوری سه روز مانده به انقضا.", done: false },
      { title: "پاکسازی شهرها", body: "لیستینگ‌های بدون شهر روی نقشه‌ی شهر خودشان.", done: false },
      { title: "انتشار در استورها", body: "App Store و Google Play — پشت ثبت سازمانی Ashavid.", done: false },
    ],
  },
  {
    when: "بعدی",
    items: [
      { title: "مدیریت کسب‌وکار از داخل اپ", body: "ویرایش، آمار، اعلان و ثبت آگهی استخدام — که فعلاً فقط در سایت هستند.", done: false },
      { title: "آپلود تصویر از اپ", body: "لوگو و کاور مستقیم از گوشی.", done: false },
      { title: "اعلان با پیامک و پوش نوتیفیکیشن", body: "فعلاً فقط ایمیل و داخل پنل.", done: false },
    ],
  },
  {
    when: "انجام شده",
    items: [
      { title: "تابلوی فرصت‌های شغلی", body: "آگهی استخدام کسب‌وکارها روی وب و اپ — رایگان، با تاریخ انقضای واقعی.", done: true },
      { title: "جستجوی واقعی", body: "جستجوی فارسی‌آگاه در نام، خدمات و توضیحات — و بخشنده نسبت به کیبورد اشتباه.", done: true },
      { title: "داشبورد مالک", body: "بازدید، تماس، مسیر و واتساپ — از هر دو سطح وب و اپ.", done: true },
      { title: "گزارش خطای اطلاعات", body: "یک کلیک، یک صف برای ادمین، یک پاسخ.", done: true },
      { title: "احراز مالکیت با پیامک", body: "کد به شماره‌ی روی پروفایل؛ اعتبار شش‌ماهه با یادآور تمدید.", done: true },
      { title: "ثبت کسب‌وکار با هوش مصنوعی", body: "آدرس سایت بده، فرم پر می‌شود؛ تو مرور و تایید می‌کنی.", done: true },
      { title: "اپ موبایل", body: "iOS و Android با هویت برند؛ اولین APK.", done: true },
    ],
  },
];
