// ============================================================================
// Source: apps/mobile/src/app/auth/confirmed.tsx
// Version: 1.0.0 — 2026-08-14
// Why: Where the email-confirmation link lands when signup happened in the
//      app. Before this, the link dumped people on localhost in a browser —
//      the confirmation worked, but the person was left nowhere, signed out,
//      with no idea it had worked.
// Env / Identity: Deep-link target (goplaza://auth/confirmed). Supabase's
//      verify endpoint appends the session as a URL fragment; we parse it and
//      hand it to the client ourselves, because on native nothing else will.
//
//      This uses the app's custom URL scheme, not Universal Links — the
//      associated-domains entitlement cannot be signed by a free Apple ID,
//      and the scheme works today on every build we can make.
// ============================================================================
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { BadgeCheck, CircleAlert } from "lucide-react-native";

import { supabase } from "../../lib/supabase";
import { colors, type as t } from "../../theme";
import { PrimaryButton } from "../../components/ui";

/**
 * The tokens arrive as a fragment (#access_token=…), which never reaches a
 * server and is not part of the route's params. Parse it by hand.
 */
function tokensFromUrl(url: string | null) {
  if (!url) return null;
  const hash = url.split("#")[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export default function ConfirmedScreen() {
  const url = Linking.useURL();
  const [state, setState] = useState<"working" | "done" | "failed">("working");
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Already signed in (e.g. the screen was reopened later): still a
      // success, just skip the token exchange.
      const { data: existing } = await supabase.auth.getSession();

      if (!existing.session) {
        const tokens = tokensFromUrl(url);
        if (!tokens) {
          // No tokens and no session: the link was expired or already used.
          if (!cancelled) setState("failed");
          return;
        }

        const { error } = await supabase.auth.setSession(tokens);
        if (error) {
          if (!cancelled) setState("failed");
          return;
        }
      }

      const { data } = await supabase.auth.getUser();
      const full = (data.user?.user_metadata?.full_name as string) ?? "";
      if (!cancelled) {
        setFirstName(full.trim().split(/\s+/)[0] || null);
        setState("done");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state === "failed") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.body}>
          <View style={[styles.icon, { backgroundColor: "#fdecec" }]}>
            <CircleAlert size={34} color="#b3261e" />
          </View>
          <Text style={styles.title}>این لینک دیگر معتبر نیست</Text>
          <Text style={styles.subtitle}>
            لینک تایید یا منقضی شده یا قبلاً استفاده شده. اگر حسابتان فعال شده،
            کافی است وارد شوید.
          </Text>
          <PrimaryButton
            label="رفتن به صفحه ورود"
            onPress={() => router.replace("/auth/login")}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <BadgeCheck size={36} color={colors.success} />
        </View>

        <Text style={styles.title}>
          {state === "working"
            ? "در حال فعال‌سازی حساب…"
            : firstName
              ? `خوش آمدی، ${firstName}!`
              : "حسابت فعال شد!"}
        </Text>

        {state === "done" && (
          <>
            <Text style={styles.subtitle}>
              ایمیلت تایید شد و از همین حالا می‌توانی کسب‌وکارها را ذخیره کنی و
              برایشان یادداشت خصوصی بنویسی.
            </Text>
            <Text style={styles.hint}>
              یک قدم خوب برای شروع: پروفایلت را کامل کن تا تجربه‌ات شخصی‌تر شود.
            </Text>
            <PrimaryButton
              label="کامل کردن پروفایل"
              onPress={() => router.replace("/profile")}
            />
            <Text
              style={styles.skip}
              onPress={() => router.replace("/")}
              accessibilityRole="button"
            >
              بعداً — برو به کاوش کسب‌وکارها
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#e8f4ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: { ...t.h1, textAlign: "center" },
  subtitle: { ...t.body, color: colors.mutedText, textAlign: "center" },
  hint: { ...t.muted, textAlign: "center" },
  skip: {
    ...t.muted,
    color: colors.annabi,
    textDecorationLine: "underline",
    marginTop: 4,
    padding: 8,
  },
});
