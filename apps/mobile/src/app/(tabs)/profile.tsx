// ============================================================================
// Source: apps/mobile/src/app/(tabs)/profile.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The account tab. Signed out it explains why an account is worth having;
//      signed in it holds saved listings, private notes and account actions.
// Env / Identity: Reads the session from AuthProvider. Every query here is
//      restricted to the caller's own rows by RLS.
// ============================================================================
import { brand } from "@goplaza/core";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Bookmark,
  ChevronLeft,
  FileText,
  LifeBuoy,
  LogOut,
  Shield,
  Store,
  UserRound, Newspaper, Sparkles, Briefcase } from "lucide-react-native";

import { BrandLoading, BrandMark } from "../../components/brand-mark";
import { PrimaryButton } from "../../components/ui";
import { useAuth } from "../../context/auth";
import { listMyNotes, listSaved, type SavedBusiness } from "../../lib/interactions";
import { listFollowedAnnouncements, type Announcement } from "../../lib/announcements";
import { AnnouncementCard } from "../../components/announcement-card";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const WEB = brand.url;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  const [saved, setSaved] = useState<SavedBusiness[]>([]);
  const [notes, setNotes] = useState<SavedBusiness[]>([]);
  const [followed, setFollowed] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);

  // Refetch on focus: the counts change from the business screen.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setSaved([]);
        setNotes([]);
        setFollowed([]);
        return;
      }
      let active = true;
      setBusy(true);
      Promise.all([listSaved(), listMyNotes(), listFollowedAnnouncements()])
        .then(([s, n, news]) => {
          if (!active) return;
          setSaved(s);
          setNotes(n);
          setFollowed(news);
        })
        .catch(() => {})
        .finally(() => active && setBusy(false));
      return () => {
        active = false;
      };
    }, [user])
  );

  if (loading) return <BrandLoading />;

  // ---------------------------------------------------------------- signed out
  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.guestScroll}>
          <View style={styles.guestIcon}>
            <BrandMark size={44} />
          </View>

          <Text style={styles.guestTitle}>حساب کاربری</Text>
          <Text style={styles.guestSubtitle}>
            با یک حساب رایگان می‌توانید کسب‌وکارها را ذخیره کنید، یادداشت خصوصی
            بگذارید و تجربه‌تان را با بقیه به اشتراک بگذارید.
          </Text>

          <View style={styles.benefits}>
            <Benefit icon={<Bookmark size={18} color={colors.lajvard} />} title="ذخیره کسب‌وکارها" body="هر کسب‌وکاری را نشان کنید تا بعداً راحت پیدایش کنید." />
            <Benefit icon={<FileText size={18} color={colors.lajvard} />} title="یادداشت خصوصی" body="تجربه‌تان را بنویسید. فقط خودتان می‌بینید." />
            <Benefit icon={<Shield size={18} color={colors.lajvard} />} title="ثبت نظر" body="به بقیه کمک کنید کسب‌وکار درست را پیدا کنند." />
          </View>

          <View style={styles.guestActions}>
            <PrimaryButton label="ساخت حساب رایگان" onPress={() => router.push("/auth/signup")} />
            <Pressable onPress={() => router.push("/auth/login")} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>حساب دارم، وارد می‌شوم</Text>
            </Pressable>
          </View>

          <View style={styles.linksBlock}>
            <InternalRow icon={<Store size={17} color={colors.annabi} />} label="ثبت کسب‌وکار" onPress={() => router.push("/register")} />
            <InternalRow icon={<Sparkles size={17} color={colors.annabi} />} label="امکانات گوپلازا" onPress={() => router.push("/features")} />
            <InternalRow icon={<Briefcase size={17} color={colors.annabi} />} label="فرصت‌های شغلی" onPress={() => router.push("/jobs")} />
            <InternalRow icon={<Newspaper size={17} color={colors.annabi} />} label="وبلاگ گوپلازا" onPress={() => router.push("/blog")} />
            <ExternalRow icon={<LifeBuoy size={17} color={colors.mutedText} />} label="پشتیبانی" url={`${WEB}/support`} />
            <ExternalRow icon={<Shield size={17} color={colors.mutedText} />} label="حریم خصوصی" url={`${WEB}/privacy`} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------------- signed in
  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "کاربر";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <Stat value={saved.length} label="ذخیره‌شده" />
          <Stat value={notes.length} label="یادداشت" />
        </View>

        <Section title="ذخیره‌شده‌های من">
          {busy ? (
            <ActivityIndicator color={colors.annabi} style={{ marginVertical: space.md }} />
          ) : saved.length === 0 ? (
            <Text style={styles.empty}>
              هنوز چیزی ذخیره نکرده‌اید. در صفحه‌ی هر کسب‌وکار دکمه‌ی ذخیره را بزنید.
            </Text>
          ) : (
            saved.map((row) => (
              <Pressable
                key={row.id}
                style={styles.savedRow}
                onPress={() =>
                  row.business?.slug &&
                  router.push(`/business/${encodeURIComponent(row.business.slug)}`)
                }
              >
                <ChevronLeft size={17} color={colors.mutedText} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedName}>{row.business?.name ?? "—"}</Text>
                  {row.business?.city && row.business.city !== "نامشخص" ? (
                    <Text style={styles.savedMeta}>{row.business.city}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          )}
        </Section>

        <Section title="اعلان‌های دنبال‌شده">
          {busy ? (
            <ActivityIndicator color={colors.annabi} style={{ marginVertical: space.md }} />
          ) : followed.length === 0 ? (
            <Text style={styles.empty}>
              در صفحه‌ی هر کسب‌وکار دکمه‌ی «باخبرم کن» را بزن تا اعلان‌های تازه‌اش این‌جا و در ایمیلت جمع شود.
            </Text>
          ) : (
            followed.map((a) => <AnnouncementCard key={a.id} announcement={a} variant="row" />)
          )}
        </Section>

        <Section title="حساب کاربری">
          <InternalRow icon={<UserRound size={17} color={colors.annabi} />} label="ویرایش پروفایل" onPress={() => router.push("/account/edit")} />
          <InternalRow icon={<Store size={17} color={colors.annabi} />} label="کسب‌وکار من / ثبت کسب‌وکار" onPress={() => router.push("/register")} />
          <InternalRow icon={<Sparkles size={17} color={colors.annabi} />} label="امکانات گوپلازا" onPress={() => router.push("/features")} />
          <InternalRow icon={<Briefcase size={17} color={colors.annabi} />} label="فرصت‌های شغلی" onPress={() => router.push("/jobs")} />
          <InternalRow icon={<Newspaper size={17} color={colors.annabi} />} label="وبلاگ گوپلازا" onPress={() => router.push("/blog")} />
          <ExternalRow icon={<LifeBuoy size={17} color={colors.mutedText} />} label="پشتیبانی" url={`${WEB}/support`} />
          <ExternalRow icon={<Shield size={17} color={colors.mutedText} />} label="حریم خصوصی" url={`${WEB}/privacy`} />
        </Section>

        <Pressable style={styles.signOut} onPress={signOut}>
          <LogOut size={18} color={colors.annabi} />
          <Text style={styles.signOutText}>خروج از حساب</Text>
        </Pressable>

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitBody}>{body}</Text>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString("fa-IR")}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InternalRow({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <ChevronLeft size={17} color={colors.mutedText} />
      <Text style={[styles.linkLabel, { fontFamily: fonts.bold }]}>{label}</Text>
      {icon}
    </Pressable>
  );
}

function ExternalRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  return (
    <Pressable style={styles.linkRow} onPress={() => Linking.openURL(url)}>
      <ChevronLeft size={17} color={colors.mutedText} />
      <Text style={styles.linkLabel}>{label}</Text>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.md, paddingTop: space.md },

  guestScroll: { paddingHorizontal: space.lg, paddingTop: space.xl, paddingBottom: space.xl },
  guestIcon: {
    width: 84, height: 84, borderRadius: 42, alignSelf: "center",
    backgroundColor: colors.softAnnabi, alignItems: "center", justifyContent: "center",
  },
  guestTitle: { ...type.h1, fontSize: 22, textAlign: "center", marginTop: space.md },
  guestSubtitle: { ...type.body, color: colors.mutedText, textAlign: "center", marginTop: 8 },
  benefits: { gap: space.sm, marginTop: space.xl },
  benefit: {
    flexDirection: "row-reverse", gap: space.sm, alignItems: "flex-start",
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: space.md, ...shadow.card,
  },
  benefitIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.softLajvard, alignItems: "center", justifyContent: "center",
  },
  benefitTitle: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  benefitBody: { ...type.muted, textAlign: "right", marginTop: 2, lineHeight: 19 },
  guestActions: { gap: space.sm, marginTop: space.xl },
  secondaryBtn: { alignItems: "center", paddingVertical: space.sm },
  secondaryText: { color: colors.lajvard, fontSize: 14.5, fontFamily: fonts.semibold },
  linksBlock: {
    marginTop: space.xl, backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingHorizontal: space.md, ...shadow.card,
  },

  identity: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: space.md, ...shadow.card,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.softAnnabi, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontFamily: fonts.heavy, color: colors.annabi },
  name: { ...type.h2, textAlign: "right" },
  email: { ...type.muted, textAlign: "right", marginTop: 2 },

  statRow: { flexDirection: "row-reverse", gap: space.sm, marginTop: space.sm },
  stat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    paddingVertical: space.md, alignItems: "center", ...shadow.card,
  },
  statValue: { fontSize: 19, fontFamily: fonts.heavy, color: colors.annabi },
  statLabel: { ...type.muted, marginTop: 2 },

  section: { marginTop: space.lg },
  sectionTitle: { ...type.h2, fontSize: 15.5, textAlign: "right", marginBottom: space.sm },
  sectionBody: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    paddingHorizontal: space.md, ...shadow.card,
  },
  empty: { ...type.muted, textAlign: "center", paddingVertical: space.md, lineHeight: 20 },

  savedRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.sm,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  savedName: { fontSize: 14.5, fontFamily: fonts.semibold, color: colors.text, textAlign: "right" },
  savedMeta: { ...type.muted, textAlign: "right", marginTop: 1 },

  linkRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: space.sm,
    paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  linkLabel: { flex: 1, fontSize: 14.5, color: colors.text, textAlign: "right" },

  signOut: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center",
    gap: space.sm, marginTop: space.lg, paddingVertical: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card,
  },
  signOutText: { color: colors.annabi, fontFamily: fonts.bold, fontSize: 14.5 },
});
