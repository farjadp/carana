// ============================================================================
// Source: apps/mobile/src/components/ui.tsx
// Version: 1.0.0 — 2026-08-24
// Why: The handful of primitives the auth and profile screens share, so form
//      styling stays consistent instead of being redefined per screen.
// ============================================================================
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { AlertCircle, CheckCircle2 } from "lucide-react-native";

import { colors, fonts, radius, shadow, space, type } from "../theme";

/**
 * `latin` forces the field to stay left-to-right with Latin input.
 *
 * The app runs in forced RTL, which makes the keyboard open in Persian. A
 * password or email typed with Persian digits looks identical in the dots but
 * is a completely different string, and the sign-in fails with no clue why.
 */
export function Field({
  label,
  hint,
  latin,
  ...props
}: TextInputProps & { label: string; hint?: string; latin?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mutedText}
        autoCapitalize={latin ? "none" : props.autoCapitalize}
        autoCorrect={latin ? false : props.autoCorrect}
        spellCheck={latin ? false : props.spellCheck}
        keyboardType={latin ? "ascii-capable" : props.keyboardType}
        {...props}
        style={[styles.input, latin && styles.latin, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.primary,
        off && styles.primaryOff,
        pressed && !off && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.6 }]}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const error = tone === "error";
  return (
    <View style={[styles.alert, error ? styles.alertError : styles.alertSuccess]}>
      {error ? (
        <AlertCircle size={17} color={colors.annabi} />
      ) : (
        <CheckCircle2 size={17} color={colors.success} />
      )}
      <Text style={[styles.alertText, { color: error ? colors.annabi : colors.success }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  hint: { ...type.muted, textAlign: "right" },
  latin: { textAlign: "left", writingDirection: "ltr" },

  primary: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.annabi,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  primaryOff: { opacity: 0.45 },
  primaryText: { color: "#fff", fontSize: 15.5, fontFamily: fonts.bold },

  ghost: { alignItems: "center", paddingVertical: space.sm },
  ghostText: { color: colors.lajvard, fontSize: 14, fontFamily: fonts.semibold },

  alert: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
  },
  alertError: { backgroundColor: colors.softAnnabi },
  alertSuccess: { backgroundColor: "rgba(15, 123, 79, 0.09)" },
  alertText: { flex: 1, fontSize: 13.5, lineHeight: 21, textAlign: "right" },
});
