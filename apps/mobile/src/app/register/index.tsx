// ============================================================================
// Source: apps/mobile/src/app/register/index.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Entry to business registration. Shows what has to be true first (email
//      and phone verified within six months — the same gate as the web) and
//      routes to verification or straight into the flow. Also lists the
//      user's existing listings so a second visit resumes rather than
//      duplicates.
// Env / Identity: Requires a signed-in user; bounces to the auth modal.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Mail, Smartphone, Store } from "lucide-react-native";

import { BrandLoading, BrandMark, MerlonGlyph } from "../../components/brand-mark";
import { PrimaryButton } from "../../components/ui";
import { useAuth } from "../../context/auth";
import { useRegistration } from "../../context/registration";
import { isFresh, listMyBusinesses } from "../../lib/register";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const STATUS_FA: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "در انتظار بررسی",
  NEEDS_CHANGES: "نیاز به اصلاح",
  APPROVED: "تایید شده",
  PUBLISHED: "منتشر شده",
  REJECTED: "رد شده",
};

export default function RegisterEntry() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const { reset } = useRegistration();
  const [mine, setMine] = useState<Awaited<ReturnType<typeof listMyBusinesses>>>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login?next=/register");
  }, [loading, user, router]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      listMyBusinesses().then(setMine);
    }, [refreshProfile])
  );

  if (loading || !user) return <BrandLoading />;

  const emailOk = isFresh(profile?.email_verified_at);
  const phoneOk = isFresh(profile?.phone_verified_at);
  const ready = emailOk && phoneOk;

  const start = () => {
    reset();
    router.push("/register/import");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <BrandMark size={26} simple />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroIcon}>
          <Store size={30} color={colors.annabi} />
        </View>
        <Text style={styles.title}>ثبت کسب‌وکار در پلازا</Text>
        <Text style={styles.subtitle}>
          رایگان است. پروفایلتان بعد از بررسی تیم پلازا منتشر می‌شود و با نشان تایید در جستجوها دیده می‌شود.
        </Text>

        {/* Gate */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>قبل از شروع</Text>
            <MerlonGlyph size={10} />
          </View>
          <Text style={styles.cardHint}>
            برای این‌که مطمئن باشیم صاحب کسب‌وکار خودتان هستید، ایمیل و شماره‌ی موبایل‌تان باید تایید شده باشد.
          </Text>
          <GateRow ok={emailOk} icon={<Mail size={16} color={emailOk ? colors.success : colors.mutedText} />} label="تایید ایمیل" value={profile?.email ?? user.email ?? ""} />
          <GateRow ok={phoneOk} icon={<Smartphone size={16} color={phoneOk ? colors.success : colors.mutedText} />} label="تایید موبایل" value={profile?.mobile_number ?? "شماره‌ای ثبت نشده"} />
          {!ready ? (
            <Pressable style={styles.verifyBtn} onPress={() => router.push("/register/verify")}>
              <Text style={styles.verifyBtnText}>تایید ایمیل و موبایل</Text>
              <ChevronLeft size={16} color={colors.lajvard} />
            </Pressable>
          ) : null}
        </View>

        <View style={{ marginTop: space.lg }}>
          <PrimaryButton label="شروع ثبت کسب‌وکار" onPress={start} disabled={!ready} />
          {!ready ? (
            <Text style={styles.disabledHint}>بعد از تایید ایمیل و موبایل فعال می‌شود.</Text>
          ) : null}
        </View>

        {mine.length ? (
          <View style={[styles.card, { marginTop: space.xl }]}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>کسب‌وکارهای من</Text>
              <MerlonGlyph size={10} />
            </View>
            {mine.map((b) => (
              <View key={b.id} style={styles.mineRow}>
                <View style={[styles.statusPill, b.status === "PUBLISHED" && styles.statusPublished]}>
                  <Text style={[styles.statusText, b.status === "PUBLISHED" && styles.statusTextPublished]}>
                    {STATUS_FA[b.status] ?? b.status}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mineName} numberOfLines={1}>{b.name || "بدون نام"}</Text>
                  {b.city ? <Text style={styles.mineMeta}>{b.city}</Text> : null}
                </View>
              </View>
            ))}
            <Text style={styles.cardHint}>ویرایش کسب‌وکارهای ثبت‌شده فعلاً از وب‌سایت انجام می‌شود.</Text>
          </View>
        ) : null}

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function GateRow({ ok, icon, label, value }: { ok: boolean; icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.gateRow}>
      {ok ? <CheckCircle2 size={20} color={colors.success} /> : <Circle size={20} color={colors.line} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.gateLabel}>{label}</Text>
        <Text style={styles.gateValue} numberOfLines={1}>{value}</Text>
      </View>
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: space.md, paddingVertical: space.sm },
  back: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", ...shadow.card,
  },
  scroll: { paddingHorizontal: space.md, paddingTop: space.sm },
  heroIcon: {
    alignSelf: "center", width: 64, height: 64, borderRadius: 22,
    backgroundColor: colors.softAnnabi, alignItems: "center", justifyContent: "center",
  },
  title: { ...type.h1, fontSize: 24, textAlign: "center", marginTop: space.sm },
  subtitle: { ...type.body, color: colors.mutedText, textAlign: "center", marginTop: 6, paddingHorizontal: space.md },
  card: {
    marginTop: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: space.md, gap: space.sm, ...shadow.card,
  },
  cardTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  cardTitle: { ...type.h2, fontSize: 16 },
  cardHint: { ...type.muted, textAlign: "right" },
  gateRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingVertical: 4 },
  gateLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  gateValue: { ...type.muted, textAlign: "right" },
  verifyBtn: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: space.sm, marginTop: 2,
  },
  verifyBtnText: { color: colors.lajvard, fontFamily: fonts.bold, fontSize: 14 },
  disabledHint: { ...type.muted, textAlign: "center", marginTop: space.sm },
  mineRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingVertical: 4 },
  mineName: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  mineMeta: { ...type.muted, textAlign: "right" },
  statusPill: { backgroundColor: colors.softLajvard, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusPublished: { backgroundColor: "rgba(15,123,79,0.1)" },
  statusText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.lajvard },
  statusTextPublished: { color: colors.success },
});
