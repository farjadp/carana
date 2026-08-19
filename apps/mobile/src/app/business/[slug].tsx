// ============================================================================
// Source: apps/mobile/src/app/business/[slug].tsx
// Version: 2.0.0 — 2026-08-15
// Why: Business profile — the screen the whole app funnels into. v2 is the
//      brand redesign to match the web profile: category photograph as cover
//      when the owner has none, merlon edge, identity card with the verified
//      badge, live "open now", the action row, and every registered fact in
//      its place. Nothing shown that is not backed by real state.
// Env / Identity: Public read. Only the public column set is requested.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Clipboard,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AtSign, BadgeCheck, Briefcase, CalendarDays, ChevronLeft, ChevronRight, Flame, Globe,
  Mail, MapPin, MessageCircle, Moon, Navigation, Phone, Send, Share2, ShieldCheck, Star,
} from "lucide-react-native";
import {
  activeBusyStatus, brand, getVerificationStatus, OWNER_SECTION_NOTE, OWNER_SECTION_TITLE,
  PROVINCES, type PublicOwner,
} from "@goplaza/core";
import { fetchBusinessOwner } from "../../lib/business-owner";

import { BrandLoading, BrandMark, MerlonGlyph, MerlonRow } from "../../components/brand-mark";
import { AnnouncementCard } from "../../components/announcement-card";
import { JobCard } from "../../components/job-card";
import { InteractionBar } from "../../components/interaction-bar";
import { getBusinessBySlug, listCategories, type BusinessDetail, type Category } from "../../lib/businesses";
import { listBusinessAnnouncements, type Announcement } from "../../lib/announcements";
import { listBusinessJobs, type JobPost } from "../../lib/jobs";
import { listPublishedReviews, type PublicReview } from "../../lib/interactions";
import { DAYS, openNow as computeOpenNow } from "../../lib/hours";
import { trackEvent } from "../../lib/analytics";
import { ReportSheet } from "../../components/report-sheet";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const SERVICE_TYPE_FA: Record<string, string> = { in_person: "حضوری", online: "آنلاین", both: "حضوری و آنلاین" };
const SERVICE_AREA_FA: Record<string, string> = { city: "در سطح شهر", province: "در سطح استان", canada: "سراسر کانادا", international: "بین‌المللی" };
const CONTACT_FA: Record<string, string> = { phone: "تماس تلفنی", whatsapp: "واتساپ", email: "ایمیل" };
const fa = (n: number | string) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** "مرداد ۱۴۰۵" — same Jalali month/year the web profile prints. Built from
 *  parts because format() emits "۱۴۰۵ مرداد", which reads backwards here.
 *  Hermes on this SDK ships full ICU, so no polyfill is needed. */
const faMonthYear = (iso: string) => {
  const parts = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")} ${get("year")}`.trim();
};
const WEB = brand.url;

export default function BusinessScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Resolved by the web app's route, not read here: `profiles` is
  // self-or-admin under RLS and the anon key cannot see a name.
  const [owner, setOwner] = useState<PublicOwner | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const found = await getBusinessBySlug(decodeURIComponent(slug ?? ""));
        setBusiness(found);
        if (found) {
          // One view per screen open, same event the website records.
          trackEvent(found.id, "view");
          const [revs, cats, news, hiring] = await Promise.all([
            listPublishedReviews(found.id),
            listCategories(),
            listBusinessAnnouncements(found.id),
            listBusinessJobs(found.id),
          ]);
          setReviews(revs);
          setAnnouncements(news);
          setJobs(hiring);
          setCategory(cats.find((c) => c.slug === found.category) ?? null);
          // Late and optional: the section appears when it resolves, and the
          // screen is complete without it if the request fails.
          fetchBusinessOwner(found.id).then(setOwner).catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطای ناشناخته");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const hours = business?.working_hours ?? null;
  const openNow = useMemo(() => computeOpenNow(hours), [hours]);

  if (loading) return <BrandLoading />;
  if (!business) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.body}>{error ?? "کسب‌وکار یافت نشد."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>بازگشت</Text></Pressable>
      </SafeAreaView>
    );
  }

  const verification = getVerificationStatus(business);
  const verified = verification.state === "verified" || verification.state === "expiring";
  const busy = activeBusyStatus(business);
  const provinceName = PROVINCES.find((p) => p.code === business.province)?.name ?? business.province;
  // Category images are stored site-relative; the app must make them absolute.
  const catImg = category?.image_url ? (category.image_url.startsWith("http") ? category.image_url : `${WEB}${category.image_url}`) : null;
  const cover = business.cover_url || catImg;
  const website = business.website ? (business.website.startsWith("http") ? business.website : `https://${business.website}`) : null;
  const wa = business.whatsapp ? `https://wa.me/${business.whatsapp.replace(/\D/g, "")}` : null;
  const q = encodeURIComponent([business.name, business.address, business.city, business.province].filter(Boolean).join(", "));
  const directions = business.google_maps_url ?? (Platform.OS === "ios" ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`);
  const services = business.services ?? [];
  const branches = business.branches ?? [];
  const hasHours = !!hours && DAYS.some((d) => hours[d.key]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + (r.public_rating || 0), 0) / reviews.length : null;
  const publicUrl = `${WEB}/businesses/${encodeURIComponent(business.slug ?? business.id)}`;

  const copyRef = () => { if (business.ref_no) Clipboard.setString(String(business.ref_no)); };
  const share = () => Share.share({ message: `${business.name} — ${publicUrl}`, url: publicUrl, title: business.name }).catch(() => {});

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xl * 2 }} bounces>
        {/* ───────── Cover ───────── */}
        <View style={styles.cover}>
          {cover ? <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.coverWash} />
          <View style={[styles.coverNav, { paddingTop: insets.top + 6 }]}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.coverBtn}><ChevronRight size={22} color="#fff" /></Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={share} hitSlop={10} style={styles.coverBtn}><Share2 size={18} color="#fff" /></Pressable>
          </View>
          <View style={styles.coverMerlon} pointerEvents="none"><MerlonRow color={colors.bg} height={10} /></View>
        </View>

        {/* ───────── Identity card ───────── */}
        <View style={styles.identity}>
          <View style={styles.identityTop}>
            <View style={styles.logoWrap}>
              {business.logo_url ? (
                <Image source={{ uri: business.logo_url }} style={styles.logo} />
              ) : (
                <Text style={styles.logoLetter}>{business.name.trim().charAt(0)}</Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.chipRow}>
                {verified ? (
                  <View style={styles.verifiedChip}><BadgeCheck size={13} color={colors.onAnnabi} /><Text style={styles.verifiedText}>مالکیت احرازشده</Text></View>
                ) : null}
                {busy ? (
                  <View style={[styles.verifiedChip, { backgroundColor: busy === "busy" ? "#dc2626" : "#059669" }]}>
                    {busy === "busy" ? <Flame size={13} color={colors.onAnnabi} /> : <Moon size={13} color={colors.onAnnabi} />}
                    <Text style={styles.verifiedText}>{busy === "busy" ? "الان شلوغیم" : "الان خلوته"}</Text>
                  </View>
                ) : null}
                {category ? (
                  <Pressable onPress={() => router.push(`/categories/${category.slug}`)} style={styles.catChip}><Text style={styles.catChipText}>{category.name}</Text></Pressable>
                ) : null}
                {business.ref_no ? (
                  <Pressable onPress={copyRef} style={styles.refChip} hitSlop={6}><Text style={styles.refChipText}>#{business.ref_no}</Text></Pressable>
                ) : null}
              </View>
              <Text style={styles.name}>{business.name}</Text>
              {business.name_en ? <Text style={styles.nameEn}>{business.name_en}</Text> : null}
            </View>
          </View>
          {business.tagline ? <Text style={styles.tagline}>{business.tagline}</Text> : null}

          <View style={styles.metaRow}>
            {business.city ? <Meta icon={<MapPin size={13} color={colors.annabi} />} text={`${business.city}${provinceName ? `، ${provinceName}` : ""}`} /> : null}
            {openNow ? (
              <View style={styles.metaItem}>
                <View style={[styles.dot, { backgroundColor: openNow.open ? colors.success : colors.mutedText }]} />
                <Text style={[styles.metaText, openNow.open && { color: colors.success, fontFamily: fonts.bold }]}>{openNow.label}</Text>
              </View>
            ) : null}
            {avg ? <Meta icon={<Star size={13} color={colors.gold} fill={colors.gold} />} text={`${fa(Math.round(avg * 10) / 10)} (${fa(reviews.length)} نظر)`} /> : null}
            {business.established_year ? <Meta icon={<CalendarDays size={13} color={colors.mutedText} />} text={`از ${fa(business.established_year)}`} /> : null}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {business.phone ? <Action primary icon={<Phone size={17} color={colors.onAnnabi} />} label="تماس" onPress={() => { trackEvent(business.id, "call"); Linking.openURL(`tel:${business.phone}`); }} /> : null}
            {wa ? <Action icon={<MessageCircle size={17} color={colors.success} />} label="واتساپ" onPress={() => { trackEvent(business.id, "whatsapp"); Linking.openURL(wa); }} /> : null}
            {business.address || business.google_maps_url ? <Action icon={<Navigation size={17} color={colors.lajvard} />} label="مسیریابی" onPress={() => { trackEvent(business.id, "directions"); Linking.openURL(directions); }} /> : null}
            {website ? <Action icon={<Globe size={17} color={colors.lajvard} />} label="وب‌سایت" onPress={() => { trackEvent(business.id, "website"); Linking.openURL(website); }} /> : null}
          </View>
          {business.accepts_appointments && business.booking_url ? (
            <Pressable onPress={() => { trackEvent(business.id, "booking"); Linking.openURL(business.booking_url!); }} style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.85 }]}>
              <CalendarDays size={17} color="#fff" /><Text style={styles.bookText}>رزرو نوبت</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <InteractionBar businessId={business.id} businessName={business.name} />

          {/* Announcements — active ones only (expiry is filtered in the
              query). Absent entirely when there are none, like the web. */}
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} variant="banner" />
          ))}

          {/* Hiring — live ads only (filtered in the query). The count in the
              title comes from the rows themselves, and the section is absent
              entirely when there are none. Same rule as the website. */}
          {jobs.length ? (
            <Section title={`${jobs.length.toLocaleString("fa-IR")} فرصت شغلی`}>
              <View style={{ gap: space.sm }}>
                {jobs.map((j) => (
                  <JobCard key={j.id} job={j} showBusiness={false} />
                ))}
              </View>
            </Section>
          ) : null}

          {/* About */}
          <Section title="درباره">
            {business.short_description ? <Text style={styles.lead}>{business.short_description}</Text> : null}
            {business.description ? <Text style={styles.para}>{business.description}</Text> : null}
            <View style={styles.facts}>
              <Fact label="نوع خدمات" value={SERVICE_TYPE_FA[business.service_type ?? ""]} />
              <Fact label="محدوده" value={SERVICE_AREA_FA[business.service_area ?? ""]} />
              <Fact label="زبان‌ها" value={business.languages?.length ? business.languages.join("، ") : undefined} />
              <Fact label="تماس ترجیحی" value={CONTACT_FA[business.preferred_contact ?? ""]} />
            </View>
          </Section>

          {/* Services */}
          {services.length ? (
            <Section title="خدمات و تعرفه‌ها" meta={`${fa(services.length)} مورد`}>
              {services.map((s, i) => (
                <View key={i} style={[styles.serviceRow, i < services.length - 1 && styles.rowLine]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{s.name}</Text>
                    {s.description ? <Text style={styles.serviceDesc}>{s.description}</Text> : null}
                  </View>
                  {s.price ? (
                    <Text style={styles.price}>{fa(s.price)}<Text style={styles.priceUnit}> {s.price_unit ? `/ ${s.price_unit}` : "دلار"}</Text></Text>
                  ) : (
                    <Text style={styles.priceAsk}>استعلام</Text>
                  )}
                </View>
              ))}
            </Section>
          ) : null}

          {/* Hours */}
          {hasHours ? (
            <Section title="ساعات کاری">
              {DAYS.map((d) => {
                const h = hours![d.key];
                const today = new Date().getDay() === d.js;
                const closed = !h || h.closed || !h.open || !h.close;
                return (
                  <View key={d.key} style={styles.hourRow}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.hourDay, today && styles.today]}>{d.label}</Text>
                      {today ? <View style={styles.todayPill}><Text style={styles.todayText}>امروز</Text></View> : null}
                    </View>
                    <Text style={[styles.hourVal, today && styles.today, closed && { color: colors.mutedText }]}>
                      {closed ? "تعطیل" : `${fa(h!.open!)} – ${fa(h!.close!)}`}
                    </Text>
                  </View>
                );
              })}
              {business.accepts_appointments ? <Text style={styles.hint}>با هماهنگی قبلی هم پذیرش دارد.</Text> : null}
            </Section>
          ) : business.accepts_appointments ? (
            <Section title="ساعات کاری"><Text style={styles.hint}>با تعیین وقت قبلی.</Text></Section>
          ) : null}

          {/* Contact */}
          <Section title="اطلاعات تماس">
            {business.phone ? <Row icon={<Phone size={15} color={colors.annabi} />} label="تلفن" value={business.phone} onPress={() => Linking.openURL(`tel:${business.phone}`)} ltr /> : null}
            {business.whatsapp ? <Row icon={<MessageCircle size={15} color={colors.annabi} />} label="واتساپ" value={business.whatsapp} onPress={() => Linking.openURL(wa!)} ltr /> : null}
            {business.contact_email ? <Row icon={<Mail size={15} color={colors.annabi} />} label="ایمیل" value={business.contact_email} onPress={() => Linking.openURL(`mailto:${business.contact_email}`)} ltr /> : null}
            {website ? <Row icon={<Globe size={15} color={colors.annabi} />} label="وب‌سایت" value={website.replace(/^https?:\/\//, "").replace(/\/$/, "")} onPress={() => Linking.openURL(website)} ltr /> : null}
            {business.instagram ? <Row icon={<AtSign size={15} color={colors.annabi} />} label="اینستاگرام" value={"@" + business.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")} onPress={() => Linking.openURL(business.instagram!)} ltr /> : null}
            {business.telegram ? <Row icon={<Send size={15} color={colors.annabi} />} label="تلگرام" value={"@" + business.telegram.replace(/^https?:\/\/(t\.me|telegram\.me)\//, "").replace(/\/.*$/, "")} onPress={() => Linking.openURL(business.telegram!)} ltr /> : null}
            {business.linkedin ? <Row icon={<Briefcase size={15} color={colors.annabi} />} label="لینکدین" value="پروفایل شرکت" onPress={() => Linking.openURL(business.linkedin!)} /> : null}
            {!business.phone && !business.whatsapp && !business.contact_email && !website ? <Text style={styles.hint}>راه تماسی ثبت نشده است.</Text> : null}
          </Section>

          {/* Location */}
          {business.city || (business.is_address_public !== false && business.address) ? (
            <Section title="موقعیت">
              {business.is_address_public !== false && business.address ? <Text style={styles.address}>{business.address}</Text> : null}
              <Text style={styles.hint}>{business.city}{provinceName ? `، ${provinceName}` : ""}</Text>
              <Pressable onPress={() => Linking.openURL(directions)} style={({ pressed }) => [styles.mapBtn, pressed && { opacity: 0.8 }]}>
                <Navigation size={15} color={colors.lajvard} /><Text style={styles.mapBtnText}>باز کردن در نقشه</Text>
              </Pressable>
              {branches.length ? (
                <View style={{ marginTop: space.sm, gap: space.sm }}>
                  <Text style={styles.subhead}>شعبه‌های دیگر</Text>
                  {branches.map((b, i) => (
                    <View key={i}>
                      <Text style={styles.serviceName}>{b.name ?? `شعبه ${fa(i + 2)}`}</Text>
                      <Text style={[styles.hint, { writingDirection: "ltr", textAlign: "right" }]}>{[b.address, b.city].filter(Boolean).join(", ")}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Section>
          ) : null}

          {/* Reviews */}
          <Section title="نظرات کاربران" meta={reviews.length ? `${fa(reviews.length)} نظر` : undefined}>
            {reviews.length === 0 ? (
              <Text style={styles.hint}>هنوز نظری ثبت نشده است. اولین نفر باشید — نظرها پس از بررسی منتشر می‌شوند.</Text>
            ) : reviews.map((r) => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewHead}>
                  <View style={styles.stars}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} color={colors.gold} fill={n <= r.public_rating ? colors.gold : "transparent"} />)}</View>
                  {r.public_title ? <Text style={styles.reviewTitle}>{r.public_title}</Text> : null}
                </View>
                <Text style={styles.para}>{r.public_body}</Text>
              </View>
            ))}
          </Section>

          {/* Owner — the route already applied every gate the website does
              (verified, a real person attached, has a name, not hidden by a
              Premium owner), so a non-null value here is safe to print. */}
          {owner?.full_name ? (
            <Section title={OWNER_SECTION_TITLE}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: space.sm }}>
                {owner.avatar_url ? (
                  <Image source={{ uri: owner.avatar_url }} style={styles.ownerAvatar} />
                ) : (
                  <View style={[styles.ownerAvatar, styles.ownerAvatarFallback]}>
                    <Text style={styles.ownerInitial}>{owner.full_name.trim()[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.subhead}>{owner.full_name}</Text>
                  {owner.member_since ? (
                    <Text style={styles.hint}>عضو گوپلازا از {faMonthYear(owner.member_since)}</Text>
                  ) : null}
                </View>
              </View>
              {verification.method ? (
                <Text style={styles.hint}>{OWNER_SECTION_NOTE[verification.method]}</Text>
              ) : null}
            </Section>
          ) : null}

          {/* Trust */}
          <Section title="اعتماد و شفافیت">
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: space.sm }}>
              <ShieldCheck size={18} color={verified ? colors.success : colors.mutedText} />
              <Text style={[styles.para, { flex: 1 }]}>
                {verified
                  ? `مالکیت این کسب‌وکار ${verification.method === "claimed" ? "با پیامک به شماره‌ی ثبت‌شده" : "هنگام ثبت"} احراز شده است.`
                  : "مالکیت این کسب‌وکار هنوز احراز نشده است."}
              </Text>
            </View>
            {!verified ? (
              <Pressable onPress={() => Linking.openURL(`${WEB}/claim?businessId=${business.id}`)} style={styles.claimBtn}>
                <Text style={styles.claimText}>صاحب این کسب‌وکار هستید؟ مالکیتش را احراز کنید</Text>
                <ChevronLeft size={14} color={colors.annabi} />
              </Pressable>
            ) : null}
            {business.is_iranian_owned ? (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                <BrandMark size={14} simple /><Text style={styles.hint}>کسب‌وکار ایرانی‌-کانادایی</Text>
              </View>
            ) : null}
            {business.ref_no ? (
              <Pressable onPress={copyRef} style={styles.refRow}>
                <Text style={styles.refValue}>#{business.ref_no}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subhead}>شماره‌ی مرجع گوپلازا</Text>
                  <Text style={styles.hint}>در تماس با پشتیبانی یا احراز مالکیت این شماره را بگویید. برای کپی لمس کنید.</Text>
                </View>
              </Pressable>
            ) : null}
            {/* Same report flow and same queue as the website. */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.sm, marginTop: 2 }}>
              <ReportSheet businessId={business.id} businessName={business.name} />
            </View>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

// ───────────────────────────── bits ─────────────────────────────

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <View style={styles.metaItem}>{icon}<Text style={styles.metaText}>{text}</Text></View>;
}
function Action({ icon, label, onPress, primary }: { icon: React.ReactNode; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, primary && styles.actionPrimary, pressed && { opacity: 0.8 }]}>
      {icon}<Text style={[styles.actionText, primary && { color: colors.onAnnabi }]}>{label}</Text>
    </Pressable>
  );
}
function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}><Text style={styles.sectionTitle}>{title}</Text><MerlonGlyph size={10} /></View>
        {meta ? <Text style={type.muted}>{meta}</Text> : null}
      </View>
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}
function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>;
}
function Row({ icon, label, value, onPress, ltr }: { icon: React.ReactNode; label: string; value: string; onPress: () => void; ltr?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.7 }]}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={[styles.contactValue, ltr && { writingDirection: "ltr", textAlign: "right" }]} numberOfLines={1}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: space.md },
  backBtn: { paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.annabi, borderRadius: radius.pill },
  backBtnText: { color: colors.onAnnabi, fontFamily: fonts.bold },

  cover: { height: 230, backgroundColor: colors.annabi, overflow: "hidden" },
  coverWash: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,33,61,0.42)" },
  coverNav: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: space.md, gap: space.sm },
  coverBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  coverMerlon: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", opacity: 0.95 },

  identity: { marginTop: -46, marginHorizontal: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, ...shadow.raised },
  identityTop: { flexDirection: "row-reverse", gap: space.md, alignItems: "flex-start" },
  logoWrap: { width: 78, height: 78, borderRadius: 22, backgroundColor: colors.bg, marginTop: -44, borderWidth: 4, borderColor: colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden", ...shadow.card },
  logo: { width: "100%", height: "100%" },
  logoLetter: { fontSize: 32, fontFamily: fonts.heavy, color: colors.annabi },
  chipRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  verifiedChip: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: colors.annabi, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  verifiedText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.onAnnabi },
  catChip: { backgroundColor: colors.softLajvard, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  catChipText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.lajvard },
  name: { ...type.h1, fontSize: 22, lineHeight: 32, textAlign: "right" },
  nameEn: { ...type.muted, fontSize: 13, textAlign: "right", writingDirection: "ltr" },
  tagline: { ...type.body, color: colors.text, textAlign: "right", opacity: 0.85 },
  metaRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12, alignItems: "center" },
  metaItem: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.mutedText },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: "row-reverse", gap: 8, marginTop: 4 },
  action: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 5 },
  actionPrimary: { backgroundColor: colors.annabi },
  actionText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.text },
  bookBtn: { height: 46, borderRadius: radius.md, backgroundColor: colors.lajvard, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 6 },
  bookText: { fontSize: 14, fontFamily: fonts.bold, color: "#fff" },

  body: { paddingHorizontal: space.md, paddingTop: space.md, gap: space.md },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  sectionHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  sectionTitle: { ...type.h2, fontSize: 16 },
  lead: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, textAlign: "right", lineHeight: 24 },
  para: { ...type.body, textAlign: "right", opacity: 0.9 },
  facts: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8, marginTop: 4 },
  fact: { minWidth: "47%", flexGrow: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9 },
  factLabel: { fontSize: 11, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right" },
  factValue: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right", marginTop: 1 },
  serviceRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: space.sm, paddingVertical: 8 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  serviceName: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  serviceDesc: { ...type.muted, textAlign: "right", marginTop: 2 },
  price: { fontSize: 16, fontFamily: fonts.heavy, color: colors.annabi },
  priceUnit: { fontSize: 11, fontFamily: fonts.regular, color: colors.mutedText },
  priceAsk: { ...type.muted, fontSize: 11.5 },
  hourRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  hourDay: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  hourVal: { fontSize: 13.5, fontFamily: fonts.medium, color: colors.text, writingDirection: "ltr" },
  today: { color: colors.annabi, fontFamily: fonts.heavy },
  todayPill: { backgroundColor: colors.softAnnabi, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  todayText: { fontSize: 10, fontFamily: fonts.bold, color: colors.annabi },
  hint: { ...type.muted, textAlign: "right" },
  subhead: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.mutedText, textAlign: "right" },

  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.line },
  ownerAvatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: `${colors.annabi}1a` },
  ownerInitial: { fontSize: 15, fontFamily: fonts.heavy, color: colors.annabi },
  address: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right", writingDirection: "ltr" },
  mapBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.softLajvard, borderRadius: radius.md, paddingVertical: 10 },
  mapBtnText: { fontSize: 13, fontFamily: fonts.bold, color: colors.lajvard },
  contactRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingVertical: 6 },
  contactIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  contactLabel: { fontSize: 10.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "right" },
  contactValue: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  review: { backgroundColor: colors.bg, borderRadius: radius.md, padding: space.sm + 2, gap: 5 },
  reviewHead: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm },
  stars: { flexDirection: "row-reverse", gap: 2 },
  reviewTitle: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  claimBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.softAnnabi, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  claimText: { fontSize: 13, fontFamily: fonts.bold, color: colors.annabi },
  refChip: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  refChipText: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.mutedText, writingDirection: "ltr" },
  refRow: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
  refValue: { fontSize: 18, fontFamily: fonts.heavy, color: colors.text, writingDirection: "ltr", letterSpacing: 1 },
});
