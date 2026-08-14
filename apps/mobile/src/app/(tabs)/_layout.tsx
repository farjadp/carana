// ============================================================================
// Source: apps/mobile/src/app/(tabs)/_layout.tsx
// Version: 2.0.0 — 2026-08-14
// Why: Bottom tab bar mirroring the web navigation. v2: the Hidden Č mark is
//      the home icon, labels are Vazirmatn, and the bar floats on a soft
//      shadow instead of a hairline.
// Env / Identity: Presentational.
// ============================================================================
import { Tabs } from "expo-router";
import { Building2, MapPin, Search, UserRound } from "lucide-react-native";

import { BrandMark } from "../../components/brand-mark";
import { colors, fonts } from "../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.annabi,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 88,
          paddingTop: 8,
          shadowColor: "#14213d",
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.semibold },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "خانه",
          tabBarIcon: ({ color, size }) => <BrandMark color={color} size={size} simple />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "دسته‌بندی",
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cities"
        options={{
          title: "موقعیت",
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "جستجو",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حساب من",
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
