// ============================================================================
// Source: apps/mobile/src/components/report-sheet.tsx
// Version: 1.0.0 — 2026-08-16
// Why: "گزارش مشکل" in the app, matching the website's dialog and posting to
//      the same /api/reports. Reasons are identical, so the admin queue does
//      not have to know which surface a report came from to read it.
// Env / Identity: No sign-in required; the token rides along when there is one.
// ============================================================================
import { brand } from "@goplaza/core";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CheckCircle2, Flag, X } from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { colors, fonts, radius, space, type } from "../theme";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? brand.url).replace(/\/$/, "");

const REASONS: { value: string; label: string; hint?: string }[] = [
  { value: "closed", label: "این کسب‌وکار تعطیل شده است" },
  { value: "wrong_info", label: "اطلاعات اشتباه است", hint: "شماره، آدرس، ساعت کاری یا دسته" },
  { value: "duplicate", label: "تکراری است" },
  { value: "not_iranian", label: "کسب‌وکار ایرانی نیست" },
  { value: "spam", label: "تبلیغ یا اسپم است" },
  { value: "offensive", label: "محتوای نامناسب دارد" },
  { value: "impersonation", label: "جعل هویت است" },
  { value: "other", label: "مورد دیگر" },
];

export function ReportSheet({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ businessId, reason, details, source: "mobile" }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "ثبت گزارش ناموفق بود.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت گزارش ناموفق بود.");
    } finally {
      setSending(false);
    }
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => { setDone(false); setReason(""); setDetails(""); setError(null); }, 250);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger} hitSlop={8}>
        <Flag size={13} color={colors.mutedText} />
        <Text style={styles.triggerText}>گزارش مشکل</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {done ? (
              <View style={styles.doneWrap}>
                <CheckCircle2 size={38} color={colors.success} />
                <Text style={styles.doneTitle}>گزارش ثبت شد</Text>
                <Text style={styles.doneBody}>در صف بررسی تیم پلازاست. اگر تغییری لازم باشد اعمال می‌کنیم.</Text>
                <Pressable onPress={close} style={styles.doneBtn}><Text style={styles.doneBtnText}>بستن</Text></Pressable>
              </View>
            ) : (
              <>
                <View style={styles.head}>
                  <Pressable onPress={close} hitSlop={10}><X size={20} color={colors.mutedText} /></Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>مشکلی در این آگهی هست؟</Text>
                    <Text style={styles.sub} numberOfLines={1}>{businessName}</Text>
                  </View>
                </View>

                <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
                  {REASONS.map((r) => (
                    <Pressable key={r.value} onPress={() => setReason(r.value)} style={[styles.option, reason === r.value && styles.optionOn]}>
                      <View style={[styles.radio, reason === r.value && styles.radioOn]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionLabel}>{r.label}</Text>
                        {r.hint ? <Text style={styles.optionHint}>{r.hint}</Text> : null}
                      </View>
                    </Pressable>
                  ))}

                  <TextInput
                    value={details}
                    onChangeText={setDetails}
                    placeholder="توضیح (اختیاری)"
                    placeholderTextColor={colors.mutedText}
                    multiline
                    maxLength={2000}
                    style={styles.input}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </ScrollView>

                {error ? <Text style={styles.err}>{error}</Text> : null}

                <Pressable onPress={submit} disabled={!reason || sending} style={[styles.send, (!reason || sending) && { opacity: 0.4 }]}>
                  <Text style={styles.sendText}>{sending ? "در حال ارسال…" : "ارسال گزارش"}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row-reverse", alignItems: "center", gap: 6, alignSelf: "flex-end" },
  triggerText: { fontSize: 12, fontFamily: fonts.bold, color: colors.mutedText },
  backdrop: { flex: 1, backgroundColor: "rgba(20,33,61,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.md, paddingBottom: space.xl, gap: space.sm },
  head: { flexDirection: "row-reverse", alignItems: "flex-start", gap: space.sm },
  title: { fontSize: 16, fontFamily: fonts.heavy, color: colors.text, textAlign: "right" },
  sub: { ...type.muted, textAlign: "right" },
  option: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, padding: space.sm + 2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, marginBottom: 6 },
  optionOn: { borderColor: "rgba(122,24,49,0.4)", backgroundColor: colors.softAnnabi },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.line },
  radioOn: { borderColor: colors.annabi, backgroundColor: colors.annabi },
  optionLabel: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  optionHint: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right" },
  input: { minHeight: 70, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, ...type.body, marginTop: 4 },
  err: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.annabi, textAlign: "right" },
  send: { height: 46, borderRadius: radius.pill, backgroundColor: colors.annabi, alignItems: "center", justifyContent: "center" },
  sendText: { fontSize: 15, fontFamily: fonts.heavy, color: colors.onAnnabi },
  doneWrap: { alignItems: "center", gap: 8, paddingVertical: space.lg },
  doneTitle: { fontSize: 16, fontFamily: fonts.heavy, color: colors.text },
  doneBody: { ...type.muted, textAlign: "center", paddingHorizontal: space.md },
  doneBtn: { marginTop: space.sm, paddingHorizontal: space.lg, height: 40, borderRadius: radius.pill, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.onAnnabi },
});
