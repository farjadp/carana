// ============================================================================
// Source: apps/mobile/src/app/account/edit.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Edit the user's own profile inside the app — name, mobile number, a
//      short bio — instead of bouncing to the website. Changing the mobile
//      number clears its verification stamp (a code must prove the new one).
// Env / Identity: Signed-in user; RLS restricts the update to their own row.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, Field, GhostButton, PrimaryButton } from "../../components/ui";
import { useAuth } from "../../context/auth";
import { toLatinDigits } from "../../lib/api";
import { isFresh } from "../../lib/register";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login?next=/account/edit");
  }, [loading, user, router]);

  useEffect(() => {
    setName(profile?.full_name ?? "");
    setMobile(profile?.mobile_number ?? "");
    // bio is not on the app's Profile type yet; fetch it once here.
    if (user) {
      supabase.from("profiles").select("bio").eq("id", user.id).maybeSingle().then(({ data }) => setBio(data?.bio ?? ""));
    }
  }, [profile, user]);

  if (!user) return null;

  const phoneOk = isFresh(profile?.phone_verified_at);
  const emailOk = isFresh(profile?.email_verified_at);
  const mobileChanged = toLatinDigits(mobile).replace(/[^\d+]/g, "") !== (profile?.mobile_number ?? "");

  const save = async () => {
    setBusy(true);
    setMsg(null);
    const digits = toLatinDigits(mobile).replace(/[^\d+]/g, "");
    if (digits && digits.replace(/\D/g, "").length < 10) {
      setMsg({ tone: "error", text: "شماره باید حداقل ۱۰ رقم باشد." });
      setBusy(false);
      return;
    }
    const patch: { full_name: string | null; bio: string | null; mobile_number: string | null; phone_verified_at?: null } = {
      full_name: name.trim() || null, bio: bio.trim() || null, mobile_number: digits || null,
    };
    if (mobileChanged) patch.phone_verified_at = null;
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setBusy(false);
    if (error) {
      setMsg({ tone: "error", text: error.message });
      return;
    }
    await refreshProfile();
    setMsg({ tone: "success", text: mobileChanged && digits ? "ذخیره شد. شماره‌ی جدید باید دوباره تایید شود." : "ذخیره شد." });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><ChevronRight size={22} color={colors.text} /></Pressable>
          <Text style={styles.navTitle}>ویرایش پروفایل</Text>
          <BrandMark size={26} simple />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Field label="نام و نام خانوادگی" value={name} onChangeText={setName} placeholder="نامی که در نظرها نمایش داده می‌شود" autoComplete="name" />
            <Field label="ایمیل" latin value={profile?.email ?? user.email ?? ""} editable={false} hint={emailOk ? "تایید شده" : "تایید نشده — از مسیر ثبت کسب‌وکار تایید کنید"} style={{ opacity: 0.6 }} />
            <Field label="شماره موبایل" latin value={mobile} onChangeText={setMobile} placeholder="4165551234" keyboardType="phone-pad" autoComplete="tel" hint={phoneOk && !mobileChanged ? "تایید شده" : mobileChanged ? "بعد از ذخیره باید دوباره تایید شود" : "تایید نشده"} />
            <Field label="درباره‌ی من (اختیاری)" value={bio} onChangeText={setBio} placeholder="یک یا دو جمله" multiline numberOfLines={3} maxLength={280} style={{ minHeight: 84, textAlignVertical: "top" }} />
            {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
            <PrimaryButton label="ذخیره" onPress={save} loading={busy} />
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color={colors.annabi} />
              <Text style={styles.cardTitle}>تایید راه‌های تماس</Text>
            </View>
            <Text style={type.muted}>
              {emailOk && phoneOk ? "ایمیل و موبایل شما تایید شده‌اند." : "برای ثبت کسب‌وکار، ایمیل و موبایل باید تایید شده باشند."}
            </Text>
            {emailOk && phoneOk ? (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}><CheckCircle2 size={16} color={colors.success} /><Text style={[type.muted, { color: colors.success }]}>همه‌چیز آماده است</Text></View>
            ) : (
              <GhostButton label="رفتن به تایید" onPress={() => router.push("/register/verify")} />
            )}
          </View>
          <View style={{ height: space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  nav: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.sm },
  navTitle: { flex: 1, fontSize: 16, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  back: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow.card },
  scroll: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.md, ...shadow.card },
  cardTitle: { ...type.h2, fontSize: 16 },
});
