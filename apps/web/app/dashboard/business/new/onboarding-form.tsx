// ============================================================================
// Source: app/dashboard/business/new/onboarding-form.tsx
// Version: 3.0.0 — 2026-08-15
// Why: Comprehensive 7-step business registration form for the GOPLAZA platform.
// Features: RTL, auto-save draft, file upload, working hours, full social links.
// v3: optional "step zero" — read the owner's website with AI and prefill the
//     form; every step then shows which of its fields came from the site and
//     which need a second look. The owner reviews and confirms everything.
// Env / Identity: Client Component
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller, useWatch } from "react-hook-form";
import { useCompletion } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, Save,
  Phone, Globe, Hash, MessageCircle, Mail, MapPin, Send, Link2, Clock,
  ShieldCheck, Building2, Camera, CalendarDays, Info,
  PlusCircle, Trash2, DollarSign, Store, Sparkles, AlertTriangle
} from "lucide-react";

import {
  step1Schema, step2Schema, step3Schema,
  step4Schema, step5Schema, step6Schema,
  finalBusinessSchema, BusinessFormData,
  type ServiceItem, type BranchItem
} from "@goplaza/core";
import { saveBusinessDraft, submitBusiness } from "./actions";
import { WebsiteImport } from "./website-import";
import type { ScrapedBusiness } from "../ai-actions";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";

// ============================================================================
// ثوابت و کانفیگ
// ============================================================================

const STEPS = [
  { id: 1, title: "اطلاعات پایه",   icon: Building2,    schema: step1Schema },
  { id: 2, title: "موقعیت",          icon: MapPin,        schema: step2Schema },
  { id: 3, title: "ارتباطات",        icon: Phone,         schema: step3Schema },
  { id: 4, title: "اعتبار",          icon: ShieldCheck,   schema: step4Schema },
  { id: 5, title: "رسانه",           icon: Camera,        schema: step5Schema },
  { id: 6, title: "ساعات کاری",     icon: Clock,         schema: step6Schema },
  { id: 7, title: "بازبینی",         icon: CheckCircle2,  schema: finalBusinessSchema as any },
];

// دسته‌بندی‌های اصلی کسب‌وکار بصورت پروپ ارسال می‌شوند

/** Which form fields belong to which step — drives the "from your site" banner. */
const STEP_FIELDS: Record<number, string[]> = {
  1: ["name", "name_en", "category", "sub_category", "short_description", "description", "established_year", "services"],
  2: ["province", "city", "address", "postal_code", "google_maps_url"],
  3: ["phone", "whatsapp", "contact_email", "website", "instagram", "telegram", "linkedin"],
  4: ["languages"],
  5: ["logo_url", "tagline"],
  6: ["working_hours", "accepts_appointments", "booking_url"],
};
const FIELD_FA: Record<string, string> = {
  name: "نام", name_en: "نام انگلیسی", category: "دسته‌بندی", sub_category: "زیردسته",
  short_description: "توضیح کوتاه", description: "توضیح کامل", established_year: "سال شروع",
  services: "خدمات", province: "استان", city: "شهر", address: "آدرس", postal_code: "کد پستی",
  google_maps_url: "نقشه", phone: "تلفن", whatsapp: "واتساپ", contact_email: "ایمیل",
  website: "وب‌سایت", instagram: "اینستاگرام", telegram: "تلگرام", linkedin: "لینکدین",
  languages: "زبان‌ها", logo_url: "لوگو", tagline: "شعار", working_hours: "ساعات کاری",
  accepts_appointments: "نوبت‌دهی", booking_url: "لینک رزرو",
};

// استان‌های کانادا
const PROVINCES = [
  { value: "ON", label: "انتاریو (Ontario)" },
  { value: "BC", label: "بریتیش کلمبیا (BC)" },
  { value: "QC", label: "کبک (Quebec)" },
  { value: "AB", label: "آلبرتا (Alberta)" },
  { value: "MB", label: "مانیتوبا (Manitoba)" },
  { value: "SK", label: "ساسکاچوان (Saskatchewan)" },
  { value: "NS", label: "نوا اسکوشیا (Nova Scotia)" },
  { value: "NB", label: "نیو برانزویک (New Brunswick)" },
  { value: "NL", label: "نیوفاندلند (Newfoundland)" },
  { value: "PE", label: "جزیره پرنس ادوارد (PEI)" },
];

// روزهای هفته برای ساعات کاری
const DAYS_OF_WEEK = [
  { key: "monday",    label: "دوشنبه" },
  { key: "tuesday",   label: "سه‌شنبه" },
  { key: "wednesday", label: "چهارشنبه" },
  { key: "thursday",  label: "پنجشنبه" },
  { key: "friday",    label: "جمعه" },
  { key: "saturday",  label: "شنبه" },
  { key: "sunday",    label: "یکشنبه" },
];

// زبان‌های خدمات‌دهی
const LANGUAGES = ["فارسی", "انگلیسی", "فرانسوی", "عربی", "ترکی", "سایر"];

// کلاس استایل مشترک برای select elements
const selectClass = "flex h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--lajvard)] focus:border-transparent transition";

// ============================================================================
// کامپوننت فرم – اصلی
// ============================================================================
export default function BusinessOnboardingForm({
  initialCategories = [],
  defaultCategory = "",
}: {
  initialCategories?: { value: string; label: string }[];
  defaultCategory?: string;
}) {
  const router = useRouter();

  // Step 0 is the optional website import; the seven real steps start at 1.
  const [currentStep, setCurrentStep] = useState(0);
  /** Fields the AI import filled, and which of them it marked low-confidence. */
  const [imported, setImported] = useState<{ fields: Set<string>; review: Set<string> } | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessId, setBusinessId] = useState<string | undefined>(undefined);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // سرویس‌های کسب‌وکار (لیست پویا)
  const [services, setServices] = useState<ServiceItem[]>([]);
  // آدرس شعبه‌های اضافی
  const [branches, setBranches] = useState<BranchItem[]>([]);

  // مقادیر پیش‌فرض برای همه فیلدهای فرم
  const methods = useForm<BusinessFormData>({
    resolver: zodResolver(STEPS[Math.max(currentStep, 1) - 1].schema),
    mode: "onTouched",
    defaultValues: {
      name: "", name_en: "", category: defaultCategory || "", sub_category: "", short_description: "",
      description: "", established_year: "", ownership_status: "owner",
      country: "Canada", province: "", city: "", address: "", postal_code: "",
      is_address_public: true, service_type: "both", service_area: "city",
      google_maps_url: "",
      phone: "", whatsapp: "", contact_email: "", website: "", instagram: "",
      telegram: "", linkedin: "", preferred_contact: "phone",
      business_number: "", license_info: "", languages: ["فارسی"],
      is_iranian_owned: true, verification_notes: "",
      logo_url: "", cover_url: "", brand_color: "", tagline: "",
      working_hours: {}, accepts_appointments: false, booking_url: "",
      services: [],
      branches: [],
    },
  });

  const { handleSubmit, trigger, getValues, setValue, watch, formState: { errors } } = methods;

  // ============================================================================
  // AI Description Generation
  // ============================================================================
  const { complete, completion, isLoading: isGeneratingAI } = useCompletion({
    api: "/api/ai/generate",
    body: { type: "business_description" },
    onFinish: (prompt: string, result: string) => {
      setValue("description", result, { shouldValidate: true });
    },
    onError: (err: Error) => {
      alert("خطا در تولید محتوای هوشمند: " + err.message);
    }
  });

  // ============================================================================
  // Website import → prefill
  // ============================================================================
  const applyImport = (d: ScrapedBusiness) => {
    const filled = new Set<string>();
    const put = (key: keyof BusinessFormData, value: unknown) => {
      if (value === undefined || value === null || value === "") return;
      setValue(key, value as never, { shouldDirty: true });
      filled.add(key);
    };
    put("name", d.name); put("name_en", d.name_en); put("tagline", d.tagline);
    put("short_description", d.short_description); put("description", d.description);
    put("sub_category", d.sub_category); put("established_year", d.established_year);
    if (d.category_slug && initialCategories.some((c) => c.value === d.category_slug)) {
      put("category", d.category_slug);
    }
    put("phone", d.phone); put("whatsapp", d.whatsapp); put("contact_email", d.contact_email);
    put("website", d.website); put("instagram", d.instagram); put("telegram", d.telegram);
    put("linkedin", d.linkedin); put("google_maps_url", d.google_maps_url);
    put("address", d.address); put("city", d.city); put("province", d.province);
    put("postal_code", d.postal_code);
    if (d.languages?.length) put("languages", d.languages);
    put("logo_url", d.logo_url);
    if (d.working_hours && Object.keys(d.working_hours).length) put("working_hours", d.working_hours);
    if (typeof d.accepts_appointments === "boolean") put("accepts_appointments", d.accepts_appointments);
    put("booking_url", d.booking_url);
    if (d.services?.length) {
      const items = d.services.map((s) => ({ ...s, price_note: "" }));
      setServices(items);
      setValue("services", items as never, { shouldDirty: true });
      filled.add("services");
    }
    // The model reports keys by its own names; map the one that differs.
    const review = new Set((d.confidence?.low ?? []).map((k) => (k === "category_slug" ? "category" : k)));
    setImported({ fields: filled, review });
    setCurrentStep(1);
  };

  // ============================================================================
  // منطق ناوبری مراحل
  // ============================================================================

  /** رفتن به مرحله بعد با اعتبارسنجی مرحله فعلی */
  const handleNext = async () => {
    const isStepValid = await trigger();
    if (isStepValid && currentStep < 7) {
      setCurrentStep((prev) => prev + 1);
      // ذخیره خودکار پیش‌نویس بدون نمایش پیام
      handleSaveDraft(false);
    }
  };

  /** بازگشت به مرحله قبل */
  const handlePrev = () => {
    // From step 1, "back" returns to the website-import offer.
    if (currentStep >= 1) setCurrentStep((prev) => prev - 1);
  };

  /** رفتن مستقیم به یک مرحله مشخص از طریق استپر */
  const goToStep = (stepId: number) => {
    if (stepId < currentStep) setCurrentStep(stepId);
  };

  // ============================================================================
  // منطق ذخیره‌سازی
  // ============================================================================

  /** ذخیره پیش‌نویس در سرور */
  const handleSaveDraft = async (showFeedback = true) => {
    if (showFeedback) setIsSavingDraft(true);
    const data = getValues();
    const result = await saveBusinessDraft(data, businessId);

    if (result.success && result.businessId) {
      setBusinessId(result.businessId);
      if (showFeedback) {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2500);
      }
    }
    if (showFeedback) setIsSavingDraft(false);
  };

  /** ارسال نهایی فرم برای بررسی ادمین */
  const onSubmitFinal = async (data: any) => {
    setIsSubmitting(true);
    const result = await submitBusiness(data, businessId);
    if (result.success) {
      setSubmissionSuccess(true);
    } else {
      alert("خطا در ارسال: " + result.error);
    }
    setIsSubmitting(false);
  };

  // ============================================================================
  // صفحه موفقیت‌آمیز ارسال
  // ============================================================================
  if (submissionSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-8 bg-white border border-[color:var(--line)] rounded-2xl shadow-sm text-center">
          {/* آیکون تایید */}
          <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-teal-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 size={48} />
          </div>

          <h2 className="text-2xl font-black mb-3">اطلاعات کسب‌وکار دریافت شد! 🎉</h2>

          <p className="text-[color:var(--muted-text)] mb-6 leading-loose text-sm">
            پروفایل کسب‌وکار شما با موفقیت به عنوان <strong className="text-blue-700">«ارسال شده برای بررسی»</strong> ثبت شد.
            تیم كارشناسان گوپلازا اطلاعات را بررسی کرده و پس از تایید، کسب‌وکار شما در دایرکتوری عمومی
            منتشر خواهد شد. این فرآیند معمولاً ۲ تا ۵ روز کاری زمان می‌برد.
          </p>

          {/* نمایش وضعیت‌های ممکن */}
          <div className="grid grid-cols-3 gap-3 mb-8 text-xs">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-blue-800">
              <div className="font-bold mb-1">ارسال شده</div>
              <div className="text-blue-600">در صف بررسی</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-500">
              <div className="font-bold mb-1">تایید شده</div>
              <div>پس از بررسی</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-500">
              <div className="font-bold mb-1">منتشر شده</div>
              <div>قابل مشاهده عمومی</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push("/dashboard/business")}
              className="bg-[color:var(--lajvard)] text-white"
            >
              مشاهده کسب‌وکارهای من
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              بازگشت به داشبورد
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // مرحله‌ی صفر: خواندن از وب‌سایت (اختیاری)
  // ============================================================================
  if (currentStep === 0) {
    return (
      <div className="max-w-3xl mx-auto" dir="rtl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-[color:var(--text)]">ثبت کسب‌وکار جدید</h1>
          <p className="text-sm text-[color:var(--muted-text)] mt-1">قبل از شروع</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[color:var(--line)] p-6 md:p-8">
          <WebsiteImport
            categories={initialCategories}
            onApply={applyImport}
            onSkip={() => setCurrentStep(1)}
          />
        </div>
      </div>
    );
  }

  // ============================================================================
  // رندر اصلی فرم
  // ============================================================================
  const stepImported = imported ? STEP_FIELDS[currentStep]?.filter((f) => imported.fields.has(f)) ?? [] : [];
  const stepReview = imported ? stepImported.filter((f) => imported.review.has(f)) : [];

  return (
    <div className="max-w-3xl mx-auto" dir="rtl">

      {/* Header – عنوان و دکمه ذخیره پیش‌نویس */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">ثبت کسب‌وکار جدید</h1>
          <p className="text-sm text-[color:var(--muted-text)] mt-1">
            مرحله {currentStep} از ۷
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSaveDraft(true)}
          disabled={isSavingDraft}
          className={`gap-2 text-xs border transition-all ${draftSaved ? "border-green-400 text-green-700 bg-green-50" : "border-[color:var(--line)]"}`}
        >
          {isSavingDraft
            ? <Loader2 size={14} className="animate-spin" />
            : draftSaved
              ? <CheckCircle2 size={14} />
              : <Save size={14} />
          }
          {draftSaved ? "ذخیره شد!" : "ذخیره پیش‌نویس"}
        </Button>
      </div>

      {/* Progress Bar – نوار پیشرفت بصری */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-[color:var(--lajvard)] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
        />
      </div>

      {/* Stepper – نمایش مراحل */}
      <div className="flex items-start w-full mb-8 overflow-x-auto pb-2 gap-1">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(step.id)}
              disabled={step.id > currentStep}
              className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all ${step.id <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
            >
              {/* دایره استپر */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                isCompleted
                  ? "bg-green-500 border-green-500 text-white"
                  : isCurrent
                    ? "bg-[color:var(--lajvard)] border-[color:var(--lajvard)] text-white shadow-md shadow-[color:var(--lajvard)]/30"
                    : "bg-white border-gray-200 text-gray-400"
              }`}>
                {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              {/* عنوان مرحله */}
              <span className={`text-[10px] font-medium text-center leading-tight whitespace-nowrap ${isCurrent ? "text-[color:var(--lajvard)] font-bold" : "text-gray-400"}`}>
                {step.title}
              </span>
              {/* خط اتصال (به جز آخرین) */}
              {idx < STEPS.length - 1 && (
                <div className="absolute" style={{ display: "none" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-[color:var(--line)] overflow-hidden">
        <FormProvider {...methods}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentStep === 7) handleSubmit(onSubmitFinal)(e);
            }}
          >
            <div className="p-6 md:p-8">

              {imported && currentStep === 7 && imported.review.size > 0 ? (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="leading-relaxed text-amber-900">
                    <div className="font-bold">قبل از ارسال، این موارد را که از سایت‌تان خلاصه یا ترجمه شده یک بار دیگر بخوانید:</div>
                    <div className="mt-0.5">{[...imported.review].map((f) => FIELD_FA[f] ?? f).join("، ")}</div>
                  </div>
                </div>
              ) : null}

              {imported && stepImported.length > 0 && currentStep < 7 ? (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm flex items-start gap-3">
                  <Sparkles size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <div className="font-bold text-emerald-900">
                      از سایت شما پر شد: {stepImported.map((f) => FIELD_FA[f] ?? f).join("، ")}
                    </div>
                    {stepReview.length ? (
                      <div className="text-amber-800 mt-1 flex items-start gap-1.5">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>لطفاً این‌ها را دقیق‌تر ببینید (خلاصه یا ترجمه شده): {stepReview.map((f) => FIELD_FA[f] ?? f).join("، ")}</span>
                      </div>
                    ) : (
                      <div className="text-emerald-800/80 mt-0.5">همه را مرور کنید و هر چه لازم بود همین‌جا اصلاح کنید.</div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* ================================================================
                  مرحله ۱: اطلاعات پایه کسب‌وکار
                  ================================================================ */}
              {currentStep === 1 && (
                <StepWrapper
                  title="۱. اطلاعات پایه کسب‌وکار"
                  description="نام، حوزه فعالیت و توضیحات اصلی کسب‌وکار خود را وارد کنید. این اطلاعات پایه پروفایل عمومی شما خواهد بود."
                >
                  {/* نام فارسی و انگلیسی */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="نام فارسی کسب‌وکار"
                      required
                      error={errors.name?.message as string}
                      hint="نامی که مشتریان شما را با آن می‌شناسند"
                    >
                      <Input
                        {...methods.register("name")}
                        placeholder="مثال: رستوران تهران"
                        className="h-11 rounded-xl"
                      />
                    </FormField>

                    <FormField
                      label="نام انگلیسی یا لاتین"
                      error={errors.name_en?.message as string}
                      hint="برای مشتریان غیر فارسی‌زبان"
                    >
                      <Input
                        {...methods.register("name_en")}
                        dir="ltr"
                        placeholder="Tehran Restaurant"
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  </div>

                  {/* دسته‌بندی و زیردسته */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="دسته‌بندی اصلی"
                      required
                      error={errors.category?.message as string}
                    >
                      <select {...methods.register("category")} className={selectClass}>
                        <option value="">انتخاب کنید...</option>
                        {initialCategories.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      label="زیردسته (اختیاری)"
                      error={errors.sub_category?.message as string}
                    >
                      <Input
                        {...methods.register("sub_category")}
                        placeholder="مثال: غذاهای ایرانی"
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  </div>

                  {/* وضعیت مالکیت و سال شروع */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="وضعیت مالکیت"
                      required
                      error={errors.ownership_status?.message as string}
                    >
                      <select {...methods.register("ownership_status")} className={selectClass}>
                        <option value="owner">من صاحب این کسب‌وکار هستم</option>
                        <option value="representative">من نماینده رسمی هستم</option>
                      </select>
                    </FormField>

                    <FormField
                      label="سال شروع فعالیت"
                      error={errors.established_year?.message as string}
                      hint="مثال: 2018"
                    >
                      <Input
                        {...methods.register("established_year")}
                        dir="ltr"
                        placeholder="2018"
                        maxLength={4}
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  </div>

                  {/* توضیح کوتاه */}
                  <FormField
                    label="توضیح کوتاه (یک خطی)"
                    required
                    error={errors.short_description?.message as string}
                    hint={`${watch("short_description")?.length || 0} / 120 کاراکتر`}
                  >
                    <Input
                      {...methods.register("short_description")}
                      placeholder="در یک جمله کسب‌وکار خود را معرفی کنید..."
                      maxLength={120}
                      className="h-11 rounded-xl"
                    />
                  </FormField>

                  {/* توضیح کامل */}
                  <FormField
                    label="توضیح کامل کسب‌وکار"
                    required
                    error={errors.description?.message as string}
                    hint="داستان، خدمات و تمایز شما را شرح دهید"
                  >
                    <div className="relative">
                      <textarea
                        {...methods.register("description")}
                        rows={5}
                        placeholder="شرح کاملی از خدمات، داستان شکل‌گیری، تخصص تیم و چیزی که شما را از رقبا متمایز می‌کند..."
                        className="w-full rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--lajvard)] focus:border-transparent transition resize-none"
                        value={isGeneratingAI ? completion : watch("description")}
                        onChange={(e) => {
                          if (!isGeneratingAI) {
                            setValue("description", e.target.value, { shouldValidate: true });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="muted"
                        size="sm"
                        disabled={isGeneratingAI || !watch("name")}
                        onClick={() => {
                          const keywords = watch("name") + " " + (watch("category") || "") + " " + (watch("sub_category") || "");
                          complete(keywords);
                        }}
                        className="absolute left-3 bottom-3 gap-1.5 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 border-none"
                      >
                        {isGeneratingAI ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        تولید هوشمند
                      </Button>
                    </div>
                  </FormField>

                  {/* ── لیست سرویس‌ها، محصولات و تعرفه‌ها ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold flex items-center gap-2">
                        <DollarSign size={16} className="text-green-600" />
                        سرویس‌ها و تعرفه‌ها <span className="text-xs text-gray-400 font-normal">(اختیاری)</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          const newItem: ServiceItem = { name: "", description: "", price: "", price_unit: "ساعت", price_note: "" };
                          const updated = [...services, newItem];
                          setServices(updated);
                          setValue("services" as any, updated);
                        }}
                        className="flex items-center gap-1.5 text-sm text-[color:var(--lajvard)] bg-[color:var(--lajvard)]/10 hover:bg-[color:var(--lajvard)]/20 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        <PlusCircle size={15} />
                        افزودن سرویس
                      </button>
                    </div>

                    {services.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 rounded-xl text-center">
                        <Store size={26} className="text-gray-300 mb-1.5" />
                        <p className="text-sm text-[color:var(--muted-text)]">سرویسی اضافه نشده. لیست خدمات و تعرفه‌ها را برای مشتریان وارد کنید.</p>
                      </div>
                    )}

                    {services.map((svc, idx) => (
                      <div key={idx} className="border border-[color:var(--line)] rounded-xl p-4 bg-green-50/20 space-y-3 relative">
                        {/* دکمه حذف */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = services.filter((_, i) => i !== idx);
                            setServices(updated);
                            setValue("services" as any, updated);
                          }}
                          className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* نام سرویس */}
                          <FormField label={`نام سرویس ${idx + 1}`} required>
                            <Input
                              value={svc.name}
                              onChange={(e) => {
                                const updated = [...services];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setServices(updated); setValue("services" as any, updated);
                              }}
                              placeholder="مثال: طراحی لوگو"
                              className="h-10 rounded-xl"
                            />
                          </FormField>

                          {/* قیمت + واحد */}
                          <div className="grid grid-cols-2 gap-2">
                            <FormField label="قیمت">
                              <Input
                                value={svc.price || ""}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], price: e.target.value };
                                  setServices(updated); setValue("services" as any, updated);
                                }}
                                dir="ltr" placeholder="150" className="h-10 rounded-xl"
                              />
                            </FormField>
                            <FormField label="واحد">
                              <select
                                value={svc.price_unit || "ساعت"}
                                onChange={(e) => {
                                  const updated = [...services];
                                  updated[idx] = { ...updated[idx], price_unit: e.target.value };
                                  setServices(updated); setValue("services" as any, updated);
                                }}
                                className="flex h-10 w-full rounded-xl border border-[color:var(--line)] bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--lajvard)]"
                              >
                                <option>ساعت</option>
                                <option>جلسه</option>
                                <option>ماه</option>
                                <option>نفر</option>
                                <option>پروژه</option>
                                <option>ثابت</option>
                                <option>CAD</option>
                              </select>
                            </FormField>
                          </div>
                        </div>

                        {/* توضیح */}
                        <FormField label="توضیح سرویس">
                          <Input
                            value={svc.description || ""}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[idx] = { ...updated[idx], description: e.target.value };
                              setServices(updated); setValue("services" as any, updated);
                            }}
                            placeholder="توضیح کوتاه..."
                            className="h-10 rounded-xl"
                          />
                        </FormField>

                        {/* یادداشت قیمت */}
                        <FormField label="یادداشت قیمت" hint="مثلاً: قیمت بسته به پیچیدگی متفاوت است">
                          <Input
                            value={svc.price_note || ""}
                            onChange={(e) => {
                              const updated = [...services];
                              updated[idx] = { ...updated[idx], price_note: e.target.value };
                              setServices(updated); setValue("services" as any, updated);
                            }}
                            placeholder="اختیاری..."
                            className="h-10 rounded-xl"
                          />
                        </FormField>
                      </div>
                    ))}
                  </div>
                </StepWrapper>
              )}

              {/* ================================================================
                  مرحله ۲: موقعیت جغرافیایی و محدوده خدمات
                  ================================================================ */}
              {currentStep === 2 && (
                <StepWrapper
                  title="۲. موقعیت و محدوده خدمات"
                  description="محل فیزیکی کسب‌وکارتان و نحوه سرویس‌دهی به مشتریان را مشخص کنید."
                >
                  {/* استان و شهر */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="استان" required error={errors.province?.message as string}>
                      <select {...methods.register("province")} className={selectClass}>
                        <option value="">انتخاب استان...</option>
                        {PROVINCES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="شهر" required error={errors.city?.message as string}>
                      <Input
                        {...methods.register("city")}
                        dir="ltr"
                        placeholder="Toronto"
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  </div>

                  {/* آدرس کامل */}
                  <FormField
                    label="آدرس کامل"
                    required
                    error={errors.address?.message as string}
                    hint="شامل شماره واحد، خیابان، شهر و استان"
                  >
                    <Input
                      {...methods.register("address")}
                      dir="ltr"
                      placeholder="123 Main St, Toronto, ON"
                      className="h-11 rounded-xl"
                    />
                  </FormField>

                  {/* کد پستی */}
                  <FormField label="کد پستی (Postal Code)" error={errors.postal_code?.message as string}>
                    <Input
                      {...methods.register("postal_code")}
                      dir="ltr"
                      placeholder="M5V 2T6"
                      className="h-11 rounded-xl"
                    />
                  </FormField>

                  {/* نمایش عمومی آدرس */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <input
                      type="checkbox"
                      id="is_address_public"
                      {...methods.register("is_address_public")}
                      className="mt-0.5 w-5 h-5 rounded accent-[color:var(--lajvard)] cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="is_address_public" className="cursor-pointer font-semibold">
                        آدرس را در پروفایل عمومی نمایش بده
                      </Label>
                      <p className="text-xs text-amber-700 mt-1">
                        در صورت عدم تیک، آدرس فقط برای ادمین قابل مشاهده خواهد بود.
                      </p>
                    </div>
                  </div>

                  {/* نوع خدمات و محدوده */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="نحوه ارائه خدمات" required error={errors.service_type?.message as string}>
                      <select {...methods.register("service_type")} className={selectClass}>
                        <option value="in_person">فقط حضوری</option>
                        <option value="online">فقط آنلاین / ریموت</option>
                        <option value="both">هم حضوری، هم آنلاین</option>
                      </select>
                    </FormField>

                    <FormField label="محدوده سرویس‌دهی" required error={errors.service_area?.message as string}>
                      <select {...methods.register("service_area")} className={selectClass}>
                        <option value="city">فقط شهر محل کسب‌وکار</option>
                        <option value="province">سراسر استان</option>
                        <option value="canada">سراسر کانادا</option>
                        <option value="international">بین‌المللی</option>
                      </select>
                    </FormField>
                  </div>

                  {/* ── لینک گوگل مپ ── */}
                  <FormField
                    label="لینک گوگل مپ"
                    icon={<MapPin size={16} className="text-red-500" />}
                    hint="آدرس کسب‌وکار را در گوگل مپ باز کنید، سپس لینک را کپی و اینجا بگذارید"
                    error={errors.google_maps_url?.message as string}
                  >
                    <Input
                      {...methods.register("google_maps_url")}
                      dir="ltr"
                      placeholder="https://maps.google.com/maps?q=..."
                      className="h-11 rounded-xl"
                    />
                  </FormField>

                  {/* پیش‌نمایش نقشه (اگر آدرس وارد شده باشد) */}
                  {watch("address") && (
                    <div className="rounded-xl overflow-hidden border border-[color:var(--line)]">
                      <iframe
                        src={`https://maps.google.com/maps?q=${encodeURIComponent((watch("city") ? watch("city") + ", " : "") + watch("address"))}&output=embed`}
                        width="100%"
                        height="200"
                        className="border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="پیش‌نمایش موقعیت کسب‌وکار"
                      />
                    </div>
                  )}

                  {/* ── آدرس شعبه‌های اضافی ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold flex items-center gap-2">
                        <Building2 size={16} className="text-blue-600" />
                        شعبه‌های اضافی <span className="text-xs text-gray-400 font-normal">(اختیاری)</span>
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...branches, { name: "", address: "", city: "", phone: "" }];
                          setBranches(updated);
                          setValue("branches" as any, updated);
                        }}
                        className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        <PlusCircle size={15} />
                        افزودن شعبه
                      </button>
                    </div>

                    {branches.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 rounded-xl text-center">
                        <MapPin size={26} className="text-gray-300 mb-1.5" />
                        <p className="text-sm text-[color:var(--muted-text)]">شعبه‌ای اضافه نشده. اگر چند شعبه دارید اینجا وارد کنید.</p>
                      </div>
                    )}

                    {branches.map((branch, idx) => (
                      <div key={idx} className="border border-[color:var(--line)] rounded-xl p-4 bg-blue-50/30 space-y-3 relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-blue-700">شعبه {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = branches.filter((_, i) => i !== idx);
                              setBranches(updated);
                              setValue("branches" as any, updated);
                            }}
                            className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField label="نام شعبه" hint="مثلاً: شعبه مرکزی">
                            <Input
                              value={branch.name || ""}
                              onChange={(e) => {
                                const updated = [...branches];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setBranches(updated); setValue("branches" as any, updated);
                              }}
                              placeholder="شعبه مرکزی"
                              className="h-10 rounded-xl"
                            />
                          </FormField>
                          <FormField label="شهر">
                            <Input
                              value={branch.city || ""}
                              onChange={(e) => {
                                const updated = [...branches];
                                updated[idx] = { ...updated[idx], city: e.target.value };
                                setBranches(updated); setValue("branches" as any, updated);
                              }}
                              dir="ltr" placeholder="Toronto" className="h-10 rounded-xl"
                            />
                          </FormField>
                        </div>

                        <FormField label="آدرس کامل" required>
                          <Input
                            value={branch.address}
                            onChange={(e) => {
                              const updated = [...branches];
                              updated[idx] = { ...updated[idx], address: e.target.value };
                              setBranches(updated); setValue("branches" as any, updated);
                            }}
                            dir="ltr" placeholder="456 King St, Toronto, ON" className="h-10 rounded-xl"
                          />
                        </FormField>

                        <FormField label="تلفن شعبه">
                          <Input
                            value={branch.phone || ""}
                            onChange={(e) => {
                              const updated = [...branches];
                              updated[idx] = { ...updated[idx], phone: e.target.value };
                              setBranches(updated); setValue("branches" as any, updated);
                            }}
                            dir="ltr" placeholder="+1 416-000-0001" className="h-10 rounded-xl"
                          />
                        </FormField>
                      </div>
                    ))}
                  </div>
                </StepWrapper>
              )}


              {/* ================================================================
                  مرحله ۳: راه‌های ارتباطی و شبکه‌های اجتماعی
                  ================================================================ */}
              {currentStep === 3 && (
                <StepWrapper
                  title="۳. راه‌های ارتباطی"
                  description="اطلاعاتی که مشتریان می‌توانند از طریق آن‌ها با شما تماس بگیرند. حداقل یک شماره تلفن الزامی است."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* تلفن */}
                    <FormField
                      label="شماره تلفن اصلی"
                      required
                      icon={<Phone size={16} className="text-gray-500" />}
                      error={errors.phone?.message as string}
                    >
                      <Input {...methods.register("phone")} dir="ltr" placeholder="+1 416-000-0000" className="h-11 rounded-xl" />
                    </FormField>

                    {/* واتساپ */}
                    <FormField
                      label="شماره واتساپ"
                      icon={<MessageCircle size={16} className="text-green-500" />}
                      error={errors.whatsapp?.message as string}
                    >
                      <Input {...methods.register("whatsapp")} dir="ltr" placeholder="+1 416-000-0000" className="h-11 rounded-xl" />
                    </FormField>

                    {/* ایمیل */}
                    <FormField
                      label="ایمیل عمومی کسب‌وکار"
                      icon={<Mail size={16} className="text-blue-500" />}
                      error={errors.contact_email?.message as string}
                    >
                      <Input {...methods.register("contact_email")} dir="ltr" type="email" placeholder="info@example.com" className="h-11 rounded-xl" />
                    </FormField>

                    {/* وب‌سایت */}
                    <FormField
                      label="وب‌سایت"
                      icon={<Globe size={16} className="text-indigo-500" />}
                      error={errors.website?.message as string}
                    >
                      <Input {...methods.register("website")} dir="ltr" placeholder="https://example.com" className="h-11 rounded-xl" />
                    </FormField>

                    {/* اینستاگرام */}
                    <FormField
                      label="اینستاگرام"
                      icon={<Hash size={16} className="text-pink-500" />}
                      error={errors.instagram?.message as string}
                    >
                      <Input {...methods.register("instagram")} dir="ltr" placeholder="https://instagram.com/username" className="h-11 rounded-xl" />
                    </FormField>

                    {/* تلگرام */}
                    <FormField
                      label="تلگرام"
                      icon={<Send size={16} className="text-sky-500" />}
                      error={errors.telegram?.message as string}
                    >
                      <Input {...methods.register("telegram")} dir="ltr" placeholder="https://t.me/username" className="h-11 rounded-xl" />
                    </FormField>

                    {/* لینکدین */}
                    <FormField
                      label="لینکدین"
                      icon={<Link2 size={16} className="text-blue-700" />}
                      error={errors.linkedin?.message as string}
                    >
                      <Input {...methods.register("linkedin")} dir="ltr" placeholder="https://linkedin.com/company/..." className="h-11 rounded-xl" />
                    </FormField>
                  </div>

                  {/* روش تماس ترجیحی */}
                  <FormField label="روش تماس ترجیحی" error={errors.preferred_contact?.message as string}>
                    <select {...methods.register("preferred_contact")} className={selectClass}>
                      <option value="phone">تلفن</option>
                      <option value="whatsapp">واتساپ</option>
                      <option value="email">ایمیل</option>
                    </select>
                  </FormField>
                </StepWrapper>
              )}

              {/* ================================================================
                  مرحله ۴: اعتماد، اعتبار و تایید هویت
                  ================================================================ */}
              {currentStep === 4 && (
                <StepWrapper
                  title="۴. جزئیات اعتماد و اعتبار"
                  description="این اطلاعات صرفاً برای راستی‌آزمایی توسط تیم گوپلازا دریافت می‌شود و در پروفایل عمومی نمایش داده نخواهد شد."
                >
                  {/* هشدار محرمانه بودن */}
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                    <ShieldCheck size={20} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-900 leading-relaxed">
                      <strong>اطلاعات محرمانه:</strong> اطلاعات این بخش (مثل شماره ثبت و مدارک) هرگز بدون اجازه صریح شما در نمایش عمومی کسب‌وکار منتشر نخواهد شد.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* شماره ثبت */}
                    <FormField
                      label="شماره ثبت شرکت (Business Number)"
                      hint="اختیاری – برای اعتبارسنجی سریع‌تر"
                      error={errors.business_number?.message as string}
                    >
                      <Input
                        {...methods.register("business_number")}
                        dir="ltr"
                        placeholder="در صورت داشتن وارد کنید..."
                        className="h-11 rounded-xl"
                      />
                    </FormField>

                    {/* لایسنس */}
                    <FormField
                      label="لایسنس یا مجوز حرفه‌ای"
                      hint="اگر کسب‌وکار شما نیاز به مجوز دارد"
                      error={errors.license_info?.message as string}
                    >
                      <Input
                        {...methods.register("license_info")}
                        placeholder="مثال: لایسنس مشاور املاک RECO"
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  </div>

                  {/* زبان‌های خدمات */}
                  <FormField
                    label="زبان‌های ارائه خدمات"
                    required
                    error={errors.languages?.message as string}
                    hint="می‌توانید چند زبان انتخاب کنید"
                  >
                    <div className="flex flex-wrap gap-2 mt-1">
                      {LANGUAGES.map(lang => {
                        const currentLangs = watch("languages") || [];
                        const isSelected = currentLangs.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              const currentLangs = getValues("languages") || [];
                              if (isSelected) {
                                setValue("languages", currentLangs.filter(l => l !== lang));
                              } else {
                                setValue("languages", [...currentLangs, lang]);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                              isSelected
                                ? "bg-[color:var(--lajvard)] border-[color:var(--lajvard)] text-white"
                                : "bg-white border-[color:var(--line)] text-[color:var(--text)] hover:border-[color:var(--lajvard)]"
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>

                  {/* ایرانی-کانادایی */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <input
                      type="checkbox"
                      id="is_iranian_owned"
                      {...methods.register("is_iranian_owned")}
                      className="mt-0.5 w-5 h-5 rounded accent-[color:var(--lajvard)] cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="is_iranian_owned" className="cursor-pointer font-semibold">
                        این کسب‌وکار متعلق به ایرانیان کانادا است
                      </Label>
                      <p className="text-xs text-blue-700 mt-1">
                        این علامت در پروفایل عمومی نمایش داده می‌شود و به ایرانیان برای پیدا کردن کسب‌وکارهای هم‌وطن کمک می‌کند.
                      </p>
                    </div>
                  </div>

                  {/* توضیح تایید مالکیت */}
                  <FormField
                    label="توضیح کوتاه برای تایید مالکیت یا نمایندگی"
                    hint="چگونه می‌توانیم مالکیت یا اختیار شما را تایید کنیم؟"
                    error={errors.verification_notes?.message as string}
                  >
                    <textarea
                      {...methods.register("verification_notes")}
                      rows={3}
                      placeholder="مثال: من مدیرعامل این شرکت هستم و می‌توانم مدارک ثبتی ارائه دهم..."
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--lajvard)] focus:border-transparent transition resize-none"
                    />
                  </FormField>
                </StepWrapper>
              )}

              {/* ================================================================
                  مرحله ۵: رسانه و هویت بصری
                  ================================================================ */}
              {currentStep === 5 && (
                <StepWrapper
                  title="۵. رسانه و هویت بصری"
                  description="تصاویر حرفه‌ای به مشتریان کمک می‌کند شما را بهتر بشناسند و اعتماد بیشتری ایجاد کنند."
                >
                  {/* لوگو و کاور */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="لوگوی کسب‌وکار" hint="حداکثر ۲ مگابایت، فرمت JPEG یا PNG">
                      <Controller
                        name="logo_url"
                        control={methods.control}
                        render={({ field }) => (
                          <ImageUploader
                            label="آپلود لوگو"
                            value={field.value}
                            onChange={field.onChange}
                            maxSizeMB={2}
                            folderPath="logos"
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="تصویر کاور (پشت‌زمینه)" hint="حداکثر ۵ مگابایت، ابعاد پیشنهادی ۱۲۰۰×۴۰۰">
                      <Controller
                        name="cover_url"
                        control={methods.control}
                        render={({ field }) => (
                          <ImageUploader
                            label="آپلود تصویر کاور"
                            value={field.value}
                            onChange={field.onChange}
                            maxSizeMB={5}
                            folderPath="covers"
                          />
                        )}
                      />
                    </FormField>
                  </div>

                  {/* شعار و رنگ برند */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="شعار تبلیغاتی (Tagline)"
                      error={errors.tagline?.message as string}
                    >
                      <Input
                        {...methods.register("tagline")}
                        placeholder="مثال: کیفیت تضمینی، لبخند رضایت"
                        className="h-11 rounded-xl"
                      />
                    </FormField>

                    <FormField
                      label="رنگ برند (Hex Code)"
                      hint="اختیاری – مثال: #C0392B"
                      error={errors.brand_color?.message as string}
                    >
                      <div className="flex gap-2">
                        <input
                          type="color"
                          defaultValue="#6C2BD9"
                          onChange={(e) => {
                            methods.setValue("brand_color", e.target.value);
                          }}
                          className="h-11 w-14 rounded-xl border border-[color:var(--line)] cursor-pointer p-1"
                        />
                        <Input
                          {...methods.register("brand_color")}
                          dir="ltr"
                          placeholder="#6C2BD9"
                          className="h-11 rounded-xl flex-1"
                        />
                      </div>
                    </FormField>
                  </div>
                </StepWrapper>
              )}

              {/* ================================================================
                  مرحله ۶: ساعات کاری و دسترسی
                  ================================================================ */}
              {currentStep === 6 && (
                <StepWrapper
                  title="۶. ساعات کاری و دسترسی"
                  description="ساعات کاری و نحوه دریافت مشتری را مشخص کنید تا کاربران از زمان‌بندی شما مطلع شوند."
                >
                  {/* جدول ساعات کاری روزها */}
                  <div className="space-y-3">
                    <Label className="font-bold">ساعات کاری هفتگی</Label>
                    <div className="border border-[color:var(--line)] rounded-xl overflow-hidden">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <WorkingHoursRow
                          key={day.key}
                          dayKey={day.key}
                          dayLabel={day.label}
                          isLast={idx === DAYS_OF_WEEK.length - 1}
                          watch={watch}
                          setValue={setValue}
                        />
                      ))}
                    </div>
                  </div>

                  {/* تعطیلات رسمی */}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-[color:var(--line)]">
                    <input
                      type="checkbox"
                      id="closed_holidays"
                      onChange={(e) => {
                        const wh = getValues("working_hours") || {};
                        setValue("working_hours", { ...wh, closed_on_holidays: e.target.checked });
                      }}
                      className="mt-0.5 w-5 h-5 rounded accent-[color:var(--lajvard)] cursor-pointer"
                    />
                    <Label htmlFor="closed_holidays" className="cursor-pointer">
                      در تعطیلات رسمی کانادا تعطیل هستم
                    </Label>
                  </div>

                  {/* رزرو آنلاین */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <input
                      type="checkbox"
                      id="accepts_appointments"
                      {...methods.register("accepts_appointments")}
                      className="mt-0.5 w-5 h-5 rounded accent-[color:var(--lajvard)] cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="accepts_appointments" className="cursor-pointer font-semibold">
                        امکان رزرو وقت قبلی (Appointment)
                      </Label>
                      <p className="text-xs text-blue-700 mt-0.5">مشتریان می‌توانند وقت رزرو کنند</p>
                    </div>
                  </div>

                  {/* لینک رزرو */}
                  {watch("accepts_appointments") && (
                    <FormField
                      label="لینک رزرو آنلاین"
                      hint="مثال: Calendly، Jane App، Acuity"
                      error={errors.booking_url?.message as string}
                    >
                      <Input
                        {...methods.register("booking_url")}
                        dir="ltr"
                        placeholder="https://calendly.com/your-business"
                        className="h-11 rounded-xl"
                      />
                    </FormField>
                  )}
                </StepWrapper>
              )}

              {/* ================================================================
                  مرحله ۷: بازبینی نهایی و ارسال
                  ================================================================ */}
              {currentStep === 7 && (
                <StepWrapper
                  title="۷. بازبینی و ارسال نهایی"
                  description="لطفاً اطلاعات وارد شده را مرور کنید. می‌توانید برای اصلاح به هر مرحله برگردید."
                >
                  {/* خلاصه اطلاعات */}
                  <div className="space-y-3">
                    <ReviewSection title="اطلاعات پایه">
                      <ReviewRow label="نام فارسی" value={getValues("name")} />
                      <ReviewRow label="نام انگلیسی" value={getValues("name_en")} />
                      <ReviewRow label="دسته‌بندی" value={initialCategories.find((c) => c.value === getValues("category"))?.label ?? getValues("category")} />
                      <ReviewRow label="توضیح کوتاه" value={getValues("short_description")} />
                      <ReviewRow label="وضعیت مالکیت" value={getValues("ownership_status") === "owner" ? "صاحب کسب‌وکار" : "نماینده"} />
                    </ReviewSection>

                    <ReviewSection title="موقعیت">
                      <ReviewRow label="استان / شهر" value={`${getValues("province")} / ${getValues("city")}`} />
                      <ReviewRow label="آدرس" value={getValues("address")} dir="ltr" />
                      <ReviewRow label="نوع خدمات" value={{ in_person: "حضوری", online: "آنلاین", both: "حضوری و آنلاین" }[getValues("service_type") as string] ?? getValues("service_type")} />
                    </ReviewSection>

                    <ReviewSection title="ارتباطات">
                      <ReviewRow label="تلفن" value={getValues("phone")} dir="ltr" />
                      <ReviewRow label="ایمیل" value={getValues("contact_email")} dir="ltr" />
                      <ReviewRow label="وب‌سایت" value={getValues("website")} dir="ltr" />
                    </ReviewSection>
                  </div>

                  {/* لینک بازگشت به مراحل */}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {STEPS.slice(0, 6).map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setCurrentStep(s.id)}
                        className="text-xs text-[color:var(--lajvard)] border border-[color:var(--lajvard)]/30 bg-[color:var(--lajvard)]/5 px-3 py-1 rounded-lg hover:bg-[color:var(--lajvard)]/10 transition"
                      >
                        ویرایش: {s.title}
                      </button>
                    ))}
                  </div>

                  {/* چک‌باکس‌های تایید */}
                  <div className="space-y-3 mt-6 p-5 bg-blue-50/70 rounded-xl border border-blue-100">
                    <TermsCheckbox id="terms1" label="تایید می‌کنم که تمام اطلاعات وارد شده صحیح و واقعی است." />
                    <TermsCheckbox id="terms2" label="می‌پذیرم که انتشار نهایی در دایرکتوری، پس از بررسی و تایید تیم گوپلازا انجام خواهد شد." />
                    <TermsCheckbox id="terms3" label={<>با <a href="/terms" target="_blank" className="underline text-[color:var(--lajvard)]">قوانین و مقررات</a> و <a href="/privacy" target="_blank" className="underline text-[color:var(--lajvard)]">حریم خصوصی</a> گوپلازا موافقم.</>} />
                  </div>
                </StepWrapper>
              )}
            </div>

            {/* ================================================================
                فوتر ناوبری – دکمه‌های قبل/بعد
                ================================================================ */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-t border-[color:var(--line)] bg-gray-50/50">
              <Button
                type="button"
                variant="ghost"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ArrowRight size={16} />
                مرحله قبل
              </Button>

              <span className="text-sm text-[color:var(--muted-text)]">{currentStep} / ۷</span>

              {currentStep < 7 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gap-2 bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white px-6"
                >
                  مرحله بعد
                  <ArrowLeft size={16} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white min-w-[180px] px-6"
                >
                  {isSubmitting
                    ? <><Loader2 size={16} className="animate-spin" /> در حال ارسال...</>
                    : <><CheckCircle2 size={16} /> ارسال برای بررسی</>
                  }
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

// ============================================================================
// کامپوننت‌های کمکی (Helper Components)
// ============================================================================

/** Wrapper هر مرحله با عنوان و توضیح */
function StepWrapper({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="pb-4 border-b border-[color:var(--line)]">
        <h3 className="text-xl font-extrabold text-[color:var(--text)]">{title}</h3>
        <p className="text-sm text-[color:var(--muted-text)] mt-1 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** فیلد فرم با برچسب، راهنما و خطا */
function FormField({ label, required, hint, error, icon, children }: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 font-semibold text-sm">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-[color:var(--muted-text)]">{hint}</p>}
      {error && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

/** ردیف ساعات کاری برای یک روز */
function WorkingHoursRow({ dayKey, dayLabel, isLast, watch, setValue }: {
  dayKey: string;
  dayLabel: string;
  isLast: boolean;
  watch: any;
  setValue: any;
}) {
  const workingHours = watch("working_hours") || {};
  const dayData = workingHours[dayKey] || { open: "09:00", close: "18:00", closed: false };
  const isClosed = dayData.closed;

  const update = (field: string, value: any) => {
    setValue("working_hours", {
      ...workingHours,
      [dayKey]: { ...dayData, [field]: value }
    });
  };

  return (
    <div className={`flex items-center gap-4 px-4 py-3 ${!isLast ? "border-b border-[color:var(--line)]" : ""} ${isClosed ? "bg-gray-50" : "bg-white"}`}>
      {/* چک‌باکس تعطیل */}
      <input
        type="checkbox"
        checked={isClosed}
        onChange={(e) => update("closed", e.target.checked)}
        className="w-4 h-4 rounded accent-red-500"
        id={`closed-${dayKey}`}
      />

      {/* نام روز */}
      <label htmlFor={`closed-${dayKey}`} className={`w-20 text-sm font-medium cursor-pointer ${isClosed ? "text-gray-400 line-through" : "text-[color:var(--text)]"}`}>
        {dayLabel}
      </label>

      {/* ساعت شروع و پایان */}
      {!isClosed ? (
        <div className="flex items-center gap-2 flex-1" dir="ltr">
          <input
            type="time"
            value={dayData.open}
            onChange={(e) => update("open", e.target.value)}
            className="flex-1 h-9 border border-[color:var(--line)] rounded-lg px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--lajvard)]"
          />
          <span className="text-[color:var(--muted-text)] text-xs">تا</span>
          <input
            type="time"
            value={dayData.close}
            onChange={(e) => update("close", e.target.value)}
            className="flex-1 h-9 border border-[color:var(--line)] rounded-lg px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--lajvard)]"
          />
        </div>
      ) : (
        <span className="text-xs text-gray-400 flex-1">تعطیل</span>
      )}
    </div>
  );
}

/** بخش بازبینی با عنوان */
function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-[color:var(--line)]">
        <h4 className="text-sm font-bold text-[color:var(--text)]">{title}</h4>
      </div>
      <div className="divide-y divide-[color:var(--line)] px-4">{children}</div>
    </div>
  );
}

/** ردیف نمایش یک مقدار در بخش بازبینی */
function ReviewRow({ label, value, dir }: { label: string; value?: string; dir?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 text-sm gap-4">
      <span className="text-[color:var(--muted-text)] shrink-0">{label}</span>
      <span className="text-[color:var(--text)] font-medium text-left truncate" dir={dir || "rtl"}>{value}</span>
    </div>
  );
}

/** چک‌باکس تایید شرایط */
function TermsCheckbox({ id, label }: { id: string; label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={id}
        required
        className="mt-0.5 w-5 h-5 rounded accent-[color:var(--lajvard)] cursor-pointer shrink-0"
      />
      <label htmlFor={id} className="text-sm text-blue-900 cursor-pointer leading-relaxed">
        {label}
      </label>
    </div>
  );
}
