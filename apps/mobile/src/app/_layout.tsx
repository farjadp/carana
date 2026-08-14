// ============================================================================
// Source: apps/mobile/src/app/_layout.tsx
// Version: 3.0.0 — 2026-08-14
// Why: Root navigator. Tabs for the main sections, a stack on top for detail
//      screens. v3 loads the Vazirmatn brand faces and holds the splash
//      screen until they are ready, so no screen ever renders in the system
//      font first and then jumps.
// Env / Identity: No data access here — screens fetch their own.
// ============================================================================
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from "@expo-google-fonts/vazirmatn";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { I18nManager } from "react-native";

import { AuthProvider } from "../context/auth";
import { colors } from "../theme";

// The whole product is Persian; force RTL rather than following the device.
I18nManager.allowRTL(true);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
