// ============================================================================
// Source: apps/mobile/src/app/register/verify.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Verify email and phone before registering a business — the same gate,
//      the same codes, the same rules as the web dashboard, via the mobile
//      API. Also lets the user set the phone number if the profile has none,
//      because a code can only be sent to the number on the profile.
// Env / Identity: Signed-in user. Codes never reach the client.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, ChevronRight, Mail, Smartphone } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { Alert, Field, GhostButton, PrimaryButton } from "../../components/ui";
import { useAuth } from "../../context/auth";
import { checkContactCode, sendContactCode, toLatinDigits, type ContactType } from "../../lib/api";
import { isFresh } from "../../lib/register";
import { supabase } from "../../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

export default function VerifyContactScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const emailOk = isFresh(profile?.email_verified_at);
  const phoneOk = isFresh(profile?.phone_verified_at);

  useEffect(() => {
    if (emailOk && phoneOk) router.replace("/register");
  }, [emailOk, phoneOk, router]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <ChevronRight size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <BrandMark size={26} simple />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>تایید راه‌های تماس</Text>
          <Text style={styles.subtitle}>
            یک کد ۶ رقمی برایتان می‌فرستیم. کد تا ۱۵ دقیقه معتبر است.
          </Text>

          <ChannelCard
            type="email"
            icon={<Mail size={18} color={colors.annabi} />}
            title="ایمیل"
            target={profile?.email ?? user.email ?? ""}
            done={emailOk}
            onVerified={refreshProfile}
          />

          <PhoneCard
            current={profile?.mobile_number ?? ""}
            done={phoneOk}
            onChanged={refreshProfile}
            onVerified={refreshProfile}
          />

          <View style={{ height: space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ------------------------------------------------------------------ channel

function ChannelCard({
  type,
  icon,
  title,
  target,
  done,
  onVerified,
  disabledReason,
}: {
  type: ContactType;
  icon: React.ReactNode;
  title: string;
  target: string;
  done: boolean;
  onVerified: () => Promise<void> | void;
  disabledReason?: string;
}) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    setBusy(true);
    setMsg(null);
    const res = await sendContactCode(type);
    setBusy(false);
    if (res.success) {
      setSent(true);
      setCooldown(60);
      setMsg({ tone: "success", text: res.message ?? "کد ارسال شد." });
    } else {
      setMsg({ tone: "error", text: res.error });
    }
  };

  const check = async () => {
    setBusy(true);
    setMsg(null);
    const res = await checkContactCode(type, code);
    setBusy(false);
    if (res.success) {
      setMsg({ tone: "success", text: "تایید شد." });
      await onVerified();
    } else {
      setMsg({ tone: "error", text: res.error });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        {done ? <CheckCircle2 size={20} color={colors.success} /> : icon}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardTarget} numberOfLines={1}>{target || "—"}</Text>
        </View>
        {done ? <Text style={styles.doneText}>تایید شده</Text> : null}
      </View>

      {done ? null : disabledReason ? (
        <Text style={styles.hint}>{disabledReason}</Text>
      ) : !sent ? (
        <PrimaryButton label={`ارسال کد به ${title}`} onPress={send} loading={busy} />
      ) : (
        <View style={{ gap: space.sm }}>
          <Field
            label="کد ۶ رقمی"
            latin
            value={code}
            onChangeText={(t) => setCode(toLatinDigits(t).replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            placeholder="123456"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <PrimaryButton label="تایید" onPress={check} loading={busy} disabled={code.length !== 6} />
          <GhostButton
            label={cooldown > 0 ? `ارسال دوباره (${cooldown})` : "ارسال دوباره‌ی کد"}
            onPress={() => { if (cooldown <= 0) send(); }}
          />
        </View>
      )}

      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
    </View>
  );
}

// -------------------------------------------------------------------- phone

function PhoneCard({
  current,
  done,
  onChanged,
  onVerified,
}: {
  current: string;
  done: boolean;
  onChanged: () => Promise<void> | void;
  onVerified: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    const digits = toLatinDigits(value).replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 10) {
      setErr("شماره باید حداقل ۱۰ رقم باشد (مثلاً 4165551234).");
      return;
    }
    setSaving(true);
    setErr(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ mobile_number: digits, phone_verified_at: null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setEditing(false);
    await onChanged();
  };

  if (editing && !done) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Smartphone size={18} color={colors.annabi} />
          <Text style={[styles.cardTitle, { flex: 1 }]}>شماره موبایل</Text>
        </View>
        <Field
          label="شماره موبایل کانادایی"
          latin
          value={value}
          onChangeText={setValue}
          keyboardType="phone-pad"
          placeholder="4165551234"
          autoComplete="tel"
          textContentType="telephoneNumber"
          hint="کد تایید به همین شماره پیامک می‌شود."
        />
        {err ? <Alert tone="error">{err}</Alert> : null}
        <PrimaryButton label="ثبت شماره" onPress={save} loading={saving} disabled={!value.trim()} />
        {current ? <GhostButton label="انصراف" onPress={() => { setEditing(false); setValue(current); }} /> : null}
      </View>
    );
  }

  return (
    <View>
      <ChannelCard
        type="phone"
        icon={<Smartphone size={18} color={colors.annabi} />}
        title="موبایل"
        target={current}
        done={done}
        onVerified={onVerified}
      />
      {!done ? (
        <Pressable onPress={() => setEditing(true)} style={styles.changeLink} hitSlop={8}>
          <Text style={styles.changeLinkText}>تغییر شماره</Text>
        </Pressable>
      ) : null}
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
  scroll: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.md },
  title: { ...type.h1, fontSize: 24, textAlign: "right" },
  subtitle: { ...type.body, color: colors.mutedText, textAlign: "right", marginTop: -6 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.md, ...shadow.card },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm },
  cardTitle: { ...type.h2, fontSize: 16, textAlign: "right" },
  cardTarget: { ...type.muted, textAlign: "right", writingDirection: "ltr" },
  doneText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.success },
  hint: { ...type.muted, textAlign: "right" },
  changeLink: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 4 },
  changeLinkText: { fontSize: 13, color: colors.lajvard, fontFamily: fonts.semibold },
});
