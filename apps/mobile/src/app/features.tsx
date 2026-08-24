// ============================================================================
// Source: apps/mobile/src/app/features.tsx
// Version: 2.0.0 — 2026-08-24
// Why: The mobile half of /features on the web — what a visitor gets, what
//      a business owner gets per plan, and what does not exist yet.
//
//      Plan quantities come from @goplaza/core (GALLERY_LIMITS,
//      ANNOUNCEMENT_LIMITS), the same table the web page renders and the
//      server clamps against. Hand-typing "۵ عکس" here is precisely how a
//      mobile screen ends up promising more than the server allows.
//
//      v2 (24 Aug parity audit): the plan sections were three hard-coded
//      calls, so when a fourth tier (پلاتینیوم) shipped on the web on 19 Aug
//      this screen went on insisting there were three — the site selling a
//      plan the app denies exists. Sections are now generated from
//      PAID_PLANS, and every plan shows its real price and interval from the
//      table, so a repricing cannot go stale here either. The per-plan prose
//      rows stay hand-written because they are claims, not data; Platinum
//      has none of its own yet and says so, exactly like `bullets` does.
//
//      The "not built yet" section is not padding. Two of its lines are
//      about this very app (no store listing, no push notifications), so
//      dropping it on mobile would remove the disclosures most relevant to
//      the person reading it here.
// Env / Identity: Static content. No IO.
// ============================================================================
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import {
  ANNOUNCEMENT_LIMITS,
  GALLERY_LIMITS,
  INTERVAL_LABEL_FA,
  PAID_PLANS,
  PLANS,
  brand,
  formatCad,
  intervalsFor,
  type PlanId,
} from "@goplaza/core";

import { MerlonRow } from "../components/brand-mark";
import { colors, fonts, radius, space } from "../theme";

const WEB = brand.url;
const fa = (n: number) => n.toLocaleString("fa-IR");
/** `null` in the limits table means unlimited. */
const qty = (n: number | null) => (n === null ? "نامحدود" : fa(n));

const G = GALLERY_LIMITS;
const A = ANNOUNCEMENT_LIMITS;

type Row = { title: string; body: string };

/** «چهار» today, and correct on its own the day a fifth tier is added. */
const PLANS_COUNT_FA = (PAID_PLANS.length + 1).toLocaleString("fa-IR");

const VISITOR_FREE: Row[] = [
  { title: "جستجوی فارسی که اشتباه تایپ را می‌بخشد", body: "اگر کیبورد روی فارسی مانده باشد و به‌جای dental بنویسی «یثدفشم»، باز هم پیدایش می‌کند." },
  { title: "پروفایل کامل هر کسب‌وکار", body: "شماره، واتساپ، ایمیل، سایت، آدرس، ساعت کاری، خدمات و تعرفه‌ها." },
  { title: "«الان باز است» که واقعاً محاسبه می‌شود", body: "از ساعت کاری اعلام‌شده و ساعت همین لحظه‌ی دستگاه خودت." },
  { title: "نشان احراز مالکیت", body: "صاحب کسب‌وکار شماره یا ایمیلش را با کد اثبات کرده. شش ماه اعتبار دارد و فروشی نیست." },
  { title: "اعلان‌های تازه", body: "تخفیف، رویداد و خبر کسب‌وکارها؛ در صفحه‌ی اول و روی پروفایلشان." },
  { title: "تابلوی فرصت‌های شغلی", body: "آگهی استخدام کسب‌وکارهای ایرانی، با فیلتر شهر، نوع همکاری و زبان لازم. هر آگهی بعد از تاریخ انقضا خودبه‌خود برداشته می‌شود." },
  { title: "اگر چیزی نبود، بگو — با تایپ یا صدا", body: "بدون ساختن حساب." },
];

const VISITOR_ACCOUNT: Row[] = [
  { title: "ذخیره و لیست «می‌خواهم بروم»", body: "از تب حساب من دوباره پیدایشان کن." },
  { title: "یادداشت خصوصی", body: "فقط خودت می‌بینی. نه صاحب کسب‌وکار، نه بقیه." },
  { title: "ثبت نظر عمومی", body: "بعد از بررسی مدیر منتشر می‌شود." },
  { title: "«باخبرم کن» برای هر کسب‌وکار", body: "اعلان تازه‌اش را ایمیل می‌گیری و در تب حساب من جمع می‌شود. ذخیره‌کردن به‌تنهایی این کار را نمی‌کند." },
];

const OWNER_FREE: Row[] = [
  { title: "پروفایل کامل، رایگان و همیشگی", body: "حضور در جستجو، دسته‌بندی و صفحه‌ی شهر." },
  { title: "نشان احراز مالکیت — رایگان", body: "هرگز فروخته نمی‌شود." },
  { title: `${qty(G.free.photos)} عکس گالری`, body: "به‌علاوه‌ی لوگو و کاور." },
  { title: `${qty(A.free)} اعلان در ماه`, body: "روی پروفایل و صفحه‌ی اول." },
  { title: "آمار پایه (۳۰ روز)", body: "بازدید و مجموع اقدام‌ها." },
  { title: "لینک رزرو نوبت", body: "لینک تقویم بیرونی خودت. فعلاً برای همه‌ی پلن‌ها رایگان است." },
  // Free and unlimited by decision (18 Aug) — so it belongs here and must
  // never appear in the Starter or Premium lists.
  { title: "آگهی استخدام — رایگان و بدون سقف", body: "در هر پلنی. سقف ۵ آگهی در ۲۴ ساعت یک محدودیت فنی است، نه چیزی که با ارتقا برداشته شود. ثبت آگهی فعلاً از وب‌سایت انجام می‌شود." },
];

const OWNER_STARTER: Row[] = [
  { title: "آمار کامل (۹۰ روز)", body: "تفکیک هر اقدام و مبدأ بازدید." },
  { title: `${qty(G.pro.photos)} عکس + ${G.pro.video ? "۱ ویدئو" : "بدون ویدئو"}`, body: "گالری کامل روی پروفایل." },
  { title: `${qty(A.pro)} اعلان در ماه`, body: "در بازه‌ی ۳۰ روز گردشی، نه ماه تقویمی." },
  { title: "پاسخ عمومی به نظرات", body: "زیر هر نظر منتشرشده." },
  { title: "وضعیت زنده «الان شلوغیم / خلوته»", body: "بعد از چهار ساعت خودبه‌خود برداشته می‌شود." },
];

const OWNER_PREMIUM: Row[] = [
  { title: `گالری و اعلان ${qty(A.featured)}`, body: `${qty(G.featured.photos)} عکس، بدون سقف ماهانه.` },
  { title: "آدرس اختصاصی انگلیسی", body: "مثل goplaza.ca/b/dr-ahmadi" },
  { title: "جایگاه ویژه، با برچسب", body: "بالای فهرست شهر و دسته — همیشه با نشان «ویژه»، نه پنهانی." },
  { title: "بخش ویژه‌ی صفحه‌ی اول", body: "در بالای صفحه‌ی نخست گوپلازا." },
];

/**
 * The prose rows for each paid tier. Platinum is deliberately absent: its
 * exclusive list is not decided yet, so the screen shows its confirmed
 * bullets from the plan table and nothing invented. Adding a row here for a
 * perk nobody has agreed to is the exact failure this file exists to avoid.
 */
const OWNER_ROWS: Partial<Record<PlanId, Row[]>> = {
  pro: OWNER_STARTER,
  featured: OWNER_PREMIUM,
};

/** «۲۱ دلار کانادا · ماهانه» — from the table, never typed by hand. */
function priceLine(id: PlanId): string {
  return intervalsFor(id)
    .map((i) => `${formatCad(PLANS[id].price[i]!)} · ${INTERVAL_LABEL_FA[i]}`)
    .join("  |  ");
}

const COMING = [
  "رزرو نوبت واقعی داخل گوپلازا (الان فقط لینک بیرونی است)",
  "نقشه‌ی جاسازی‌شده روی پروفایل",
  "این اپ روی App Store و Google Play (فعلاً فقط دانلود مستقیم اندروید)",
  "اعلان با پیامک و پوش نوتیفیکیشن (فعلاً ایمیل و داخل اپ)",
  "مدیریت کسب‌وکار از داخل اپ (ویرایش، آمار، اعلان‌ها و ثبت آگهی استخدام فعلاً فقط در سایت)",
  "مقاله‌ی وبلاگ اختصاصی برای کسب‌وکارهای پریمیوم",
  "نمایش چندشعبه‌ای روی نقشه",
  "دریافت رزومه داخل گوپلازا (درخواست‌ها مستقیم به خود کسب‌وکار می‌رود)",
];

export default function FeaturesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.navBtn}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.navTitle}>امکانات</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>دقیقاً چه چیزی می‌گیری.</Text>
        <Text style={styles.lede}>
          این صفحه فقط چیزهایی را می‌نویسد که همین حالا کار می‌کنند. چیزهایی که هنوز نساخته‌ایم هم
          پایین آمده‌اند — چون اگر پنهانشان می‌کردیم، بقیه‌ی این فهرست هم قابل اعتماد نبود.
        </Text>

        <Section eyebrow="برای تو که دنبال کسب‌وکار می‌گردی" title="بدون حساب، بدون هزینه" rows={VISITOR_FREE} />
        <Section eyebrow="اگر حساب رایگان بسازی" title="چهار چیز اضافه" rows={VISITOR_ACCOUNT} />

        <View style={styles.divider}><MerlonRow color={colors.gold} height={6} opacity={0.5} /></View>
        <Text style={styles.ownerIntro}>
          برای صاحب کسب‌وکار — {PLANS_COUNT_FA} پلن، و مرزهای صریحشان. عددها همان‌هایی هستند که سرور اعمال می‌کند.
        </Text>

        <Section eyebrow={PLANS.free.name} title="رایگان، برای همیشه" rows={OWNER_FREE} />
        {PAID_PLANS.map((id, i) => (
          <Section
            key={id}
            eyebrow={PLANS[id].name}
            title={`به‌علاوه‌ی همه‌ی موارد ${i === 0 ? PLANS.free.name : PLANS[PAID_PLANS[i - 1]].name}`}
            price={priceLine(id)}
            rows={OWNER_ROWS[id] ?? PLANS[id].bullets.map((b) => ({ title: b, body: "" }))}
          />
        ))}

        <View style={styles.promise}>
          <Text style={styles.promiseText}>
            <Text style={styles.promiseBold}>نشان تأیید فروشی نیست.</Text> در هر پلنی، فقط با اثبات شماره یا ایمیل.
          </Text>
        </View>
        <View style={styles.promise}>
          <Text style={styles.promiseText}>
            <Text style={styles.promiseBold}>«ویژه» همیشه برچسب دارد.</Text> رتبه‌بندی پنهانی به نفع پرداخت‌کننده انجام نمی‌دهیم.
          </Text>
        </View>

        <Text style={styles.comingTitle}>چیزهایی که هنوز نداریم</Text>
        <Text style={styles.comingLede}>
          این‌ها ساخته نشده‌اند. اگر جایی خلافش را دیدی، آن یک اشتباه است و می‌خواهیم بدانیم.
        </Text>
        {COMING.map((c) => (
          <View key={c} style={styles.comingRow}>
            <View style={styles.dot} />
            <Text style={styles.comingText}>{c}</Text>
          </View>
        ))}

        <Pressable style={styles.cta} onPress={() => Linking.openURL(`${WEB}/pricing`)}>
          <Text style={styles.ctaText}>قیمت‌ها و پرداخت در سایت</Text>
        </Pressable>

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  eyebrow,
  title,
  rows,
  price,
}: {
  eyebrow: string;
  title: string;
  rows: Row[];
  price?: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h2}>{title}</Text>
      {price ? <Text style={styles.price}>{price}</Text> : null}
      {rows.map((r) => (
        <View key={r.title} style={styles.card}>
          <Text style={styles.cardTitle}>{r.title}</Text>
          {r.body ? <Text style={styles.cardBody}>{r.body}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text },

  scroll: { paddingHorizontal: space.md, paddingBottom: space.lg },
  h1: { fontSize: 26, fontFamily: fonts.heavy, color: colors.text, textAlign: "right", lineHeight: 40, marginTop: space.sm },
  lede: { fontSize: 13, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right", lineHeight: 24, marginTop: space.sm },

  section: { marginTop: space.lg },
  price: {
    fontSize: 12.5,
    color: colors.annabi,
    fontFamily: fonts.heavy,
    textAlign: "right",
    marginBottom: space.xs,
  },
  eyebrow: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.lajvard, textAlign: "right" },
  h2: { fontSize: 19, fontFamily: fonts.heavy, color: colors.text, textAlign: "right", marginTop: 3, marginBottom: space.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right", lineHeight: 24 },
  cardBody: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right", lineHeight: 22, marginTop: 3 },

  divider: { marginTop: space.lg, alignItems: "center" },
  ownerIntro: { fontSize: 13, fontFamily: fonts.medium, color: colors.text, textAlign: "right", lineHeight: 24, marginTop: space.md },

  promise: {
    backgroundColor: colors.softGold,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  promiseText: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.text, textAlign: "right", lineHeight: 23 },
  promiseBold: { fontFamily: fonts.heavy },

  comingTitle: { fontSize: 18, fontFamily: fonts.heavy, color: colors.text, textAlign: "right", marginTop: space.lg },
  comingLede: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right", lineHeight: 22, marginTop: 4, marginBottom: space.sm },
  comingRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: "dashed",
    paddingHorizontal: space.md,
    paddingVertical: 10,
    marginBottom: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 999, backgroundColor: colors.mutedText, marginTop: 8 },
  comingText: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: colors.text, opacity: 0.75, textAlign: "right", lineHeight: 22 },

  cta: {
    marginTop: space.lg,
    backgroundColor: colors.annabi,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { fontSize: 14, fontFamily: fonts.heavy, color: colors.onAnnabi },
});
