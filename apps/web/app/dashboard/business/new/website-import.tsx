// ============================================================================
// Source: app/dashboard/business/new/website-import.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The optional "step zero" of business onboarding. Asks the owner whether
//      we should read their website for them, runs the AI import, shows what
//      was found field by field, and hands the result to the form as a
//      prefill. Nothing here saves anything — the owner still walks the seven
//      steps, now mostly reviewing instead of typing.
// Env / Identity: Client component; calls the signed-in-only server action.
// ============================================================================
"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Loader2,
  PenLine,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scrapeWebsiteForBusiness, type ScrapedBusiness } from "../ai-actions";

const FIELD_LABELS: Record<string, string> = {
  name: "نام کسب‌وکار",
  name_en: "نام انگلیسی",
  tagline: "شعار",
  short_description: "توضیح کوتاه",
  description: "توضیح کامل",
  category_slug: "دسته‌بندی",
  sub_category: "زیرشاخه",
  established_year: "سال تأسیس",
  phone: "تلفن",
  whatsapp: "واتساپ",
  contact_email: "ایمیل",
  website: "وب‌سایت",
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  linkedin: "لینکدین",
  google_maps_url: "نقشه گوگل",
  address: "آدرس",
  city: "شهر",
  province: "استان",
  postal_code: "کد پستی",
  languages: "زبان‌ها",
  services: "خدمات",
  working_hours: "ساعات کاری",
  accepts_appointments: "نوبت‌دهی",
  booking_url: "لینک رزرو",
  logo_url: "لوگو",
};

/** Human preview of one extracted value for the "what we found" list. */
function preview(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (key === "services") return `${value.length} مورد`;
    return value.join("، ");
  }
  if (typeof value === "object") {
    const n = Object.values(value as object).filter(Boolean).length;
    return n ? `${n} روز` : "";
  }
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  const s = String(value);
  return s.length > 70 ? s.slice(0, 70) + "…" : s;
}

const STAGES = [
  "در حال باز کردن سایت شما…",
  "در حال خواندن صفحه‌های درباره‌ما و تماس…",
  "در حال استخراج اطلاعات با هوش مصنوعی…",
  "در حال آماده کردن پیش‌نویس…",
];

export function WebsiteImport({
  categories,
  onApply,
  onSkip,
}: {
  categories: { value: string; label: string }[];
  /** Called with the extracted data when the owner accepts the preview. */
  onApply: (data: ScrapedBusiness) => void;
  /** Called when the owner prefers to type everything by hand. */
  onSkip: () => void;
}) {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: ScrapedBusiness; pagesRead: number } | null>(null);

  function run(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setResult(null);
    setStage(0);
    // Advance the reassurance copy on a timer; the real work is one round trip.
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2600);
    start(async () => {
      const res = await scrapeWebsiteForBusiness(url, categories);
      clearInterval(timer);
      if (res.success) setResult({ data: res.data, pagesRead: res.pagesRead });
      else setError(res.error);
    });
  }

  // ---------------------------------------------------------------- preview
  if (result) {
    const { data, pagesRead } = result;
    const found = Object.entries(data).filter(
      ([k, v]) => k !== "confidence" && preview(k, v) !== ""
    );
    const low = new Set(data.confidence?.low ?? []);
    const catLabel = categories.find((c) => c.value === data.category_slug)?.label;

    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[color:var(--text)]">
              {found.length} مورد از سایت شما پیدا شد
            </h2>
            <p className="text-sm text-[color:var(--muted-text)] mt-1 leading-relaxed">
              {pagesRead} صفحه خوانده شد. این‌ها فقط پیشنهادند — در مراحل بعد همه را می‌بینید و
              هر چه لازم بود همان‌جا اصلاح می‌کنید. تا خودتان تایید نکنید چیزی ثبت نمی‌شود.
            </p>
          </div>
        </div>

        <ul className="rounded-2xl border border-[color:var(--line)] divide-y divide-[color:var(--line)] overflow-hidden">
          {found.map(([k, v]) => (
            <li key={k} className="flex items-center gap-3 px-4 py-2.5 text-sm bg-white">
              <span className="w-28 shrink-0 text-[color:var(--muted-text)]">{FIELD_LABELS[k] ?? k}</span>
              <span
                className="flex-1 truncate text-[color:var(--text)]"
                // Direction follows the content: Latin/number-led values read LTR.
                dir={/^[\u0600-\u06FF]/.test(preview(k, v)) ? "rtl" : "ltr"}
                style={{ textAlign: "start" }}
              >
                {k === "category_slug" ? catLabel ?? String(v) : preview(k, v)}
              </span>
              {low.has(k) ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0"
                  title="این مورد خلاصه یا ترجمه شده — لطفاً بازبینی کنید"
                >
                  <AlertTriangle size={11} /> بازبینی
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0">
                  <CheckCircle2 size={11} /> از سایت
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={() => onApply(data)}
            className="bg-[color:var(--annabi)] hover:bg-[#5A1124] text-white h-12 rounded-xl flex-1 gap-2 font-bold"
          >
            <Wand2 size={18} /> با این اطلاعات فرم را پر کن
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setResult(null)}
            className="h-12 rounded-xl border border-[color:var(--line)]"
          >
            آدرس دیگری امتحان کنم
          </Button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-[color:var(--muted-text)] underline underline-offset-4"
        >
          نه، خودم همه را دستی وارد می‌کنم
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------ ask
  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[color:var(--annabi)]/10 text-[color:var(--annabi)] flex items-center justify-center shrink-0">
          <Sparkles size={22} />
        </div>
        <div>
          <h2 className="text-lg font-black text-[color:var(--text)]">
            دوست دارید ما اطلاعات را از سایت‌تان بخوانیم؟
          </h2>
          <p className="text-sm text-[color:var(--muted-text)] mt-1 leading-relaxed">
            آدرس وب‌سایت کسب‌وکارتان را بدهید؛ نام، توضیحات، راه‌های تماس، آدرس، خدمات و ساعات
            کاری را از آن برمی‌داریم و فرم را برایتان پر می‌کنیم. بعد شما همه را مرور و تایید می‌کنید.
          </p>
        </div>
      </div>

      <form onSubmit={run} className="space-y-3">
        <div className="relative">
          <Globe
            size={18}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[color:var(--muted-text)]"
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="www.example.com"
            dir="ltr"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            disabled={pending}
            className="h-12 rounded-xl pr-11 text-left"
          />
        </div>

        {pending ? (
          <div className="rounded-xl bg-[color:var(--bg)] border border-[color:var(--line)] px-4 py-3 flex items-center gap-3 text-sm">
            <Loader2 size={18} className="animate-spin text-[color:var(--annabi)] shrink-0" />
            <span className="text-[color:var(--text)]">{STAGES[stage]}</span>
            <span className="text-[color:var(--muted-text)] text-xs mr-auto">معمولاً کمتر از یک دقیقه</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <Button
            type="submit"
            disabled={pending || !url.trim()}
            className="bg-[color:var(--annabi)] hover:bg-[#5A1124] text-white h-12 rounded-xl flex-1 gap-2 font-bold"
          >
            {pending ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            بخوان و فرم را پر کن
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={pending}
            className="h-12 rounded-xl border border-[color:var(--line)] gap-2"
          >
            <PenLine size={16} /> خودم وارد می‌کنم
            <ArrowLeft size={14} />
          </Button>
        </div>
      </form>

      <p className="text-[11px] text-[color:var(--muted-text)] leading-relaxed">
        فقط صفحه‌های عمومی سایت خوانده می‌شود. اطلاعات محرمانه‌ی مرحله‌ی «اعتبار» (شماره ثبت، مجوز)
        هرگز از سایت برداشته نمی‌شود و همیشه دست خودتان است.
      </p>
    </div>
  );
}
