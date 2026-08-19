// ============================================================================
// Source: apps/mobile/src/app/auth/login.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Sign in. The app previously had no way in at all.
// ============================================================================
import { useState } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
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
import { ChevronRight, Eye, EyeOff } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, Field, GhostButton, PrimaryButton } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function LoginScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      // Supabase returns a deliberately vague message; keep it that way rather
      // than revealing whether the address exists.
      setError("ایمیل یا رمز عبور درست نیست.");
      setBusy(false);
      return;
    }

    // Close the whole auth stack rather than popping one screen: the user may
    // have arrived via profile -> signup -> login, and back() would drop them
    // on the signup form.
    if (next) router.replace(next as never);
    else if (router.canDismiss()) router.dismissAll();
    else router.replace("/profile");
  }

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
          <Text style={styles.title}>ورود به حساب</Text>
          <Text style={styles.subtitle}>
            برای ذخیره کسب‌وکارها، یادداشت خصوصی و ثبت نظر وارد شوید.
          </Text>

          <View style={styles.form}>
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
                placeholder="••••••••"
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete="current-password"
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

            <PrimaryButton
              label="ورود"
              onPress={submit}
              loading={busy}
              disabled={!email.trim() || password.length < 6}
            />

            <GhostButton
              label="رمز عبور را فراموش کرده‌اید؟"
              onPress={() => router.push("/auth/forgot-password")}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>حساب ندارید؟</Text>
            <Link href="/auth/signup" style={styles.footerLink}>
              ثبت‌نام
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
  eye: { position: "absolute", left: space.md, bottom: 15 },
  footer: {
    flexDirection: "row-reverse", justifyContent: "center",
    alignItems: "center", gap: 6, marginTop: space.xl,
  },
  footerText: { ...type.muted },
  footerLink: { color: colors.lajvard, fontFamily: fonts.bold, fontSize: 14 },
});
