// ============================================================================
// Source: apps/mobile/src/app/_layout.tsx
// Version: 2.0.0 — 2026-08-22
// Why: Root navigator. Tabs for the four main sections, a stack on top for
//      detail screens so a business profile pushes over the tab it came from.
// Env / Identity: No data access here — screens fetch their own.
// ============================================================================
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nManager } from "react-native";

import { AuthProvider } from "../context/auth";
import { colors } from "../theme";

// The whole product is Persian; force RTL rather than following the device.
I18nManager.allowRTL(true);

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="business/[slug]" options={{ presentation: "card" }} />
        {/* Auth slides up over whatever the user was doing, so signing in
            never loses their place in the directory. */}
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
