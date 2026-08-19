// ============================================================================
// Source: apps/mobile/src/app/jobs/index.tsx
// Version: 1.0.0 — 2026-08-18
// Why: The hiring board in the app — the same live ads as goplaza.ca/jobs,
//      with the same filters.
//
//      City chips are built from the cities that actually have ads, not from
//      the city table: a chip that leads to an empty list is a dead end the
//      user has to discover by tapping.
// Env / Identity: Public reads. Read-only — posting is an owner control and
//      mobile has none yet, so no "post a job" button appears here.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Briefcase, ChevronRight } from "lucide-react-native";

import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS_FA, type EmploymentType } from "@goplaza/core";

import { BrandLoading, MerlonGlyph } from "../../components/brand-mark";
import { JobCard } from "../../components/job-card";
import { listJobs, type JobPost } from "../../lib/jobs";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function JobsScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [language, setLanguage] = useState<"fa" | "en" | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJobs(await listJobs({ employmentType, language, city }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employmentType, language, city]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = employmentType !== null || language !== null || city !== null;
  // Derived from the current result set, so a chip never leads nowhere.
  const cities = [...new Set(jobs.map((j) => j.city).filter(Boolean) as string[])].sort();

  if (loading) return <BrandLoading />;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ChevronRight size={22} color={colors.text} /></Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>فرصت‌های شغلی</Text>
          <MerlonGlyph size={11} />
        </View>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.annabi} />}
        ListHeaderComponent={
          <View style={{ gap: space.sm, marginBottom: space.sm }}>
            <Text style={styles.lede}>
              آگهی‌های استخدام کسب‌وکارهای ایرانی در کانادا. هر آگهی را صاحب همان کسب‌وکار ثبت کرده و
              پس از تاریخ انقضا خودبه‌خود برداشته می‌شود.
            </Text>

            <Chips
              items={[{ key: null, label: "همه انواع" }, ...EMPLOYMENT_TYPES.map((t) => ({ key: t, label: EMPLOYMENT_TYPE_LABELS_FA[t] }))]}
              active={employmentType}
              onPick={(k) => setEmploymentType(k as EmploymentType | null)}
            />
            <Chips
              items={[
                { key: null, label: "هر زبانی" },
                { key: "fa", label: "فارسی لازم است" },
                { key: "en", label: "انگلیسی لازم است" },
              ]}
              active={language}
              onPick={(k) => setLanguage(k as "fa" | "en" | null)}
            />
            {cities.length > 1 || city ? (
              <Chips
                items={[{ key: null, label: "همه شهرها" }, ...cities.map((c) => ({ key: c, label: c }))]}
                active={city}
                onPick={setCity}
              />
            ) : null}

            {error ? <Text style={styles.err}>{error}</Text> : null}
            {jobs.length > 0 ? <Text style={styles.count}>{fa(jobs.length)} آگهی فعال</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Briefcase size={24} color={colors.mutedText} /></View>
            <Text style={styles.emptyTitle}>
              {filtered ? "با این فیلترها آگهی‌ای نیست." : "هنوز آگهی استخدامی ثبت نشده."}
            </Text>
            <Text style={styles.emptyBody}>
              {filtered
                ? "فیلترها را بردار تا همه آگهی‌ها را ببینی."
                : "ثبت آگهی استخدام برای صاحبان کسب‌وکار رایگان است و فعلاً از وب‌سایت انجام می‌شود."}
            </Text>
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} />}
      />
    </SafeAreaView>
  );
}

function Chips({
  items,
  active,
  onPick,
}: {
  items: { key: string | null; label: string }[];
  active: string | null;
  onPick: (key: string | null) => void;
}) {
  return (
    <FlatList
      horizontal
      inverted
      showsHorizontalScrollIndicator={false}
      data={items}
      keyExtractor={(i) => i.key ?? "__all"}
      contentContainerStyle={{ gap: 8 }}
      renderItem={({ item }) => {
        const on = item.key === active;
        return (
          <Pressable onPress={() => onPick(item.key)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingBottom: space.sm },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  title: { ...type.h1, fontSize: 24 },
  lede: { ...type.muted, textAlign: "right", lineHeight: 24 },
  list: { paddingHorizontal: space.md, paddingBottom: space.xl, gap: space.sm + 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, ...shadow.card },
  chipOn: { backgroundColor: colors.text },
  chipText: { fontSize: 13, fontFamily: fonts.bold, color: colors.text },
  chipTextOn: { color: colors.onAnnabi },
  count: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText, textAlign: "right" },
  empty: { alignItems: "center", gap: 8, paddingVertical: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadow.card },
  emptyTitle: { fontSize: 15, fontFamily: fonts.heavy, color: colors.text, textAlign: "center" },
  emptyBody: { ...type.muted, textAlign: "center", maxWidth: 300, lineHeight: 24 },
  err: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.annabi, textAlign: "right" },
});
