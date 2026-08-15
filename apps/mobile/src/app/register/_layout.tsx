// ============================================================================
// Source: apps/mobile/src/app/register/_layout.tsx
// Version: 1.0.0 — 2026-08-15
// Why: The owner journey: verify contact → (optional) read from website →
//      the form → done. A stack so back always means "previous step".
// Env / Identity: Screens require a signed-in user; each checks and bounces
//      to the auth modal itself.
// ============================================================================
import { Stack } from "expo-router";

import { colors } from "../../theme";

export default function RegisterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="import" />
      <Stack.Screen name="form" />
    </Stack>
  );
}
