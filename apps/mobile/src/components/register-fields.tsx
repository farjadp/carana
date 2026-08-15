// ============================================================================
// Source: apps/mobile/src/components/register-fields.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The form controls the registration steps share — labelled inputs,
//      choice chips (a select replacement that works on a phone), toggles,
//      the per-step "from your site" banner, and the hours editor.
// Env / Identity: Presentational.
// ============================================================================
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type TextInputProps } from "react-native";
import { AlertTriangle, Sparkles } from "lucide-react-native";

import { MerlonGlyph } from "./brand-mark";
import { colors, fonts, radius, shadow, space, type } from "../theme";

export function StepHeader({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <View style={{ gap: 4, marginBottom: space.xs }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
        <Text style={[type.h2, { fontSize: 18 }]}>{n}. {title}</Text>
        <MerlonGlyph size={11} />
      </View>
      <Text style={[type.muted, { textAlign: "right" }]}>{description}</Text>
    </View>
  );
}

export function ImportBanner({ filled, review }: { filled: string[]; review: string[] }) {
  if (!filled.length) return null;
  return (
    <View style={s.banner}>
      <Sparkles size={16} color={colors.success} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>از سایت شما پر شد: {filled.join("، ")}</Text>
        {review.length ? (
          <View style={{ flexDirection: "row-reverse", gap: 4, marginTop: 3, alignItems: "flex-start" }}>
            <AlertTriangle size={12} color="#92400e" style={{ marginTop: 3 }} />
            <Text style={s.bannerReview}>این‌ها را دقیق‌تر ببینید (خلاصه یا ترجمه شده): {review.join("، ")}</Text>
          </View>
        ) : (
          <Text style={s.bannerHint}>همه را مرور کنید و هر چه لازم بود همین‌جا اصلاح کنید.</Text>
        )}
      </View>
    </View>
  );
}

export function TextField({
  label,
  required,
  hint,
  error,
  latin,
  multiline,
  ...props
}: TextInputProps & { label: string; required?: boolean; hint?: string; error?: string; latin?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: colors.annabi }}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedText}
        autoCapitalize={latin ? "none" : props.autoCapitalize}
        autoCorrect={latin ? false : props.autoCorrect}
        multiline={multiline}
        {...props}
        style={[
          s.input,
          multiline && s.multiline,
          latin && s.latin,
          error && s.inputError,
          props.style,
        ]}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Choice<T extends string>({
  label,
  required,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  options: { value: T; label: string }[];
  value: T | "" | undefined;
  onChange: (v: T) => void;
  error?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>
        {label}
        {required ? <Text style={{ color: colors.annabi }}> *</Text> : null}
      </Text>
      <View style={s.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function MultiChoice({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.chips}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <Pressable key={o} onPress={() => toggle(o)} style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.annabi }} />
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

// ------------------------------------------------------------------ hours

export const DAYS: { key: string; label: string }[] = [
  { key: "saturday", label: "شنبه" },
  { key: "sunday", label: "یکشنبه" },
  { key: "monday", label: "دوشنبه" },
  { key: "tuesday", label: "سه‌شنبه" },
  { key: "wednesday", label: "چهارشنبه" },
  { key: "thursday", label: "پنجشنبه" },
  { key: "friday", label: "جمعه" },
];

type Day = { open?: string; close?: string; closed?: boolean };
export type Hours = Record<string, Day>;

export function HoursEditor({ value, onChange }: { value: Hours; onChange: (h: Hours) => void }) {
  const upd = (k: string, patch: Partial<Day>) => onChange({ ...value, [k]: { open: "09:00", close: "18:00", closed: false, ...(value[k] ?? {}), ...patch } });
  return (
    <View style={{ gap: 6 }}>
      {DAYS.map(({ key, label }) => {
        const d = value[key];
        const set = !!d;
        const closed = d?.closed === true;
        return (
          <View key={key} style={s.hourRow}>
            <Switch
              value={set && !closed}
              onValueChange={(on) => upd(key, on ? { closed: false } : { closed: true })}
              trackColor={{ true: colors.annabi }}
            />
            <Text style={s.hourDay}>{label}</Text>
            {set && !closed ? (
              <View style={s.hourInputs}>
                <TextInput
                  value={d?.open ?? ""}
                  onChangeText={(t) => upd(key, { open: t })}
                  placeholder="09:00"
                  placeholderTextColor={colors.mutedText}
                  style={s.hourInput}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
                <Text style={type.muted}>تا</Text>
                <TextInput
                  value={d?.close ?? ""}
                  onChangeText={(t) => upd(key, { close: t })}
                  placeholder="18:00"
                  placeholderTextColor={colors.mutedText}
                  style={s.hourInput}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
              </View>
            ) : (
              <Text style={[type.muted, { flex: 1, textAlign: "left" }]}>{set ? "تعطیل" : "—"}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: "row-reverse", gap: space.sm, alignItems: "flex-start",
    backgroundColor: "rgba(15,123,79,0.08)", borderRadius: radius.md, padding: space.sm + 2,
  },
  bannerTitle: { fontSize: 13, fontFamily: fonts.bold, color: colors.success, textAlign: "right", lineHeight: 20 },
  bannerReview: { fontSize: 12.5, fontFamily: fonts.regular, color: "#92400e", textAlign: "right", flex: 1, lineHeight: 19 },
  bannerHint: { ...type.muted, textAlign: "right", marginTop: 2 },
  label: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  input: {
    borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface,
    paddingHorizontal: space.md, paddingVertical: 12, fontSize: 15, fontFamily: fonts.regular,
    color: colors.text, textAlign: "right",
  },
  multiline: { minHeight: 110, textAlignVertical: "top" },
  latin: { textAlign: "left", writingDirection: "ltr" },
  inputError: { borderColor: colors.annabi },
  hint: { ...type.muted, textAlign: "right" },
  error: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.annabi, textAlign: "right" },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.card },
  chipOn: { backgroundColor: colors.annabi },
  chipText: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  chipTextOn: { color: colors.onAnnabi },
  toggleRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.md, ...shadow.card },
  hourRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingVertical: 4 },
  hourDay: { width: 68, fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text, textAlign: "right" },
  hourInputs: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  hourInput: {
    flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6,
    fontSize: 13.5, fontFamily: fonts.regular, color: colors.text, textAlign: "center", backgroundColor: colors.bg,
  },
});
