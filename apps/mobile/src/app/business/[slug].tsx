// ============================================================================
// Source: apps/mobile/src/app/business/[slug].tsx
// Version: 1.0.0 — 2026-08-22
// Why: Business profile — the screen the whole app funnels into.
// Env / Identity: Public read. Only the public column set is requested.
// ============================================================================
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
} from "lucide-react-native";

import { getBusinessBySlug, type BusinessDetail } from "../../lib/businesses";
import { colors, radius, space, type } from "../../theme";

const DAY_LABELS: Record<string, string> = {
  sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه",
  wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
};

export default function BusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setBusiness(await getBusinessBySlug(decodeURIComponent(slug ?? "")));
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.annabi} />
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFound}>{error ?? "کسب‌وکار یافت نشد."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>بازگشت</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const openMaps = () => {
    const target = business.google_maps_url;
    if (target) {
      Linking.openURL(target);
      return;
    }
    const q = encodeURIComponent(
      [business.address, business.city, business.province].filter(Boolean).join(", ")
    );
    Linking.openURL(
      Platform.OS === "ios" ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`
    );
  };

  const hours = business.working_hours ?? {};
  const hourRows = Object.entries(hours).filter(([, v]) => v);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronRight size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{business.name.trim().charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{business.name}</Text>
          {business.name_en ? <Text style={styles.nameEn}>{business.name_en}</Text> : null}
          {business.tagline ? <Text style={styles.tagline}>{business.tagline}</Text> : null}

          <View style={styles.metaRow}>
            {business.city ? (
              <View style={styles.metaChip}>
                <MapPin size={13} color={colors.lajvard} />
                <Text style={styles.metaChipText}>{business.city}</Text>
              </View>
            ) : null}
            {business.established_year ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>از سال {business.established_year}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Primary actions */}
        <View style={styles.actions}>
          {business.phone ? (
            <ActionButton
              icon={<Phone size={18} color="#fff" />}
              label="تماس"
              primary
              onPress={() => Linking.openURL(`tel:${business.phone}`)}
            />
          ) : null}
          {business.whatsapp ? (
            <ActionButton
              icon={<MessageCircle size={18} color={colors.text} />}
              label="واتساپ"
              onPress={() =>
                Linking.openURL(`https://wa.me/${business.whatsapp!.replace(/\D/g, "")}`)
              }
            />
          ) : null}
          {business.address || business.google_maps_url ? (
            <ActionButton
              icon={<Navigation size={18} color={colors.text} />}
              label="مسیریابی"
              onPress={openMaps}
            />
          ) : null}
        </View>

        {business.description ? (
          <Section title="درباره">
            <Text style={styles.body}>{business.description}</Text>
          </Section>
        ) : null}

        {business.services?.length ? (
          <Section title="خدمات و تعرفه">
            {business.services.map((s, i) => (
              <View key={i} style={styles.serviceRow}>
                <Text style={styles.servicePrice}>
                  {s.price ? `${s.price} ${s.price_unit ?? ""}`.trim() : "—"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{s.name}</Text>
                  {s.description ? (
                    <Text style={styles.serviceDesc}>{s.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {hourRows.length ? (
          <Section title="ساعات کاری">
            {hourRows.map(([day, value]) => (
              <View key={day} style={styles.hourRow}>
                <Text style={styles.hourValue}>{String(value)}</Text>
                <Text style={styles.hourDay}>{DAY_LABELS[day] ?? day}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        <Section title="اطلاعات تماس">
          {business.address && business.is_address_public !== false ? (
            <InfoRow icon={<MapPin size={16} color={colors.mutedText} />} value={business.address} />
          ) : null}
          {business.phone ? (
            <InfoRow
              icon={<Phone size={16} color={colors.mutedText} />}
              value={business.phone}
              onPress={() => Linking.openURL(`tel:${business.phone}`)}
            />
          ) : null}
          {business.contact_email ? (
            <InfoRow
              icon={<Mail size={16} color={colors.mutedText} />}
              value={business.contact_email}
              onPress={() => Linking.openURL(`mailto:${business.contact_email}`)}
            />
          ) : null}
          {business.website ? (
            <InfoRow
              icon={<Globe size={16} color={colors.mutedText} />}
              value={business.website}
              onPress={() => Linking.openURL(business.website!)}
            />
          ) : null}
        </Section>

        {business.branches?.length ? (
          <Section title="شعب دیگر">
            {business.branches.map((b, i) => (
              <View key={i} style={styles.branch}>
                <Text style={styles.branchName}>{b.name ?? `شعبه ${i + 2}`}</Text>
                <Text style={styles.branchAddr}>
                  {[b.address, b.city].filter(Boolean).join("، ")}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon}
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({
  icon,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.infoRow}>
      <Text style={[styles.infoValue, onPress && { color: colors.lajvard }]} numberOfLines={2}>
        {value}
      </Text>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: space.md },
  notFound: { ...type.body, color: colors.mutedText },
  backBtn: { paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.annabi, borderRadius: radius.pill },
  backBtnText: { color: "#fff", fontWeight: "700" },

  navBar: { flexDirection: "row-reverse", paddingHorizontal: space.md, paddingVertical: space.sm },
  back: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    alignItems: "center", justifyContent: "center",
  },
  scroll: { paddingHorizontal: space.md },

  hero: { alignItems: "center", paddingVertical: space.md },
  avatar: {
    width: 72, height: 72, borderRadius: radius.lg,
    backgroundColor: colors.softAnnabi, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 30, fontWeight: "800", color: colors.annabi },
  name: { ...type.h1, fontSize: 24, textAlign: "center", marginTop: space.sm },
  nameEn: { ...type.muted, marginTop: 2 },
  tagline: { ...type.body, color: colors.mutedText, textAlign: "center", marginTop: 6 },
  metaRow: { flexDirection: "row-reverse", gap: space.xs, marginTop: space.sm, flexWrap: "wrap", justifyContent: "center" },
  metaChip: {
    flexDirection: "row-reverse", alignItems: "center", gap: 4,
    backgroundColor: colors.softLajvard, borderRadius: radius.pill,
    paddingHorizontal: space.sm, paddingVertical: 5,
  },
  metaChipText: { fontSize: 12, fontWeight: "600", color: colors.lajvard },

  actions: { flexDirection: "row-reverse", gap: space.sm, marginTop: space.sm },
  action: {
    flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  actionPrimary: { backgroundColor: colors.annabi, borderColor: colors.annabi },
  actionText: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  actionTextPrimary: { color: "#fff" },

  section: { marginTop: space.lg },
  sectionTitle: { ...type.h2, fontSize: 16, textAlign: "right", marginBottom: space.sm },
  sectionBody: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.sm,
  },
  body: { ...type.body, textAlign: "right" },

  serviceRow: { flexDirection: "row-reverse", gap: space.sm, alignItems: "flex-start" },
  serviceName: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  serviceDesc: { ...type.muted, textAlign: "right", marginTop: 2 },
  servicePrice: { fontSize: 13, fontWeight: "700", color: colors.lajvard },

  hourRow: { flexDirection: "row-reverse", justifyContent: "space-between" },
  hourDay: { fontSize: 13.5, color: colors.text, fontWeight: "600" },
  hourValue: { fontSize: 13.5, color: colors.mutedText },

  infoRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm },
  infoValue: { ...type.body, flex: 1, textAlign: "right" },

  branch: { gap: 2 },
  branchName: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  branchAddr: { ...type.muted, textAlign: "right" },
});
