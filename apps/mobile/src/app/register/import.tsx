// ============================================================================
// Source: apps/mobile/src/app/register/import.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Step zero of registration on mobile — "shall we read this from your
//      website?" Mirrors the web's website-import.tsx: URL → progress copy →
//      field-by-field preview with از سایت / بازبینی badges → apply → form.
// Env / Identity: Calls /api/mobile/business/import with the user's token.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, CheckCircle2, ChevronRight, Globe, PenLine, Sparkles, Wand2 } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, GhostButton, PrimaryButton } from "../../components/ui";
import { useRegistration } from "../../context/registration";
import { importFromWebsite, type ImportedBusiness } from "../../lib/api";
import { listCategories, type Category } from "../../lib/businesses";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const FIELD_FA: Record<string, string> = {
  name: "نام کسب‌وکار", name_en: "نام انگلیسی", tagline: "شعار", short_description: "توضیح کوتاه",
  description: "توضیح کامل", category_slug: "دسته‌بندی", sub_category: "زیرشاخه",
  established_year: "سال تأسیس", phone: "تلفن", whatsapp: "واتساپ", contact_email: "ایمیل",
  website: "وب‌سایت", instagram: "اینستاگرام", telegram: "تلگرام", linkedin: "لینکدین",
  google_maps_url: "نقشه گوگل", address: "آدرس", city: "شهر", province: "استان",
  postal_code: "کد پستی", languages: "زبان‌ها", services: "خدمات", working_hours: "ساعات کاری",
  accepts_appointments: "نوبت‌دهی", booking_url: "لینک رزرو", logo_url: "لوگو",
};

const STAGES = [
  "در حال باز کردن سایت شما…",
  "در حال خواندن صفحه‌های درباره‌ما و تماس…",
  "در حال استخراج اطلاعات با هوش مصنوعی…",
  "در حال آماده کردن پیش‌نویس…",
];

function preview(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return key === "services" ? `${value.length.toLocaleString("fa-IR")} مورد` : value.join("، ");
  if (typeof value === "object") {
    const n = Object.values(value as object).filter(Boolean).length;
    return n ? `${n.toLocaleString("fa-IR")} روز` : "";
  }
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  const s = String(value);
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}

export default function ImportScreen() {
  const router = useRouter();
  const { applyImport } = useRegistration();
  const [categories, setCategories] = useState<Category[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: ImportedBusiness; pagesRead: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const run = async () => {
    if (!url.trim()) return;
    setError(null);
    setResult(null);
    setStage(0);
    setBusy(true);
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2600);
    const res = await importFromWebsite(url.trim(), categories.map((c) => ({ value: c.slug, label: c.name })));
    if (timer.current) clearInterval(timer.current);
    setBusy(false);
    if (res.success) setResult({ data: res.data, pagesRead: res.pagesRead });
    else setError(res.error);
  };

  const apply = () => {
    if (!result) return;
    applyImport(result.data, result.pagesRead, categories.map((c) => c.slug));
    router.push("/register/form");
  };

  const skip = () => router.push("/register/form");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>قبل از شروع</Text>
          <BrandMark size={26} simple />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {result ? (
            <Preview
              data={result.data}
              pagesRead={result.pagesRead}
              categories={categories}
              onApply={apply}
              onRetry={() => setResult(null)}
              onSkip={skip}
            />
          ) : (
            <>
              <View style={styles.heroRow}>
                <View style={styles.heroIcon}><Sparkles size={22} color={colors.annabi} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>دوست دارید ما اطلاعات را از سایت‌تان بخوانیم؟</Text>
                  <Text style={styles.subtitle}>
                    آدرس وب‌سایت کسب‌وکارتان را بدهید؛ نام، توضیحات، راه‌های تماس، آدرس، خدمات و ساعات کاری
                    را از آن برمی‌داریم و فرم را برایتان پر می‌کنیم. بعد شما همه را مرور و تایید می‌کنید.
                  </Text>
                </View>
              </View>

              <View style={styles.inputWrap}>
                <Globe size={18} color={colors.mutedText} />
                <TextInput
                  value={url}
                  onChangeText={setUrl}
                  placeholder="www.example.com"
                  placeholderTextColor={colors.mutedText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  inputMode="url"
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={run}
                  style={styles.input}
                />
              </View>

              {busy ? (
                <View style={styles.progress}>
                  <ActivityIndicator color={colors.annabi} />
                  <Text style={styles.progressText}>{STAGES[stage]}</Text>
                  <Text style={styles.progressHint}>معمولاً کمتر از یک دقیقه</Text>
                </View>
              ) : null}
              {error ? <Alert tone="error">{error}</Alert> : null}

              <PrimaryButton label="بخوان و فرم را پر کن" onPress={run} loading={busy} disabled={!url.trim()} />
              <Pressable onPress={skip} disabled={busy} style={styles.skipBtn}>
                <PenLine size={16} color={colors.text} />
                <Text style={styles.skipText}>خودم وارد می‌کنم</Text>
              </Pressable>

              <Text style={styles.footnote}>
                فقط صفحه‌های عمومی سایت خوانده می‌شود. اطلاعات محرمانه‌ی مرحله‌ی «اعتبار» (شماره ثبت،
                مجوز) هرگز از سایت برداشته نمی‌شود و همیشه دست خودتان است.
              </Text>
            </>
          )}
          <View style={{ height: space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Preview({
  data,
  pagesRead,
  categories,
  onApply,
  onRetry,
  onSkip,
}: {
  data: ImportedBusiness;
  pagesRead: number;
  categories: Category[];
  onApply: () => void;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const found = Object.entries(data).filter(([k, v]) => k !== "confidence" && preview(k, v) !== "");
  const low = new Set(data.confidence?.low ?? []);
  const catLabel = categories.find((c) => c.slug === data.category_slug)?.name;

  return (
    <>
      <View style={styles.heroRow}>
        <View style={[styles.heroIcon, { backgroundColor: "rgba(15,123,79,0.1)" }]}>
          <CheckCircle2 size={22} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{found.length} مورد از سایت شما پیدا شد</Text>
          <Text style={styles.subtitle}>
            {pagesRead} صفحه خوانده شد. این‌ها فقط پیشنهادند — در مراحل بعد همه را می‌بینید و هر چه لازم بود
            همان‌جا اصلاح می‌کنید. تا خودتان تایید نکنید چیزی ثبت نمی‌شود.
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {found.map(([k, v], i) => {
          const text = k === "category_slug" ? catLabel ?? String(v) : preview(k, v);
          const rtl = /^[؀-ۿ]/.test(text);
          return (
            <View key={k} style={[styles.row, i < found.length - 1 && styles.rowLine]}>
              <Text style={styles.rowLabel}>{FIELD_FA[k] ?? k}</Text>
              <Text style={[styles.rowValue, { writingDirection: rtl ? "rtl" : "ltr", textAlign: rtl ? "right" : "left" }]} numberOfLines={1}>
                {text}
              </Text>
              {low.has(k) ? (
                <View style={[styles.badge, styles.badgeReview]}>
                  <AlertTriangle size={10} color="#92400e" />
                  <Text style={[styles.badgeText, { color: "#92400e" }]}>بازبینی</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeOk]}>
                  <CheckCircle2 size={10} color={colors.success} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>از سایت</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <PrimaryButton label="با این اطلاعات فرم را پر کن" onPress={onApply} />
      <GhostButton label="آدرس دیگری امتحان کنم" onPress={onRetry} />
      <Pressable onPress={onSkip} style={{ alignSelf: "center", padding: 6 }}>
        <Text style={styles.footnoteLink}>نه، خودم همه را دستی وارد می‌کنم</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  navTitle: { flex: 1, ...type.muted, textAlign: "right" },
  back: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", ...shadow.card,
  },
  scroll: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md },
  heroRow: { flexDirection: "row-reverse", gap: space.sm, alignItems: "flex-start" },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.softAnnabi, alignItems: "center", justifyContent: "center" },
  title: { ...type.h2, fontSize: 17, textAlign: "right" },
  subtitle: { ...type.body, color: colors.mutedText, textAlign: "right", marginTop: 4 },
  inputWrap: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md, height: 50, ...shadow.card,
  },
  input: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text, textAlign: "left", writingDirection: "ltr", padding: 0 },
  progress: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, flexDirection: "row-reverse", alignItems: "center", gap: space.sm, ...shadow.card },
  progressText: { ...type.body, flex: 1, textAlign: "right" },
  progressHint: { ...type.muted },
  skipBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.sm },
  skipText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text },
  footnote: { ...type.muted, textAlign: "right", fontSize: 11.5, lineHeight: 18 },
  footnoteLink: { ...type.muted, textDecorationLine: "underline" },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card, overflow: "hidden" },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingHorizontal: space.md, paddingVertical: 9 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { width: 78, ...type.muted, fontSize: 12, textAlign: "right" },
  rowValue: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  badge: { flexDirection: "row-reverse", alignItems: "center", gap: 3, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  badgeOk: { backgroundColor: "rgba(15,123,79,0.1)" },
  badgeReview: { backgroundColor: "rgba(217,119,6,0.12)" },
  badgeText: { fontSize: 10.5, fontFamily: fonts.bold },
});
