// ============================================================================
// Source: apps/mobile/src/app/auth/signup.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Create an account.
// Env / Identity: Sends only full_name in user metadata. The database trigger
//      ignores any role supplied here — see 02-security.md.
// ============================================================================
import { useState } from "react";
import { Link, useRouter } from "expo-router";
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
import { ChevronRight, Eye, EyeOff, MailCheck } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, Field, PrimaryButton } from "../../components/ui";
import { authErrorMessage, brand } from "@goplaza/core";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function SignupScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        // Land the confirmation back in the app, on a screen that greets the
        // person and starts them on their profile. Without this Supabase
        // falls back to the project's Site URL — which is how confirmation
        // links ended up opening localhost in a phone browser. The scheme
        // must be in the dashboard's Redirect URLs allowlist: goplaza://**
        // (charana://** stays allow-listed for builds installed before the
        // rebrand; both schemes are registered in app.json).
        emailRedirectTo: `${brand.scheme}://auth/confirmed`,
      },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError, "ثبت‌نام انجام نشد. لطفاً دوباره تلاش کنید."));
      setBusy(false);
      return;
    }

    // With email confirmation on there is no session yet; the user has to
    // confirm before they can sign in.
    if (data.session) {
      if (router.canDismiss()) router.dismissAll();
      else router.replace("/profile");
    }
    else setSent(true);

    setBusy(false);
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <MailCheck size={34} color={colors.success} />
          </View>
          <Text style={styles.title}>ایمیل را بررسی کنید</Text>
          <Text style={styles.subtitle}>
            یک لینک تایید به {email.trim()} فرستادیم. روی آن بزنید تا حسابتان فعال
            شود، بعد وارد شوید.
          </Text>
          <PrimaryButton label="رفتن به صفحه ورود" onPress={() => router.replace("/auth/login")} />
        </View>
      </SafeAreaView>
    );
  }

  const valid = fullName.trim().length >= 2 && email.trim().includes("@") && password.length >= 8;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <BrandMark size={40} />
          </View>
          <Text style={styles.brand}>GOPLAZA</Text>
          <Text style={styles.title}>ساخت حساب</Text>
          <Text style={styles.subtitle}>
            رایگان است و کمتر از یک دقیقه طول می‌کشد.
          </Text>

          <View style={styles.form}>
            <Field
              label="نام و نام خانوادگی"
              value={fullName}
              onChangeText={setFullName}
              placeholder="مثلاً نازنین احمدی"
              autoComplete="name"
            />

            <Field
              label="ایمیل"
              latin
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />

            <View>
              <Field
                label="رمز عبور"
                latin
                value={password}
                onChangeText={setPassword}
                placeholder="حداقل ۸ کاراکتر"
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="new-password"
                hint="حداقل ۸ کاراکتر"
                style={{ paddingLeft: 44 }}
              />
              <Pressable style={styles.eye} onPress={() => setShow((v) => !v)} hitSlop={8}>
                {show ? (
                  <EyeOff size={18} color={colors.mutedText} />
                ) : (
                  <Eye size={18} color={colors.mutedText} />
                )}
              </Pressable>
            </View>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <PrimaryButton label="ساخت حساب" onPress={submit} loading={busy} disabled={!valid} />

            <Text style={styles.legal}>
              با ساخت حساب، شرایط استفاده و سیاست حریم خصوصی پلازا را می‌پذیرید.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>حساب دارید؟</Text>
            <Link href="/auth/login" style={styles.footerLink}>
              ورود
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  navBar: { flexDirection: "row-reverse", paddingHorizontal: space.md, paddingVertical: space.sm },
  back: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    ...shadow.card,
  },
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  brandRow: { alignItems: "center", marginTop: space.md },
  brand: { fontSize: 30, fontFamily: fonts.heavy, color: colors.annabi, textAlign: "center", marginTop: 6 },
  title: { ...type.h1, fontSize: 22, textAlign: "center", marginTop: space.lg },
  subtitle: { ...type.body, color: colors.mutedText, textAlign: "center", marginTop: 6 },
  form: { gap: space.md, marginTop: space.xl },
  eye: { position: "absolute", left: space.md, bottom: 34 },
  legal: { ...type.muted, textAlign: "center", lineHeight: 20 },
  footer: {
    flexDirection: "row-reverse", justifyContent: "center",
    alignItems: "center", gap: 6, marginTop: space.xl,
  },
  footerText: { ...type.muted },
  footerLink: { color: colors.lajvard, fontFamily: fonts.bold, fontSize: 14 },
  done: { flex: 1, justifyContent: "center", paddingHorizontal: space.lg, gap: space.md },
  doneIcon: {
    width: 72, height: 72, borderRadius: 36, alignSelf: "center",
    backgroundColor: "rgba(15,123,79,0.10)", alignItems: "center", justifyContent: "center",
  },
});
