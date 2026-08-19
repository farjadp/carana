// ============================================================================
// Source: apps/mobile/src/app/auth/forgot-password.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Password reset. The link opens the web page, which already exists.
// ============================================================================
import { useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, MailCheck } from "lucide-react-native";

import { Alert, Field, PrimaryButton } from "../../components/ui";
import { authErrorMessage, brand } from "@goplaza/core";
import { supabase } from "../../lib/supabase";
import { colors, radius, shadow, space, type } from "../../theme";

const WEB_ORIGIN = brand.url;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${WEB_ORIGIN}/auth/update-password`,
    });

    // Report success regardless of whether the address exists — that must not
    // be probeable. A rate limit is the one honest exception: nothing was sent.
    if (resetError && /rate limit|too many/i.test(resetError.message)) {
      setError(authErrorMessage(resetError));
      setBusy(false);
      return;
    }
    if (resetError) console.warn("reset error", resetError.message);
    setSent(true);
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {sent ? (
            <>
              <View style={styles.doneIcon}>
                <MailCheck size={34} color={colors.success} />
              </View>
              <Text style={styles.title}>ایمیل فرستاده شد</Text>
              <Text style={styles.subtitle}>
                اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز برایش
                ارسال شده است.
              </Text>
              <PrimaryButton label="بازگشت به ورود" onPress={() => router.replace("/auth/login")} />
            </>
          ) : (
            <>
              <Text style={styles.title}>بازیابی رمز عبور</Text>
              <Text style={styles.subtitle}>
                ایمیل حسابتان را وارد کنید تا لینک بازیابی بفرستیم.
              </Text>

              <Field
                label="ایمیل"
                latin
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                inputMode="email"
                />

              {error ? <Alert tone="error">{error}</Alert> : null}

              <PrimaryButton
                label="ارسال لینک بازیابی"
                onPress={submit}
                loading={busy}
                disabled={!email.trim().includes("@")}
              />
            </>
          )}
        </View>
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
  body: { flex: 1, justifyContent: "center", paddingHorizontal: space.lg, gap: space.md },
  title: { ...type.h1, fontSize: 22, textAlign: "center" },
  subtitle: { ...type.body, color: colors.mutedText, textAlign: "center", marginBottom: space.sm },
  doneIcon: {
    width: 72, height: 72, borderRadius: 36, alignSelf: "center",
    backgroundColor: "rgba(15,123,79,0.10)", alignItems: "center", justifyContent: "center",
  },
});
