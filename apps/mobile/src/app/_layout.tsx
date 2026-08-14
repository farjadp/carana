// ============================================================================
// Source: apps/mobile/src/app/_layout.tsx
// Version: 1.0.0 — 2026-08-21
// Why: Root navigator for the čārana mobile app.
// Env / Identity: No data access here — screens fetch their own.
// ============================================================================
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      {/* Header hidden for now: the directory screen draws its own title.
          Add per-screen options as real routes land. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}
