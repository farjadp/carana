// ============================================================================
// Source: apps/mobile/src/app/jobs/[slug].tsx
// Version: 1.0.0 — 2026-08-18
// Why: One hiring ad in the app.
//
//      The body is Markdown, and it is run through normalizeJobMarkdown()
//      before rendering here exactly as the website does — not because the
//      stored value is expected to be dirty (the server action normalises on
//      write), but because a row from an older build or a direct database
//      edit must not be able to reach a renderer that was never designed to
//      defend itself. Two independent surfaces, same rule, neither trusting
//      the other.
//
//      Applications go off-site, and the contact is revealed on tap. The tap
//      writes a `job_apply` event against the business, which is the only
//      signal an owner ever gets that the ad worked — the same event the web
//      records, so the insights page counts both surfaces together.
// Env / Identity: Public read. getJob() returns null for anything not live,
//      so an expired ad shows the not-found state rather than stale content.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Briefcase, CalendarClock, ChevronRight, Globe, Link2, Mail, MapPin, Phone } from "lucide-react-native";

import {
  EMPLOYMENT_TYPE_LABELS_FA,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  jobDaysRemaining,
  languageRequirementFa,
  normalizeJobMarkdown,
} from "@charana/core";

import { BrandLoading } from "../../components/brand-mark";
import { Markdown } from "../../components/markdown";
import { trackEvent } from "../../lib/analytics";
import { getJob, type JobPost } from "../../lib/jobs";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function JobScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJob(await getJob(String(slug)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <BrandLoading />;

  if (!job) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>این آگهی دیگر فعال نیست.</Text>
          <Text style={styles.missingBody}>
            {error ?? "ممکن است به پایان رسیده یا توسط کسب‌وکار بسته شده باشد."}
          </Text>
          <Pressable onPress={() => router.replace("/jobs")} style={styles.missingBtn}>
            <Text style={styles.missingBtnText}>همه فرصت‌های شغلی</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = jobDaysRemaining(job);
  const language = languageRequirementFa(job);
  const ApplyIcon = job.apply_method === "email" ? Mail : job.apply_method === "phone" ? Phone : Link2;
  const applyLabel =
    job.apply_method === "email" ? "ارسال رزومه با ایمیل"
    : job.apply_method === "phone" ? "تماس برای این آگهی"
    : "رفتن به فرم درخواست";

  const apply = () => {
    // Counted on the reveal only. Firing again when the revealed contact is
    // tapped would double every interested applicant, and the number an owner
    // sees has to mean "someone asked for the contact", not "someone tapped".
    if (!revealed) {
      if (job.business?.id) trackEvent(job.business.id, "job_apply");
      setRevealed(true);
      return;
    }
    const url =
      job.apply_method === "email" ? `mailto:${job.apply_value}`
      : job.apply_method === "phone" ? `tel:${job.apply_value}`
      : job.apply_value;
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{job.title}</Text>

          {job.business ? (
            <Pressable
              onPress={() => job.business?.slug && router.push(`/business/${encodeURIComponent(job.business.slug)}`)}
              hitSlop={6}
            >
              <View style={styles.bizRow}>
                <Briefcase size={13} color={colors.lajvard} />
                <Text style={styles.biz}>{job.business.name}</Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.badges}>
            <Text style={styles.badgeStrong}>{EMPLOYMENT_TYPE_LABELS_FA[job.employment_type]}</Text>
            <Text style={styles.badge}>{WORKPLACE_TYPE_LABELS_FA[job.workplace_type]}</Text>
            {job.city ? (
              <View style={styles.badgeRow}>
                <MapPin size={11} color={colors.mutedText} />
                <Text style={styles.badge}>{job.city}</Text>
              </View>
            ) : null}
            <Text style={styles.badge}>{formatSalaryFa(job)}</Text>
            {language ? (
              <View style={styles.badgeRow}>
                <Globe size={11} color={colors.text} />
                <Text style={styles.badgeGold}>زبان لازم: {language}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.body}>
            <Markdown source={normalizeJobMarkdown(job.description)} />
          </View>

          <View style={styles.applyBlock}>
            <Pressable onPress={apply} style={({ pressed }) => [styles.applyBtn, revealed && styles.applyBtnRevealed, pressed && { opacity: 0.85 }]}>
              <ApplyIcon size={16} color={revealed ? colors.lajvard : "#fff"} />
              <Text style={[styles.applyText, revealed && styles.applyTextRevealed]}>
                {revealed ? job.apply_value : applyLabel}
              </Text>
            </Pressable>
            <Text style={styles.applyNote}>
              درخواست مستقیم به همین کسب‌وکار می‌رود؛ چارانا در استخدام واسطه نیست و رزومه‌ای دریافت نمی‌کند.
            </Text>
          </View>

          {remaining !== null && remaining > 0 ? (
            <View style={styles.expiryRow}>
              <CalendarClock size={12} color={colors.mutedText} />
              <Text style={styles.expiry}>{fa(remaining)} روز دیگر این آگهی خودبه‌خود برداشته می‌شود.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={10}><ChevronRight size={22} color={colors.text} /></Pressable>
      <Text style={styles.headerTitle}>فرصت شغلی</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingBottom: space.sm },
  headerTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text },
  scroll: { padding: space.md, paddingBottom: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, ...shadow.card },
  title: { fontSize: 21, fontFamily: fonts.heavy, color: colors.text, lineHeight: 34, textAlign: "right" },
  bizRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  biz: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.lajvard, textAlign: "right" },
  badges: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 },
  badgeRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  badge: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText, backgroundColor: colors.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  badgeStrong: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.lajvard, backgroundColor: colors.softLajvard, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  badgeGold: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.text, backgroundColor: colors.softGold, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  body: { marginTop: space.xs },
  applyBlock: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md, gap: 8, marginTop: space.xs },
  applyBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.lajvard, paddingVertical: 14, borderRadius: radius.md },
  applyBtnRevealed: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.lajvard },
  applyText: { fontSize: 14.5, fontFamily: fonts.bold, color: "#fff" },
  applyTextRevealed: { color: colors.lajvard },
  applyNote: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.mutedText, lineHeight: 20, textAlign: "right" },
  expiryRow: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  expiry: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: space.lg },
  missingTitle: { fontSize: 16, fontFamily: fonts.heavy, color: colors.text, textAlign: "center" },
  missingBody: { ...type.muted, textAlign: "center", maxWidth: 300, lineHeight: 24 },
  missingBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  missingBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text },
});
