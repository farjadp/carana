// ============================================================================
// Source: apps/mobile/src/components/job-card.tsx
// Version: 1.0.0 — 2026-08-18
// Why: One hiring ad as a row — on the board, and on a business profile.
//      Every label and the salary line come from @charana/core, so the app
//      and the website cannot describe the same ad differently.
// Env / Identity: Presentational.
// ============================================================================
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Briefcase, MapPin } from "lucide-react-native";

import {
  EMPLOYMENT_TYPE_LABELS_FA,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  jobDaysRemaining,
  languageRequirementFa,
} from "@charana/core";

import type { JobPost } from "../lib/jobs";
import { colors, fonts, radius, shadow, space, type } from "../theme";

const fa = (n: number) => n.toLocaleString("fa-IR");

export function JobCard({
  job,
  /** On a business profile the company name is the heading above; repeating it in every row is noise. */
  showBusiness = true,
}: {
  job: JobPost;
  showBusiness?: boolean;
}) {
  const router = useRouter();
  const remaining = jobDaysRemaining(job);
  const language = languageRequirementFa(job);

  return (
    <Pressable
      onPress={() => router.push(`/jobs/${encodeURIComponent(job.slug)}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}
    >
      <View style={styles.titleRow}>
        <Briefcase size={14} color={colors.lajvard} />
        <Text style={styles.title} numberOfLines={2}>{job.title}</Text>
      </View>

      {showBusiness && job.business?.name ? <Text style={styles.business}>{job.business.name}</Text> : null}

      <View style={styles.metaRow}>
        <Text style={styles.badge}>{EMPLOYMENT_TYPE_LABELS_FA[job.employment_type]}</Text>
        <Text style={styles.meta}>{WORKPLACE_TYPE_LABELS_FA[job.workplace_type]}</Text>
        {job.city ? (
          <View style={styles.metaCity}>
            <MapPin size={11} color={colors.mutedText} />
            <Text style={styles.meta}>{job.city}</Text>
          </View>
        ) : null}
        <Text style={styles.meta}>{formatSalaryFa(job)}</Text>
        {language ? <Text style={styles.lang}>زبان: {language}</Text> : null}
      </View>

      {/* Only near the end. A countdown on every ad reads as an expiry
          warning and makes a healthy board look like one about to empty —
          the same reasoning as the public verification countdown. */}
      {remaining !== null && remaining > 0 && remaining <= 7 ? (
        <Text style={styles.ending}>{fa(remaining)} روز تا پایان</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 6, ...shadow.card },
  titleRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 7 },
  title: { flex: 1, fontSize: 16, fontFamily: fonts.heavy, color: colors.text, lineHeight: 26, textAlign: "right" },
  business: { ...type.muted, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, flexWrap: "wrap" },
  metaCity: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  badge: { fontSize: 11, fontFamily: fonts.bold, color: colors.lajvard, backgroundColor: colors.softLajvard, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  meta: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText },
  lang: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.text, backgroundColor: colors.softGold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  ending: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.annabi, textAlign: "right" },
});
