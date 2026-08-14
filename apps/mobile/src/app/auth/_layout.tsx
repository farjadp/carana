// ============================================================================
// Source: apps/mobile/src/app/auth/_layout.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Auth screens present modally over whatever the user was doing, so
//      signing in never loses their place in the directory.
// ============================================================================
import { Stack } from "expo-router";

import { colors } from "../../theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
