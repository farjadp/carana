// ============================================================================
// Source: apps/mobile/src/app/register/form.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The seven-step registration form on mobile — the same steps, the same
//      shared zod schemas and the same draft/submit contract as the web, laid
//      out for a phone: one scrolling card per step, chips instead of selects,
//      a per-step "from your site" banner when the import ran, and a review
//      step that repeats what deserves a second read.
// Env / Identity: Signed-in user. Draft saved once per step; submit is strict.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, ChevronLeft, ChevronRight, PlusCircle, Trash2 } from "lucide-react-native";
import {
  step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema,
  PROVINCES, type BusinessFormData,
} from "@charana/core";

import { BrandMark } from "../../components/brand-mark";
import { Alert, PrimaryButton } from "../../components/ui";
import {
  Card, Choice, HoursEditor, ImportBanner, MultiChoice, StepHeader, TextField, Toggle, type Hours,
} from "../../components/register-fields";
import { useRegistration } from "../../context/registration";
import { listCategories, type Category } from "../../lib/businesses";
import { saveDraft, submitBusiness } from "../../lib/register";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const STEP_TITLES = ["اطلاعات پایه", "موقعیت", "ارتباطات", "اعتبار", "رسانه", "ساعات کاری", "بازبینی"];
const SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema];

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
const LANGUAGES = ["فارسی", "انگلیسی", "فرانسوی", "عربی", "ترکی", "سایر"];

type Errors = Partial<Record<keyof BusinessFormData, string>>;

export default function RegisterFormScreen() {
  const router = useRouter();
  const { data, set, imported, businessId, setBusinessId, reset } = useRegistration();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [agree, setAgree] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
  }, []);

  const stepImported = useMemo(
    () => (imported ? (STEP_FIELDS[step] ?? []).filter((f) => imported.fields.has(f)) : []),
    [imported, step]
  );
  const stepReview = useMemo(() => stepImported.filter((f) => imported?.review.has(f)), [stepImported, imported]);

  const validate = (n: number): boolean => {
    const schema = SCHEMAS[n - 1];
    if (!schema) return true;
    const r = schema.safeParse(data);
    if (r.success) {
      setErrors({});
      return true;
    }
    const e: Errors = {};
    for (const issue of r.error.issues) {
      const k = issue.path[0] as keyof BusinessFormData;
      if (k && !e[k]) e[k] = issue.message;
    }
    setErrors(e);
    return false;
  };

  const next = async () => {
    if (!validate(step)) return;
    setBusy(true);
    // One draft row per session: await the first save so businessId settles.
    const res = await saveDraft(data, businessId);
    setBusy(false);
    if (res.success) setBusinessId(res.businessId);
    setStep((s) => Math.min(s + 1, 7));
  };
  const prev = () => {
    setErrors({});
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  };

  const submit = async () => {
    setSubmitError(null);
    setBusy(true);
    const res = await submitBusiness(data, businessId);
    setBusy(false);
    if (res.success) {
      setDone(true);
      return;
    }
    if (res.issues) {
      const firstBad = Object.keys(res.issues)[0];
      const stepOf = Object.entries(STEP_FIELDS).find(([, fs]) => fs.includes(firstBad))?.[0];
      const e: Errors = {};
      for (const [k, v] of Object.entries(res.issues)) if (v?.[0]) e[k as keyof BusinessFormData] = v[0];
      setErrors(e);
      setSubmitError(`بعضی فیلدها ناقص‌اند${stepOf ? ` — از مرحله‌ی ${stepOf} شروع کنید` : ""}.`);
      if (stepOf) setStep(Number(stepOf));
      return;
    }
    setSubmitError(res.error);
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.doneWrap}>
          <View style={styles.doneIcon}><CheckCircle2 size={44} color={colors.success} /></View>
          <Text style={[type.h1, { fontSize: 22, textAlign: "center" }]}>اطلاعات کسب‌وکار دریافت شد</Text>
          <Text style={[type.body, { color: colors.mutedText, textAlign: "center" }]}>
            پروفایل شما به‌عنوان «ارسال‌شده برای بررسی» ثبت شد. تیم چارانا آن را بررسی می‌کند و پس از تایید،
            در دایرکتوری منتشر می‌شود — معمولاً ۲ تا ۵ روز کاری.
          </Text>
          <View style={{ alignSelf: "stretch", marginTop: space.sm }}>
            <PrimaryButton label="بازگشت" onPress={() => { reset(); router.replace("/register"); }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const cats = categories.map((c) => ({ value: c.slug, label: c.name }));
  const services = data.services ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.nav}>
          <Pressable onPress={prev} hitSlop={10} style={styles.back}>
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.navTitle}>ثبت کسب‌وکار</Text>
            <Text style={type.muted}>مرحله {step} از ۷ · {STEP_TITLES[step - 1]}</Text>
          </View>
          <BrandMark size={26} simple />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step - 1) / 6) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step < 7 ? (
            <ImportBanner filled={stepImported.map((f) => FIELD_FA[f] ?? f)} review={stepReview.map((f) => FIELD_FA[f] ?? f)} />
          ) : null}

          {/* ---------------------------------------------------- 1 */}
          {step === 1 ? (
            <Card>
              <StepHeader n={1} title="اطلاعات پایه" description="نام، حوزه‌ی فعالیت و توضیحات اصلی — پایه‌ی پروفایل عمومی شما." />
              <TextField label="نام فارسی کسب‌وکار" required value={data.name} onChangeText={(t) => set("name", t)} placeholder="مثال: رستوران تهران" error={errors.name} />
              <TextField label="نام انگلیسی یا لاتین" latin value={data.name_en ?? ""} onChangeText={(t) => set("name_en", t)} placeholder="Tehran Restaurant" error={errors.name_en} />
              <Choice label="دسته‌بندی اصلی" required options={cats} value={data.category} onChange={(v) => set("category", v)} error={errors.category} />
              <TextField label="زیردسته (اختیاری)" value={data.sub_category ?? ""} onChangeText={(t) => set("sub_category", t)} placeholder="مثال: غذاهای ایرانی" />
              <Choice label="وضعیت مالکیت" required options={[{ value: "owner", label: "صاحب کسب‌وکار هستم" }, { value: "representative", label: "نماینده‌ی رسمی هستم" }]} value={data.ownership_status} onChange={(v) => set("ownership_status", v)} />
              <TextField label="سال شروع فعالیت" latin value={data.established_year ?? ""} onChangeText={(t) => set("established_year", t)} placeholder="2018" keyboardType="number-pad" maxLength={4} error={errors.established_year} />
              <TextField label="توضیح کوتاه (یک خطی)" required value={data.short_description} onChangeText={(t) => set("short_description", t)} placeholder="در یک جمله چه می‌کنید؟" hint={`${data.short_description.length} / 120`} maxLength={120} error={errors.short_description} />
              <TextField label="توضیح کامل" required multiline value={data.description} onChangeText={(t) => set("description", t)} placeholder="داستان، خدمات و تمایز شما" hint="حداقل ۵۰ حرف" error={errors.description} />

              <View style={{ gap: space.sm }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.label}>سرویس‌ها و تعرفه‌ها (اختیاری)</Text>
                  <Pressable onPress={() => set("services", [...services, { name: "" }])} style={styles.addBtn} hitSlop={6}>
                    <PlusCircle size={16} color={colors.lajvard} />
                    <Text style={styles.addBtnText}>افزودن</Text>
                  </Pressable>
                </View>
                {services.map((sv, i) => (
                  <View key={i} style={styles.serviceBox}>
                    <View style={{ flexDirection: "row-reverse", gap: space.sm, alignItems: "center" }}>
                      <TextField label={`سرویس ${i + 1}`} value={sv.name} onChangeText={(t) => set("services", services.map((x, j) => (j === i ? { ...x, name: t } : x)))} placeholder="نام سرویس" style={{ flex: 1 }} />
                      <Pressable onPress={() => set("services", services.filter((_, j) => j !== i))} hitSlop={8} style={{ paddingTop: 22 }}>
                        <Trash2 size={18} color={colors.annabi} />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: "row-reverse", gap: space.sm }}>
                      <View style={{ flex: 1 }}><TextField label="قیمت" latin value={sv.price ?? ""} onChangeText={(t) => set("services", services.map((x, j) => (j === i ? { ...x, price: t } : x)))} placeholder="120" keyboardType="decimal-pad" /></View>
                      <View style={{ flex: 1 }}><TextField label="واحد" value={sv.price_unit ?? ""} onChangeText={(t) => set("services", services.map((x, j) => (j === i ? { ...x, price_unit: t } : x)))} placeholder="ساعت / جلسه" /></View>
                    </View>
                    <TextField label="توضیح" value={sv.description ?? ""} onChangeText={(t) => set("services", services.map((x, j) => (j === i ? { ...x, description: t } : x)))} placeholder="اختیاری" />
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 2 */}
          {step === 2 ? (
            <Card>
              <StepHeader n={2} title="موقعیت" description="کجا هستید و به کجا خدمات می‌دهید." />
              <Choice label="استان" required options={PROVINCES.map((p) => ({ value: p.code, label: p.name }))} value={data.province} onChange={(v) => set("province", v)} error={errors.province} />
              <TextField label="شهر" required latin value={data.city} onChangeText={(t) => set("city", t)} placeholder="Toronto" error={errors.city} hint="نام انگلیسی شهر، همان‌طور که در آدرس‌ها می‌آید" />
              <TextField label="آدرس" required latin value={data.address} onChangeText={(t) => set("address", t)} placeholder="211 Finch Avenue West" error={errors.address} />
              <TextField label="کد پستی" latin value={data.postal_code ?? ""} onChangeText={(t) => set("postal_code", t)} placeholder="M2R 1M2" autoCapitalize="characters" />
              <Toggle label="آدرس عمومی نمایش داده شود" hint="اگر خاموش باشد فقط شهر نمایش داده می‌شود." value={data.is_address_public} onChange={(v) => set("is_address_public", v)} />
              <Choice label="نوع خدمات" required options={[{ value: "in_person", label: "حضوری" }, { value: "online", label: "آنلاین" }, { value: "both", label: "هر دو" }]} value={data.service_type} onChange={(v) => set("service_type", v)} />
              <Choice label="محدوده‌ی خدمات" required options={[{ value: "city", label: "شهر" }, { value: "province", label: "استان" }, { value: "canada", label: "سراسر کانادا" }, { value: "international", label: "بین‌المللی" }]} value={data.service_area} onChange={(v) => set("service_area", v)} />
              <TextField label="لینک گوگل‌مپ" latin value={data.google_maps_url ?? ""} onChangeText={(t) => set("google_maps_url", t)} placeholder="https://maps.google.com/…" keyboardType="url" error={errors.google_maps_url} />
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 3 */}
          {step === 3 ? (
            <Card>
              <StepHeader n={3} title="ارتباطات" description="مشتری‌ها چطور به شما برسند." />
              <TextField label="تلفن" required latin value={data.phone} onChangeText={(t) => set("phone", t)} placeholder="+14165551234" keyboardType="phone-pad" error={errors.phone} />
              <TextField label="واتساپ" latin value={data.whatsapp ?? ""} onChangeText={(t) => set("whatsapp", t)} placeholder="+14165551234" keyboardType="phone-pad" error={errors.whatsapp} />
              <TextField label="ایمیل تماس" latin value={data.contact_email ?? ""} onChangeText={(t) => set("contact_email", t)} placeholder="info@example.com" keyboardType="email-address" error={errors.contact_email} />
              <TextField label="وب‌سایت" latin value={data.website ?? ""} onChangeText={(t) => set("website", t)} placeholder="https://example.com" keyboardType="url" error={errors.website} />
              <TextField label="اینستاگرام" latin value={data.instagram ?? ""} onChangeText={(t) => set("instagram", t)} placeholder="https://instagram.com/…" keyboardType="url" error={errors.instagram} />
              <TextField label="تلگرام" latin value={data.telegram ?? ""} onChangeText={(t) => set("telegram", t)} placeholder="https://t.me/…" keyboardType="url" error={errors.telegram} />
              <TextField label="لینکدین" latin value={data.linkedin ?? ""} onChangeText={(t) => set("linkedin", t)} placeholder="https://linkedin.com/company/…" keyboardType="url" error={errors.linkedin} />
              <Choice label="روش تماس ترجیحی" options={[{ value: "phone", label: "تلفن" }, { value: "whatsapp", label: "واتساپ" }, { value: "email", label: "ایمیل" }]} value={data.preferred_contact} onChange={(v) => set("preferred_contact", v)} />
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 4 */}
          {step === 4 ? (
            <Card>
              <StepHeader n={4} title="اعتبار" description="این بخش محرمانه است و فقط برای بررسی تیم چارانا استفاده می‌شود؛ هرگز عمومی نمی‌شود." />
              <MultiChoice label="زبان‌های ارائه‌ی خدمات" options={LANGUAGES} value={data.languages} onChange={(v) => set("languages", v)} error={errors.languages} />
              <Toggle label="کسب‌وکار ایرانی-کانادایی است" value={data.is_iranian_owned} onChange={(v) => set("is_iranian_owned", v)} />
              <TextField label="شماره ثبت شرکت (اختیاری)" latin value={data.business_number ?? ""} onChangeText={(t) => set("business_number", t)} placeholder="BN / Corporation #" />
              <TextField label="مجوز یا لایسنس حرفه‌ای (اختیاری)" value={data.license_info ?? ""} onChangeText={(t) => set("license_info", t)} placeholder="مثال: CICC #R123456" />
              <TextField label="توضیح برای تایید مالکیت (اختیاری)" multiline value={data.verification_notes ?? ""} onChangeText={(t) => set("verification_notes", t)} placeholder="هر چیزی که به ما کمک کند مالکیت شما را تایید کنیم" />
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 5 */}
          {step === 5 ? (
            <Card>
              <StepHeader n={5} title="رسانه" description="هویت بصری پروفایل. آپلود تصویر از اپ به‌زودی؛ فعلاً می‌توانید لینک بدهید یا خالی بگذارید." />
              <TextField label="لینک لوگو" latin value={data.logo_url ?? ""} onChangeText={(t) => set("logo_url", t)} placeholder="https://…/logo.png" keyboardType="url" />
              <TextField label="شعار (اختیاری)" value={data.tagline ?? ""} onChangeText={(t) => set("tagline", t)} placeholder="یک جمله‌ی کوتاه" maxLength={100} />
              <TextField label="رنگ برند (اختیاری)" latin value={data.brand_color ?? ""} onChangeText={(t) => set("brand_color", t)} placeholder="#800000" maxLength={7} error={errors.brand_color} />
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 6 */}
          {step === 6 ? (
            <Card>
              <StepHeader n={6} title="ساعات کاری" description="روزهایی که بازید را روشن کنید و ساعت بدهید." />
              <HoursEditor value={(data.working_hours ?? {}) as Hours} onChange={(h) => set("working_hours", h)} />
              <Toggle label="نوبت‌دهی / رزرو دارید" value={data.accepts_appointments} onChange={(v) => set("accepts_appointments", v)} />
              {data.accepts_appointments ? (
                <TextField label="لینک رزرو آنلاین" latin value={data.booking_url ?? ""} onChangeText={(t) => set("booking_url", t)} placeholder="https://…" keyboardType="url" error={errors.booking_url} />
              ) : null}
            </Card>
          ) : null}

          {/* ---------------------------------------------------- 7 */}
          {step === 7 ? (
            <Card>
              <StepHeader n={7} title="بازبینی و ارسال" description="همه را یک بار دیگر ببینید. برای اصلاح به هر مرحله برگردید." />
              {imported && imported.review.size > 0 ? (
                <View style={styles.reviewWarn}>
                  <Text style={styles.reviewWarnTitle}>قبل از ارسال، این موارد را که از سایت‌تان خلاصه یا ترجمه شده یک بار دیگر بخوانید:</Text>
                  <Text style={styles.reviewWarnBody}>{[...imported.review].map((f) => FIELD_FA[f] ?? f).join("، ")}</Text>
                </View>
              ) : null}
              <ReviewGroup title="اطلاعات پایه" onEdit={() => setStep(1)}>
                <Row k="نام" v={data.name} />
                <Row k="نام انگلیسی" v={data.name_en} ltr />
                <Row k="دسته‌بندی" v={cats.find((c) => c.value === data.category)?.label ?? data.category} />
                <Row k="توضیح کوتاه" v={data.short_description} />
                <Row k="خدمات" v={services.length ? `${services.length.toLocaleString("fa-IR")} مورد` : ""} />
              </ReviewGroup>
              <ReviewGroup title="موقعیت" onEdit={() => setStep(2)}>
                <Row k="استان / شهر" v={[data.province, data.city].filter(Boolean).join(" / ")} ltr />
                <Row k="آدرس" v={data.address} ltr />
                <Row k="نوع خدمات" v={{ in_person: "حضوری", online: "آنلاین", both: "حضوری و آنلاین" }[data.service_type]} />
              </ReviewGroup>
              <ReviewGroup title="ارتباطات" onEdit={() => setStep(3)}>
                <Row k="تلفن" v={data.phone} ltr />
                <Row k="ایمیل" v={data.contact_email} ltr />
                <Row k="وب‌سایت" v={data.website} ltr />
                <Row k="اینستاگرام" v={data.instagram} ltr />
              </ReviewGroup>
              <ReviewGroup title="ساعات کاری" onEdit={() => setStep(6)}>
                <Row k="روزهای ثبت‌شده" v={Object.keys(data.working_hours ?? {}).length ? Object.keys(data.working_hours ?? {}).length.toLocaleString("fa-IR") : ""} />
                <Row k="نوبت‌دهی" v={data.accepts_appointments ? "بله" : "خیر"} />
              </ReviewGroup>

              <Pressable onPress={() => setAgree((a) => !a)} style={styles.agreeRow}>
                <View style={[styles.checkbox, agree && styles.checkboxOn]}>
                  {agree ? <CheckCircle2 size={16} color={colors.onAnnabi} /> : null}
                </View>
                <Text style={styles.agreeText}>
                  تایید می‌کنم اطلاعات واردشده صحیح و واقعی است و می‌پذیرم انتشار نهایی پس از بررسی تیم چارانا انجام می‌شود.
                </Text>
              </Pressable>
              {submitError ? <Alert tone="error">{submitError}</Alert> : null}
            </Card>
          ) : null}

          <View style={{ height: 96 }} />
        </ScrollView>

        {/* Sticky footer */}
        <View style={styles.footer}>
          <Pressable onPress={prev} style={styles.footerGhost} disabled={busy}>
            <ChevronRight size={18} color={colors.text} />
            <Text style={styles.footerGhostText}>{step === 1 ? "بازگشت" : "مرحله قبل"}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            {step < 7 ? (
              <PrimaryButton label="مرحله بعد" onPress={next} loading={busy} />
            ) : (
              <PrimaryButton label="ارسال برای بررسی" onPress={submit} loading={busy} disabled={!agree} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.reviewGroup}>
      <View style={styles.reviewHead}>
        <Text style={styles.reviewTitle}>{title}</Text>
        <Pressable onPress={onEdit} hitSlop={6} style={{ flexDirection: "row-reverse", alignItems: "center", gap: 2 }}>
          <Text style={styles.editText}>ویرایش</Text>
          <ChevronLeft size={14} color={colors.lajvard} />
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function Row({ k, v, ltr }: { k: string; v?: string | null; ltr?: boolean }) {
  if (!v) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowK}>{k}</Text>
      <Text style={[styles.rowV, ltr && { writingDirection: "ltr", textAlign: "left" }]} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  navTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  back: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", ...shadow.card,
  },
  progressTrack: { height: 3, backgroundColor: colors.line, marginHorizontal: space.md, borderRadius: 2, overflow: "hidden", flexDirection: "row-reverse" },
  progressFill: { height: 3, backgroundColor: colors.annabi, borderRadius: 2 },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md },
  label: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  addBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  addBtnText: { fontSize: 13, fontFamily: fonts.bold, color: colors.lajvard },
  serviceBox: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm, gap: space.sm },
  reviewGroup: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  reviewHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bg, paddingHorizontal: space.sm + 2, paddingVertical: 8 },
  reviewTitle: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text },
  editText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.lajvard },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", gap: space.sm, paddingHorizontal: space.sm + 2, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  rowK: { ...type.muted, fontSize: 12.5 },
  rowV: { flex: 1, fontSize: 13.5, fontFamily: fonts.medium, color: colors.text, textAlign: "right" },
  reviewWarn: { backgroundColor: "rgba(217,119,6,0.1)", borderRadius: radius.md, padding: space.sm + 2, gap: 4 },
  reviewWarnTitle: { fontSize: 13, fontFamily: fonts.bold, color: "#92400e", textAlign: "right", lineHeight: 20 },
  reviewWarnBody: { fontSize: 13, fontFamily: fonts.regular, color: "#92400e", textAlign: "right" },
  agreeRow: { flexDirection: "row-reverse", gap: space.sm, alignItems: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxOn: { backgroundColor: colors.annabi, borderColor: colors.annabi },
  agreeText: { flex: 1, ...type.body, fontSize: 13, textAlign: "right" },
  footer: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.sm,
    paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.lg,
    backgroundColor: colors.surface, shadowColor: "#14213d", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8,
  },
  footerGhost: { flexDirection: "row-reverse", alignItems: "center", gap: 2, paddingHorizontal: space.sm, height: 52 },
  footerGhostText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, gap: space.md },
  doneIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: "rgba(15,123,79,0.1)", alignItems: "center", justifyContent: "center" },
});
