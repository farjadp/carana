// ============================================================================
// Source: app/dashboard/business/[id]/edit/edit-form.tsx
// Version: 1.0.0 — 2026-08-13
// Why: Client Component that pre-fills the edit form with existing business data.
//      After saving, the status is reset to SUBMITTED for admin re-review.
// Env / Identity: Client Component
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, Save,
  Phone, Globe, Hash, MessageCircle, Mail, MapPin, Send, Link2, Clock,
  ShieldCheck, Building2, Camera, AlertTriangle, Wand2, Search
} from "lucide-react";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

import { finalBusinessSchema, BusinessFormData } from "@charana/core";
import { saveBusinessEditDraft, resubmitBusinessForReview } from "./actions";
import { scrapeWebsiteForBusiness } from "../../ai-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { GalleryUploader } from "@/components/ui/gallery-uploader";
import { VanityUrlEditor } from "@/components/business/vanity-url-editor";
import { OwnerVisibilityToggle } from "@/components/business/owner-visibility-toggle";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

// ============================================================================
// ثوابت پیکربندی
// ============================================================================

// تعریف مراحل ویرایش (همان ۶ مرحله اطلاعاتی + مرحله بازبینی نهایی)
const STEPS = [
  { id: 1, title: "اطلاعات پایه",   icon: Building2 },
  { id: 2, title: "موقعیت",          icon: MapPin },
  { id: 3, title: "ارتباطات",        icon: Phone },
  { id: 4, title: "اعتبار",          icon: ShieldCheck },
  { id: 5, title: "رسانه",           icon: Camera },
  { id: 6, title: "ساعات کاری",     icon: Clock },
  { id: 7, title: "ارسال مجدد",      icon: CheckCircle2 },
];

// دسته‌بندی‌های کسب‌وکار
const CATEGORIES = [
  { value: "food", label: "رستوران، کافه و غذا" },
  { value: "medical", label: "پزشکی، دندانپزشکی و سلامت" },
  { value: "legal", label: "حقوقی و وکالت" },
  { value: "real_estate", label: "مشاور املاک" },
  { value: "financial", label: "مالی، حسابداری و بیمه" },
  { value: "beauty", label: "آرایشگری و زیبایی" },
  { value: "education", label: "آموزش و تدریس" },
  { value: "construction", label: "ساختمان و تاسیسات" },
  { value: "retail", label: "فروشگاه و خرده‌فروشی" },
  { value: "tech", label: "فناوری و طراحی دیجیتال" },
  { value: "transportation", label: "حمل و نقل و لجستیک" },
  { value: "services", label: "خدمات تخصصی سایر" },
];

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

const DAYS_OF_WEEK = [
  { key: "monday",    label: "دوشنبه" },
  { key: "tuesday",   label: "سه‌شنبه" },
  { key: "wednesday", label: "چهارشنبه" },
  { key: "thursday",  label: "پنجشنبه" },
  { key: "friday",    label: "جمعه" },
  { key: "saturday",  label: "شنبه" },
  { key: "sunday",    label: "یکشنبه" },
];

const LANGUAGES = ["فارسی", "انگلیسی", "فرانسوی", "عربی", "ترکی", "سایر"];

const selectClass = "flex h-11 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--lajvard)] focus:border-transparent transition";

// برچسب فارسی وضعیت‌ها
const STATUS_LABELS: Record<string, { label: string; color: string; hint: string }> = {
  DRAFT:         { label: "پیش‌نویس",          color: "bg-gray-100 text-gray-700",           hint: "هنوز برای بررسی ارسال نشده." },
  SUBMITTED:     { label: "در انتظار تایید",    color: "bg-blue-100 text-blue-700",           hint: "در صف بررسی توسط تیم چارانا." },
  NEEDS_CHANGES: { label: "نیازمند اصلاح",      color: "bg-amber-100 text-amber-700",         hint: "تیم چارانا اصلاحاتی خواسته است. لطفاً ویرایش کنید." },
  APPROVED:      { label: "تایید شده",          color: "bg-teal-100 text-teal-700",           hint: "تایید شده، به زودی منتشر می‌شود." },
  PUBLISHED:     { label: "منتشر شده",          color: "bg-green-100 text-green-700",         hint: "پروفایل در دایرکتوری عمومی قابل مشاهده است." },
  REJECTED:      { label: "رد شده",             color: "bg-red-100 text-red-700",             hint: "متاسفانه پروفایل تایید نشد. می‌توانید ویرایش و ارسال مجدد کنید." },
};

// ============================================================================
// Props
// ============================================================================
interface EditFormProps {
  businessId: string;
  initialData: any; // داده‌های موجود از دیتابیس
  /** Resolved server-side: the name the public profile would print, and
   *  whether the listing is verified at all. Both decide what the owner-
   *  visibility control is allowed to claim. */
  ownerIdentity: { name: string | null; verified: boolean };
}

// ============================================================================
// کامپوننت اصلی
// ============================================================================
export default function BusinessEditForm({ businessId, initialData, ownerIdentity }: EditFormProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // AI Auto-Fill states
  const [aiUrl, setAiUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  // Google Maps Autocomplete states
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  
  // We specify libraries conditionally to avoid React warnings, usually outside component but this works for demo
  const [libraries] = useState<("places")[]>(["places"]);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries,
  });

  // وضعیت کنونی کسب‌وکار
  const currentStatus = initialData.status;
  const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.DRAFT;

  // مقداردهی فرم با داده‌های موجود در دیتابیس
  const methods = useForm<BusinessFormData>({
    // در ویرایش نیاز به اعتبارسنجی سخت‌گیرانه نداریم چون کاربر ممکن است فقط یک بخش را عوض کند
    defaultValues: {
      name:               initialData.name || "",
      name_en:            initialData.name_en || "",
      category:           initialData.category || "",
      sub_category:       initialData.sub_category || "",
      short_description:  initialData.short_description || "",
      description:        initialData.description || "",
      established_year:   initialData.established_year?.toString() || "",
      ownership_status:   initialData.ownership_status || "owner",
      country:            initialData.country || "Canada",
      province:           initialData.province || "",
      city:               initialData.city || "",
      address:            initialData.address || "",
      postal_code:        initialData.postal_code || "",
      is_address_public:  initialData.is_address_public ?? true,
      service_type:       initialData.service_type || "both",
      service_area:       initialData.service_area || "city",
      phone:              initialData.phone || "",
      whatsapp:           initialData.whatsapp || "",
      contact_email:      initialData.contact_email || "",
      website:            initialData.website || "",
      instagram:          initialData.instagram || "",
      telegram:           initialData.telegram || "",
      linkedin:           initialData.linkedin || "",
      google_maps_url:    initialData.google_maps_url || "",
      preferred_contact:  initialData.preferred_contact || "phone",
      business_number:    initialData.business_number || "",
      license_info:       initialData.license_info || "",
      languages:          initialData.languages || ["فارسی"],
      is_iranian_owned:   initialData.is_iranian_owned ?? true,
      verification_notes: initialData.verification_notes || "",
      logo_url:           initialData.logo_url || "",
      cover_url:          initialData.cover_url || "",
      brand_color:        initialData.brand_color || "",
      tagline:            initialData.tagline || "",
      working_hours:      initialData.working_hours || {},
      accepts_appointments: initialData.accepts_appointments ?? false,
      booking_url:        initialData.booking_url || "",
      gallery_urls:       initialData.gallery_urls || [],
      gallery_video_url:  initialData.gallery_video_url || "",
    },
  });

  const { getValues, setValue, watch, formState: { errors } } = methods;

  // Same expiry-aware check as everywhere else — a lapsed plan can't keep an
  // over-cap gallery either; entitlementsFor recomputes it every render.
  const galleryEnt = entitlementsFor({ plan: initialData.plan, plan_until: initialData.plan_until });
  const nextPlanName = galleryEnt.plan === "free" ? PLANS.pro.name : galleryEnt.plan === "pro" ? PLANS.featured.name : undefined;

  // ============================================================================
  // ناوبری
  // ============================================================================

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
      // ذخیره خودکار پیش‌نویس هنگام رفتن به مرحله بعد
      handleSaveDraft(false);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  // ============================================================================
  // اکشن‌های ذخیره و ارسال
  // ============================================================================

  /** ذخیره پیش‌نویس ویرایش بدون ارسال برای بررسی */
  const handleSaveDraft = async (showFeedback = true) => {
    if (showFeedback) setIsSavingDraft(true);
    const data = getValues();
    const result = await saveBusinessEditDraft(data, businessId);

    if (result.success && showFeedback) {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2500);
    }
    if (showFeedback) setIsSavingDraft(false);
  };

  /** ارسال مجدد برای بررسی ادمین پس از ویرایش */
  const handleResubmit = async () => {
    setIsSubmitting(true);
    const data = getValues();
    const result = await resubmitBusinessForReview(data, businessId);

    if (result.success) {
      setSubmitSuccess(true);
    } else {
      alert("خطا در ارسال مجدد: " + result.error);
    }
    setIsSubmitting(false);
  };

  /** AI Website Scrape Handler */
  const handleAIScrape = async () => {
    if (!aiUrl) return;
    setIsScraping(true);
    try {
      const result = await scrapeWebsiteForBusiness(aiUrl);
      if (result.success) {
        const d = result.data;
        const put = (k: string, v: unknown) => {
          if (v !== undefined && v !== null && v !== "") setValue(k as never, v as never, { shouldDirty: true });
        };
        put("name", d.name); put("name_en", d.name_en); put("tagline", d.tagline);
        put("short_description", d.short_description); put("description", d.description);
        put("sub_category", d.sub_category); put("established_year", d.established_year);
        put("phone", d.phone); put("whatsapp", d.whatsapp); put("contact_email", d.contact_email);
        put("website", d.website); put("instagram", d.instagram); put("telegram", d.telegram);
        put("linkedin", d.linkedin); put("google_maps_url", d.google_maps_url);
        put("address", d.address); put("city", d.city); put("province", d.province);
        put("postal_code", d.postal_code); put("logo_url", d.logo_url);
        put("booking_url", d.booking_url);
        if (d.working_hours && Object.keys(d.working_hours).length) put("working_hours", d.working_hours);
        alert("اطلاعات از سایت خوانده و در فرم قرار گرفت. لطفاً همه را بازبینی کنید و بعد ذخیره کنید.");
      } else {
        alert(result.error || "خطایی رخ داد.");
      }
    } catch (err) {
      alert("خطای شبکه در ارتباط با سرور");
    } finally {
      setIsScraping(false);
    }
  };

  /** Google Places Handlers */
  const onLoad = (autoC: google.maps.places.Autocomplete) => {
    setAutocomplete(autoC);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      let streetNumber = "";
      let route = "";
      let city = "";
      let province = "";
      let postalCode = "";

      place.address_components?.forEach(component => {
        const types = component.types;
        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        } else if (types.includes("locality") || types.includes("postal_town") || types.includes("sublocality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          province = component.short_name; // ON, BC, etc.
        } else if (types.includes("postal_code")) {
          postalCode = component.long_name;
        }
      });

      const formattedAddress = `${streetNumber} ${route}`.trim();
      
      if (formattedAddress) setValue("address", formattedAddress);
      if (city) setValue("city", city);
      if (province) setValue("province", province);
      if (postalCode) setValue("postal_code", postalCode);
    }
  };


  // ============================================================================
  // صفحه موفقیت ارسال مجدد
  // ============================================================================
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-8 bg-white border border-[color:var(--line)] rounded-2xl shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black mb-3">ویرایش‌ها ارسال شدند!</h2>
          <p className="text-[color:var(--muted-text)] leading-loose text-sm mb-8">
            اطلاعات بروز شده کسب‌وکار شما مجدداً به تیم کارشناسان čārana ارسال شد.
            پس از بررسی و تایید، تغییرات در دایرکتوری عمومی اعمال خواهد شد.
          </p>
          <Button onClick={() => router.push("/dashboard/business")}>
            بازگشت به داشبورد
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // رندر اصلی فرم ویرایش
  // ============================================================================
  return (
    <div className="max-w-3xl mx-auto" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black text-[color:var(--text)]">ویرایش کسب‌وکار</h1>
          <p className="text-sm text-[color:var(--muted-text)] mt-1 flex items-center gap-2">
            {initialData.name}
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSaveDraft(true)}
          disabled={isSavingDraft}
          className={`gap-2 text-xs border transition-all ${draftSaved ? "border-green-400 text-green-700 bg-green-50" : "border-[color:var(--line)]"}`}
        >
          {isSavingDraft ? <Loader2 size={14} className="animate-spin" /> : draftSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
          {draftSaved ? "ذخیره شد!" : "ذخیره موقت"}
        </Button>
      </div>

      {/* هشدار وضعیت (اگر نیاز به اصلاح یا رد شده) */}
      {(currentStatus === "NEEDS_CHANGES" || currentStatus === "REJECTED") && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${currentStatus === "REJECTED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <AlertTriangle size={20} className={currentStatus === "REJECTED" ? "text-red-600" : "text-amber-600"} />
          <div>
            <p className={`font-bold text-sm ${currentStatus === "REJECTED" ? "text-red-900" : "text-amber-900"}`}>
              {statusInfo.hint}
            </p>
            <p className="text-xs mt-1 text-gray-600">
              پس از اصلاح اطلاعات، از مرحله آخر روی «ارسال مجدد برای بررسی» کلیک کنید.
            </p>
          </div>
        </div>
      )}

      {/* AI Auto-Fill Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-8 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Wand2 size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-blue-900 mb-1">تکمیل خودکار با هوش مصنوعی</h3>
            <p className="text-sm text-blue-700/80 mb-4">آدرس وب‌سایت خود را وارد کنید تا هوش مصنوعی چارانا اطلاعات اولیه را خوانده و فرم را برای شما پر کند.</p>
            <div className="flex gap-2">
              <Input 
                value={aiUrl} 
                onChange={e => setAiUrl(e.target.value)} 
                dir="ltr" 
                placeholder="https://example.com" 
                className="h-11 rounded-xl bg-white flex-1 border-blue-200" 
              />
              <Button 
                type="button"
                onClick={handleAIScrape}
                disabled={isScraping || !aiUrl} 
                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {isScraping ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                بررسی سایت
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
        <div
          className="bg-[color:var(--lajvard)] h-full rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
        />
      </div>

      {/* Stepper */}
      <div className="flex items-start w-full mb-8 overflow-x-auto pb-2 gap-1">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
              disabled={step.id > currentStep}
              className={`flex flex-col items-center gap-1.5 min-w-[60px] transition-all ${step.id <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                isCompleted ? "bg-green-500 border-green-500 text-white"
                : isCurrent ? "bg-[color:var(--lajvard)] border-[color:var(--lajvard)] text-white shadow-md shadow-[color:var(--lajvard)]/30"
                : "bg-white border-gray-200 text-gray-400"
              }`}>
                {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-[10px] font-medium text-center whitespace-nowrap ${isCurrent ? "text-[color:var(--lajvard)] font-bold" : "text-gray-400"}`}>
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[color:var(--line)] overflow-hidden">
        <FormProvider {...methods}>
          <form>
            <div className="p-6 md:p-8 space-y-5">

              {/* ── مرحله ۱: اطلاعات پایه ── */}
              {currentStep === 1 && (
                <StepWrapper title="۱. اطلاعات پایه کسب‌وکار" description="نام، حوزه فعالیت و توضیحات کسب‌وکار را ویرایش کنید.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="نام فارسی" required error={errors.name?.message as string}>
                      <Input {...methods.register("name")} placeholder="رستوران تهران" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="نام انگلیسی">
                      <Input {...methods.register("name_en")} dir="ltr" placeholder="Tehran Restaurant" className="h-11 rounded-xl" />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="دسته‌بندی اصلی" required error={errors.category?.message as string}>
                      <select {...methods.register("category")} className={selectClass}>
                        <option value="">انتخاب...</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </FormField>
                    <FormField label="وضعیت مالکیت">
                      <select {...methods.register("ownership_status")} className={selectClass}>
                        <option value="owner">من صاحب این کسب‌وکار هستم</option>
                        <option value="representative">من نماینده رسمی هستم</option>
                      </select>
                    </FormField>
                  </div>
                  <FormField label="توضیح کوتاه" required error={errors.short_description?.message as string}>
                    <Input {...methods.register("short_description")} placeholder="در یک جمله خود را معرفی کنید..." className="h-11 rounded-xl" />
                  </FormField>
                  <FormField label="توضیح کامل" required error={errors.description?.message as string}>
                    <textarea {...methods.register("description")} rows={5} placeholder="شرح کامل خدمات و ویژگی‌های کسب‌وکار..."
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--lajvard)] focus:border-transparent transition resize-none" />
                  </FormField>
                </StepWrapper>
              )}

              {/* ── مرحله ۲: موقعیت ── */}
              {currentStep === 2 && (
                <StepWrapper title="۲. موقعیت و محدوده خدمات" description="آدرس و محدوده سرویس‌دهی را بروز کنید.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="استان" required error={errors.province?.message as string}>
                      <select {...methods.register("province")} className={selectClass}>
                        <option value="">انتخاب...</option>
                        {PROVINCES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </FormField>
                    <FormField label="شهر" required error={errors.city?.message as string}>
                      <Input {...methods.register("city")} dir="ltr" placeholder="Toronto" className="h-11 rounded-xl" />
                    </FormField>
                  </div>
                  <FormField label="آدرس کامل (تایپ کنید تا پیشنهاد داده شود)" required error={errors.address?.message as string}>
                    {isLoaded ? (
                      <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} className="w-full">
                        <Input {...methods.register("address")} dir="ltr" placeholder="شروع به تایپ آدرس کنید..." className="h-11 rounded-xl" />
                      </Autocomplete>
                    ) : (
                      <Input {...methods.register("address")} dir="ltr" placeholder="123 Main St, Toronto, ON" className="h-11 rounded-xl" />
                    )}
                  </FormField>
                  <FormField label="کد پستی">
                    <Input {...methods.register("postal_code")} dir="ltr" placeholder="M5V 2T6" className="h-11 rounded-xl" />
                  </FormField>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-[color:var(--line)]">
                    <input type="checkbox" id="is_address_public" {...methods.register("is_address_public")} className="w-5 h-5 rounded accent-[color:var(--lajvard)]" />
                    <Label htmlFor="is_address_public" className="cursor-pointer">نمایش آدرس در پروفایل عمومی</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="نحوه خدمات">
                      <select {...methods.register("service_type")} className={selectClass}>
                        <option value="in_person">فقط حضوری</option>
                        <option value="online">فقط آنلاین</option>
                        <option value="both">هم حضوری، هم آنلاین</option>
                      </select>
                    </FormField>
                    <FormField label="محدوده سرویس‌دهی">
                      <select {...methods.register("service_area")} className={selectClass}>
                        <option value="city">فقط شهر</option>
                        <option value="province">سراسر استان</option>
                        <option value="canada">سراسر کانادا</option>
                        <option value="international">بین‌المللی</option>
                      </select>
                    </FormField>
                  </div>
                </StepWrapper>
              )}

              {/* ── مرحله ۳: ارتباطات ── */}
              {currentStep === 3 && (
                <StepWrapper title="۳. راه‌های ارتباطی" description="اطلاعات تماس و شبکه‌های اجتماعی را بروز کنید.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="تلفن" required icon={<Phone size={15} className="text-gray-400" />} error={errors.phone?.message as string}>
                      <Input {...methods.register("phone")} dir="ltr" placeholder="+1 416-000-0000" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="واتساپ" icon={<MessageCircle size={15} className="text-green-500" />}>
                      <Input {...methods.register("whatsapp")} dir="ltr" placeholder="+1 416-000-0000" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="ایمیل" icon={<Mail size={15} className="text-blue-500" />} error={errors.contact_email?.message as string}>
                      <Input {...methods.register("contact_email")} dir="ltr" type="email" placeholder="info@example.com" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="وب‌سایت" icon={<Globe size={15} className="text-indigo-500" />} error={errors.website?.message as string}>
                      <Input {...methods.register("website")} dir="ltr" placeholder="https://example.com" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="اینستاگرام" icon={<Hash size={15} className="text-pink-500" />} error={errors.instagram?.message as string}>
                      <Input {...methods.register("instagram")} dir="ltr" placeholder="https://instagram.com/..." className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="تلگرام" icon={<Send size={15} className="text-sky-500" />} error={errors.telegram?.message as string}>
                      <Input {...methods.register("telegram")} dir="ltr" placeholder="https://t.me/..." className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="لینکدین" icon={<Link2 size={15} className="text-blue-700" />} error={errors.linkedin?.message as string}>
                      <Input {...methods.register("linkedin")} dir="ltr" placeholder="https://linkedin.com/company/..." className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="گوگل مپ" icon={<MapPin size={15} className="text-red-500" />} error={errors.google_maps_url?.message as string}>
                      <Input {...methods.register("google_maps_url")} dir="ltr" placeholder="https://maps.google.com/..." className="h-11 rounded-xl" />
                    </FormField>
                  </div>
                </StepWrapper>
              )}

              {/* ── مرحله ۴: اعتبار ── */}
              {currentStep === 4 && (
                <StepWrapper title="۴. جزئیات اعتماد و اعتبار" description="اطلاعات محرمانه که فقط برای تیم čārana قابل مشاهده است.">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                    <ShieldCheck size={18} className="text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-900">این اطلاعات هرگز در پروفایل عمومی نمایش داده نمی‌شود.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="شماره ثبت شرکت" hint="اختیاری">
                      <Input {...methods.register("business_number")} dir="ltr" placeholder="Business Number" className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="لایسنس حرفه‌ای">
                      <Input {...methods.register("license_info")} placeholder="مثال: RECO" className="h-11 rounded-xl" />
                    </FormField>
                  </div>
                  <FormField label="زبان‌های خدمات" required hint="چند زبان قابل انتخاب است">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {LANGUAGES.map(lang => {
                        const langs = watch("languages") || [];
                        const isSelected = langs.includes(lang);
                        return (
                          <button key={lang} type="button"
                            onClick={() => setValue("languages", isSelected ? langs.filter(l => l !== lang) : [...langs, lang])}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${isSelected ? "bg-[color:var(--lajvard)] border-[color:var(--lajvard)] text-white" : "bg-white border-[color:var(--line)] hover:border-[color:var(--lajvard)]"}`}>
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <input type="checkbox" id="is_iranian_owned" {...methods.register("is_iranian_owned")} className="w-5 h-5 rounded accent-[color:var(--lajvard)]" />
                    <Label htmlFor="is_iranian_owned" className="cursor-pointer font-semibold">این کسب‌وکار ایرانی-کانادایی است</Label>
                  </div>
                </StepWrapper>
              )}

              {/* ── مرحله ۵: رسانه ── */}
              {currentStep === 5 && (
                <StepWrapper title="۵. رسانه و هویت بصری" description="لوگو، کاور و شعار کسب‌وکار را بروز کنید.">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField label="لوگو" hint="حداکثر ۲ مگابایت">
                      <Controller name="logo_url" control={methods.control}
                        render={({ field }) => <ImageUploader label="آپلود لوگو" value={field.value} onChange={field.onChange} maxSizeMB={2} folderPath="logos" />} />
                    </FormField>
                    <FormField label="تصویر کاور" hint="حداکثر ۵ مگابایت">
                      <Controller name="cover_url" control={methods.control}
                        render={({ field }) => <ImageUploader label="آپلود کاور" value={field.value} onChange={field.onChange} maxSizeMB={5} folderPath="covers" />} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="شعار (Tagline)">
                      <Input {...methods.register("tagline")} placeholder="کیفیت تضمینی..." className="h-11 rounded-xl" />
                    </FormField>
                    <FormField label="رنگ برند (Hex)">
                      <div className="flex gap-2">
                        <input type="color" defaultValue={watch("brand_color") || "#6C2BD9"}
                          onChange={(e) => setValue("brand_color", e.target.value)}
                          className="h-11 w-14 rounded-xl border border-[color:var(--line)] cursor-pointer p-1" />
                        <Input {...methods.register("brand_color")} dir="ltr" placeholder="#6C2BD9" className="h-11 rounded-xl flex-1" />
                      </div>
                    </FormField>
                  </div>

                  <FormField label="آدرس اختصاصی">
                    <VanityUrlEditor business={{ id: businessId, plan: initialData.plan, plan_until: initialData.plan_until, vanity_slug: initialData.vanity_slug }} />
                  </FormField>

                  <FormField label="نمایش نام صاحب کسب‌وکار">
                    <OwnerVisibilityToggle
                      business={{
                        id: businessId,
                        plan: initialData.plan,
                        plan_until: initialData.plan_until,
                        hide_owner: initialData.hide_owner,
                        owner_name: ownerIdentity.name,
                        verified: ownerIdentity.verified,
                      }}
                    />
                  </FormField>

                  <Controller
                    name="gallery_urls"
                    control={methods.control}
                    render={({ field: photoField }) => (
                      <Controller
                        name="gallery_video_url"
                        control={methods.control}
                        render={({ field: videoField }) => (
                          <GalleryUploader
                            photos={(photoField.value as string[] | undefined) ?? []}
                            onPhotosChange={photoField.onChange}
                            video={(videoField.value as string | null | undefined) || null}
                            onVideoChange={(url) => videoField.onChange(url ?? "")}
                            photoLimit={galleryEnt.galleryLimit.photos}
                            videoAllowed={galleryEnt.galleryLimit.video}
                            folderPath="gallery"
                            upsellPlanName={nextPlanName}
                          />
                        )}
                      />
                    )}
                  />
                </StepWrapper>
              )}

              {/* ── مرحله ۶: ساعات کاری ── */}
              {currentStep === 6 && (
                <StepWrapper title="۶. ساعات کاری" description="ساعات کاری هفتگی را بروز کنید.">
                  <div className="border border-[color:var(--line)] rounded-xl overflow-hidden">
                    {DAYS_OF_WEEK.map((day, idx) => {
                      const workingHours = watch("working_hours") || {};
                      const dayData = workingHours[day.key] || { open: "09:00", close: "18:00", closed: false };
                      const isClosed = dayData.closed;
                      const update = (field: string, value: any) => {
                        setValue("working_hours", { ...workingHours, [day.key]: { ...dayData, [field]: value } });
                      };
                      return (
                        <div key={day.key} className={`flex items-center gap-4 px-4 py-3 ${idx < 6 ? "border-b border-[color:var(--line)]" : ""} ${isClosed ? "bg-gray-50" : "bg-white"}`}>
                          <input type="checkbox" checked={isClosed} onChange={(e) => update("closed", e.target.checked)} className="w-4 h-4 rounded accent-red-500" />
                          <span className={`w-20 text-sm font-medium ${isClosed ? "text-gray-400 line-through" : ""}`}>{day.label}</span>
                          {!isClosed ? (
                            <div className="flex items-center gap-2 flex-1" dir="ltr">
                              <input type="time" value={dayData.open} onChange={(e) => update("open", e.target.value)} className="flex-1 h-9 border border-[color:var(--line)] rounded-lg px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--lajvard)]" />
                              <span className="text-xs text-gray-400">تا</span>
                              <input type="time" value={dayData.close} onChange={(e) => update("close", e.target.value)} className="flex-1 h-9 border border-[color:var(--line)] rounded-lg px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--lajvard)]" />
                            </div>
                          ) : <span className="text-xs text-gray-400 flex-1">تعطیل</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <input type="checkbox" id="accepts_appointments" {...methods.register("accepts_appointments")} className="w-5 h-5 rounded accent-[color:var(--lajvard)]" />
                    <Label htmlFor="accepts_appointments" className="cursor-pointer font-semibold">امکان رزرو وقت قبلی</Label>
                  </div>
                  {watch("accepts_appointments") && (
                    <FormField label="لینک رزرو آنلاین" error={errors.booking_url?.message as string}>
                      <Input {...methods.register("booking_url")} dir="ltr" placeholder="https://calendly.com/..." className="h-11 rounded-xl" />
                    </FormField>
                  )}
                </StepWrapper>
              )}

              {/* ── مرحله ۷: ارسال مجدد ── */}
              {currentStep === 7 && (
                <StepWrapper title="۷. ارسال مجدد برای بررسی" description="اطلاعات ویرایش‌شده را برای بررسی مجدد توسط تیم čārana ارسال کنید.">
                  {/* خلاصه تغییرات */}
                  <div className="space-y-3">
                    <ReviewSection title="اطلاعات پایه">
                      <ReviewRow label="نام" value={getValues("name")} />
                      <ReviewRow label="دسته‌بندی" value={getValues("category")} />
                      <ReviewRow label="توضیح کوتاه" value={getValues("short_description")} />
                    </ReviewSection>
                    <ReviewSection title="موقعیت">
                      <ReviewRow label="شهر" value={`${getValues("province")} / ${getValues("city")}`} />
                      <ReviewRow label="آدرس" value={getValues("address")} dir="ltr" />
                    </ReviewSection>
                    <ReviewSection title="ارتباطات">
                      <ReviewRow label="تلفن" value={getValues("phone")} dir="ltr" />
                      <ReviewRow label="وب‌سایت" value={getValues("website")} dir="ltr" />
                    </ReviewSection>
                  </div>

                  {/* دکمه‌های بازگشت به مراحل */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {STEPS.slice(0, 6).map(s => (
                      <button key={s.id} type="button" onClick={() => setCurrentStep(s.id)}
                        className="text-xs text-[color:var(--lajvard)] border border-[color:var(--lajvard)]/30 bg-[color:var(--lajvard)]/5 px-3 py-1 rounded-lg hover:bg-[color:var(--lajvard)]/10 transition">
                        ویرایش: {s.title}
                      </button>
                    ))}
                  </div>

                  {/* هشدار تایید مجدد */}
                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 mt-4">
                    <p className="text-sm text-blue-900 leading-relaxed">
                      <strong>⚡ نکته مهم:</strong> با کلیک روی «ارسال مجدد»، وضعیت کسب‌وکار شما به
                      <strong> «در انتظار تایید»</strong> تغییر می‌کند. تغییرات شما تا تایید مجدد توسط ادمین در دایرکتوری عمومی نمایش داده نمی‌شود.
                    </p>
                  </div>
                </StepWrapper>
              )}
            </div>

            {/* Footer Nav */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-t border-[color:var(--line)] bg-gray-50/50">
              <Button type="button" variant="ghost" onClick={handlePrev} disabled={currentStep === 1 || isSubmitting} className="gap-2">
                <ArrowRight size={16} />
                مرحله قبل
              </Button>

              <span className="text-sm text-[color:var(--muted-text)]">{currentStep} / ۷</span>

              {currentStep < 7 ? (
                <Button type="button" onClick={handleNext} className="gap-2 bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white px-6">
                  مرحله بعد
                  <ArrowLeft size={16} />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleResubmit}
                  disabled={isSubmitting}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[180px] px-6"
                >
                  {isSubmitting
                    ? <><Loader2 size={16} className="animate-spin" /> ارسال...</>
                    : <><CheckCircle2 size={16} /> ارسال مجدد برای بررسی</>
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
// کامپوننت‌های کمکی
// ============================================================================

function StepWrapper({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="pb-4 border-b border-[color:var(--line)]">
        <h3 className="text-xl font-extrabold text-[color:var(--text)]">{title}</h3>
        <p className="text-sm text-[color:var(--muted-text)] mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, hint, error, icon, children }: {
  label: string; required?: boolean; hint?: string; error?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-2 font-semibold text-sm">
        {icon}{label}{required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-[color:var(--muted-text)]">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">⚠ {error}</p>}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-[color:var(--line)]">
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <div className="divide-y divide-[color:var(--line)] px-4">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, dir }: { label: string; value?: string; dir?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 text-sm gap-4">
      <span className="text-[color:var(--muted-text)] shrink-0">{label}</span>
      <span className="font-medium text-left truncate" dir={dir || "rtl"}>{value}</span>
    </div>
  );
}
