// ============================================================================
// Source: lib/validations/business.ts
// Version: 2.0.0 — 2026-08-13
// Why: Zod schemas for the full 7-step business onboarding with all required fields.
// Env / Identity: Universal (Client/Server)
// ============================================================================
import * as z from "zod";

// پیام‌های خطای استاندارد فارسی
const requiredError = "پر کردن این فیلد الزامی است.";
const urlError = "آدرس اینترنتی معتبر نیست. (باید با https:// شروع شود)";
const emailError = "آدرس ایمیل معتبر نیست.";

// ============================================================================
// مرحله ۱: اطلاعات پایه کسب‌وکار
// ============================================================================
export const step1Schema = z.object({
  name: z.string().min(2, "نام کسب‌وکار باید حداقل ۲ حرف باشد.").max(100),
  name_en: z.string().max(100).optional(),
  category: z.string().min(1, requiredError),
  sub_category: z.string().max(100).optional(),
  short_description: z.string()
    .min(10, "توضیح کوتاه باید حداقل ۱۰ حرف باشد.")
    .max(120, "حداکثر ۱۲۰ کاراکتر مجاز است."),
  description: z.string()
    .min(50, "توضیح کامل باید جامع‌تر باشد (حداقل ۵۰ حرف).")
    .max(2000),
  established_year: z.string()
    .regex(/^\d{4}$/, "سال باید ۴ رقمی باشد (مثلاً 2020)")
    .optional()
    .or(z.literal("")),
  ownership_status: z.enum(["owner", "representative"]),
  // لیست سرویس‌ها، محصولات و تعرفه‌ها (JSONB آرایه)
  services: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.string().optional(),
    price_unit: z.string().optional(), // مثلاً: ساعت، جلسه، ماه، نفر
    price_note: z.string().optional(), // یادداشت آزاد برای قیمت
  })).optional(),
});

// ============================================================================
// مرحله ۲: موقعیت جغرافیایی، آدرس شعب، لینک گوگل مپ
// ============================================================================
export const step2Schema = z.object({
  country: z.string().default("Canada"),
  province: z.string().min(1, requiredError),
  city: z.string().min(1, requiredError),
  address: z.string().min(5, requiredError).max(250),
  postal_code: z.string().max(20).optional(),
  is_address_public: z.boolean().default(true),
  service_type: z.enum(["in_person", "online", "both"]),
  // محدوده سرویس‌دهی: شهر، استان، سراسر کانادا، بین‌المللی
  service_area: z.enum(["city", "province", "canada", "international"]),
  // لینک گوگل مپ (برای نمایش نقشه تعبیه‌شده)
  google_maps_url: z.string().url(urlError).optional().or(z.literal("")),
  // شعبه‌های اضافه‌تر (JSONB آرایه)
  branches: z.array(z.object({
    name: z.string().optional(), // نام شعبه، مثلاً: شعبه مرکزی
    address: z.string().min(3, "آدرس شعبه را وارد کنید."),
    city: z.string().optional(),
    phone: z.string().optional(),
  })).optional(),
});

// ============================================================================
// مرحله ۳: راه‌های ارتباطی و شبکه‌های اجتماعی
// (توجه: google_maps_url به مرحله ۲ منتقل شد)
// ============================================================================
export const step3Schema = z.object({
  phone: z.string().min(10, "شماره تماس باید حداقل ۱۰ رقم باشد.").max(20),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  contact_email: z.string().email(emailError).optional().or(z.literal("")),
  website: z.string().url(urlError).optional().or(z.literal("")),
  instagram: z.string().url(urlError).optional().or(z.literal("")),
  telegram: z.string().url(urlError).optional().or(z.literal("")),
  linkedin: z.string().url(urlError).optional().or(z.literal("")),
  // روش تماس ترجیحی
  preferred_contact: z.enum(["phone", "whatsapp", "email"]).optional(),
});

// ============================================================================
// مرحله ۴: جزئیات اعتماد، اعتبار و تایید هویت
// ⚠️ این اطلاعات محرمانه است و در نمایش عمومی منتشر نخواهد شد
// ============================================================================
export const step4Schema = z.object({
  // شماره ثبت شرکت – اختیاری، فقط برای راستی‌آزمایی ادمین
  business_number: z.string().max(50).optional(),
  // لایسنس یا مجوز حرفه‌ای
  license_info: z.string().max(200).optional(),
  // زبان‌های ارائه خدمات
  languages: z.array(z.string()).min(1, "حداقل یک زبان انتخاب کنید."),
  // آیا کسب‌وکار ایرانی-کانادایی است؟
  is_iranian_owned: z.boolean().default(true),
  // توضیح برای تایید مالکیت
  verification_notes: z.string().max(500).optional(),
});

// ============================================================================
// مرحله ۵: رسانه و هویت بصری
// ============================================================================
export const step5Schema = z.object({
  logo_url: z.string().optional().or(z.literal("")),
  cover_url: z.string().optional().or(z.literal("")),
  // رنگ برند (اختیاری، فرمت hex)
  brand_color: z.string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "کد رنگ نامعتبر است.")
    .optional()
    .or(z.literal("")),
  tagline: z.string().max(100).optional(),
});

// ============================================================================
// مرحله ۶: ساعات کاری و دسترسی
// ============================================================================
export const step6Schema = z.object({
  // ساعات کاری هر روز – فرمت JSONB
  working_hours: z.any().optional(),
  accepts_appointments: z.boolean().default(false),
  booking_url: z.string().url(urlError).optional().or(z.literal("")),
});

// ============================================================================
// Schema یکپارچه برای ارسال نهایی (Merge همه مراحل)
// ============================================================================
export const finalBusinessSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,
  ...step5Schema.shape,
  ...step6Schema.shape,
});

export type BusinessFormData = z.infer<typeof finalBusinessSchema>;

// تایپ سرویس برای استفاده در UI
export type ServiceItem = {
  name: string;
  description?: string;
  price?: string;
  price_unit?: string;
  price_note?: string;
};

// تایپ شعبه برای استفاده در UI
export type BranchItem = {
  name?: string;
  address: string;
  city?: string;
  phone?: string;
};
