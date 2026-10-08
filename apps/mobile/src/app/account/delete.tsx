// ============================================================================
// Source: apps/mobile/src/app/account/delete.tsx
// Version: 1.0.0 — 2026-10-08
// Why: Delete the account from inside the app — App Store Guideline 5.1.1(v)
//      rejects an app that creates accounts but sends people elsewhere to
//      remove them. The server runs the website's own deletion code, so the
//      two surfaces cannot disagree about what is removed and what is kept.
// Env / Identity: Signed-in user; the server takes the user id from the
//      token, never from the request.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, TriangleAlert } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, Field, PrimaryButton } from "../../components/ui";
import { useAuth } from "../../context/auth";
import { deleteAccount } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user && !done) router.replace("/auth/login?next=/account/delete");
  }, [loading, user, done, router]);

  const ready = confirmation.trim().toLowerCase() === "delete";

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await deleteAccount(confirmation);
    if (!result.success) {
      setBusy(false);
      setError(result.error ?? "حذف حساب انجام نشد. لطفاً با پشتیبانی تماس بگیرید.");
      return;
    }
    setDone(true);
    // The account no longer exists, so a server-side sign-out has nothing to
    // revoke; clearing the local session is the whole job.
    await supabase.auth.signOut({ scope: "local" });
    setBusy(false);
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.scroll, { flex: 1, justifyContent: "center" }]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>حساب شما حذف شد</Text>
            <Text style={type.muted}>اطلاعات حسابتان پاک شد. هر وقت خواستید می‌توانید دوباره حساب بسازید.</Text>
            <PrimaryButton label="بازگشت به خانه" onPress={() => router.replace("/")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}><ChevronRight size={22} color={colors.text} /></Pressable>
          <Text style={styles.navTitle}>حذف حساب</Text>
          <BrandMark size={26} simple />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <TriangleAlert size={18} color={colors.annabi} />
              <Text style={styles.cardTitle}>این کار برگشت‌پذیر نیست</Text>
            </View>
            <Text style={type.muted}>
              پروفایل، کسب‌وکارهای ذخیره‌شده، یادداشت‌های خصوصی و نظرهای شما برای همیشه پاک می‌شوند.
            </Text>
            <Text style={type.muted}>
              اگر کسب‌وکاری ثبت کرده‌اید، پاک نمی‌شود چون ممکن است دیگران به آن تکیه کرده باشند؛ از نمایش عمومی خارج می‌شود و دیگر به حساب شما وصل نیست.
            </Text>
            <Field
              label="برای تایید، DELETE را بنویسید"
              latin
              value={confirmation}
              onChangeText={setConfirmation}
              placeholder="DELETE"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {error ? <Alert tone="error">{error}</Alert> : null}
            <PrimaryButton label="حذف همیشگی حساب" onPress={submit} loading={busy} disabled={!ready} />
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
