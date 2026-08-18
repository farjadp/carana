// ============================================================================
// Source: app/businesses/[slug]/business-profile-client.tsx
// Version: 3.0.0 — 2026-08-15
// Why: The public business profile — the page every search, card and share
//      lands on. v3 is a ground-up brand redesign: cream ground, annabi and
//      lajvard, Vazirmatn; category photography as the cover when the owner
//      has none; a live "open now" computed from working_hours; every fact
//      the owner registered laid out where a visitor looks for it, and
//      nothing rendered that is not backed by real state (no fake report
//      toast, no is_claimed / is_featured / gallery columns that never
//      existed, no raw category slug).
// Env / Identity: Client component. Only public columns arrive here.
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MapPin, Globe, Phone, Mail, Clock, ShieldCheck, Sparkles, MessageCircle,
  ExternalLink, CalendarDays, ChevronLeft, Star, Share2, Send, AtSign,
  Briefcase, Languages, Navigation, Edit3, Building2, CheckCircle2, BadgeCheck,
  Check, Bookmark, Hash, Copy, Flame, Moon, Megaphone, UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import InteractionBar from "@/components/business/interaction-bar";
import { PrivateNoteCard } from "@/components/business/private-note-card";
import { VerificationBadge, VerificationDetail, faNumber } from "@/components/verification-badge";
import { ViewCounter } from "@/components/business/view-counter";
import { ReportDialog } from "@/components/business/report-dialog";
import { trackEvent } from "@/lib/analytics/track";
import { BrandMark } from "@/components/brand-mark";
import { getVerificationStatus } from "@/lib/verification/status";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";
import { activeBusyStatus } from "@/lib/business/live-status";
import { replyToReview } from "@/lib/actions/interactions";
import {
  EMPLOYMENT_TYPE_LABELS_FA, OWNER_SECTION_NOTE, OWNER_SECTION_TITLE, PROVINCES,
  WORKPLACE_TYPE_LABELS_FA, formatSalaryFa,
  type EmploymentType, type PublicOwner, type SalaryPeriod, type WorkplaceType,
} from "@charana/core";

interface Props {
  business: any;
  category: { slug: string; name: string; image_url: string | null } | null;
  user: any;
  initialInteraction: any;
  approvedReviews: any[];
  announcements: { id: string; title: string; body: string | null; expires_at: string | null; created_at: string }[];
  /** Live hiring ads only — the page never renders a count it cannot back. */
  jobs: {
    id: string; slug: string; title: string;
    employment_type: EmploymentType; workplace_type: WorkplaceType;
    city: string | null;
    salary_min: number | null; salary_max: number | null;
    salary_period: SalaryPeriod | null; salary_is_public: boolean;
    requires_persian: boolean; requires_english: boolean;
  }[];
  similarBusinesses: any[];
  isOwnerOrAdmin: boolean;
  /**
   * The person behind a verified listing, or null. Already gated server-side
   * (app/businesses/[slug]/page.tsx): null when unverified, when nobody has
   * claimed the row, when the profile has no name, or when a Premium owner
   * hid it. This component only decides how it looks, never whether it shows.
   */
  publicOwner: PublicOwner | null;
}

const DAYS: { key: string; label: string; jsIndex: number }[] = [
  { key: "saturday", label: "شنبه", jsIndex: 6 },
  { key: "sunday", label: "یکشنبه", jsIndex: 0 },
  { key: "monday", label: "دوشنبه", jsIndex: 1 },
  { key: "tuesday", label: "سه‌شنبه", jsIndex: 2 },
  { key: "wednesday", label: "چهارشنبه", jsIndex: 3 },
  { key: "thursday", label: "پنجشنبه", jsIndex: 4 },
  { key: "friday", label: "جمعه", jsIndex: 5 },
];

const SERVICE_TYPE_FA: Record<string, string> = { in_person: "حضوری", online: "آنلاین", both: "حضوری و آنلاین" };
const SERVICE_AREA_FA: Record<string, string> = { city: "در سطح شهر", province: "در سطح استان", canada: "سراسر کانادا", international: "بین‌المللی" };
const CONTACT_FA: Record<string, string> = { phone: "تماس تلفنی", whatsapp: "واتساپ", email: "ایمیل" };

/** Persian digits inside a time like 09:30 → ۰۹:۳۰ */
const faTime = (t: string) => t.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * "مرداد ۱۴۰۵" — fa-IR resolves to the Jalali calendar, same as the badge.
 * Built from parts because `format()` with {year, month} emits "۱۴۰۵ مرداد"
 * on this ICU, which reads backwards after "عضو چارانا از".
 */
const faMonthYear = (iso: string) => {
  const parts = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")} ${get("year")}`.trim();
};

function useOpenNow(hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null | undefined) {
  return useMemo(() => {
    if (!hours || !Object.keys(hours).length) return null;
    const now = new Date();
    const today = DAYS.find((d) => d.jsIndex === now.getDay());
    if (!today) return null;
    const h = hours[today.key];
    if (!h) return { known: false as const };
    if (h.closed || !h.open || !h.close) return { known: true as const, open: false as const, todayLabel: "امروز تعطیل" };
    const [oh, om] = h.open.split(":").map(Number);
    const [ch, cm] = h.close.split(":").map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const isOpen = mins >= oh * 60 + om && mins < ch * 60 + cm;
    return {
      known: true as const,
      open: isOpen,
      todayLabel: isOpen ? `باز است · تا ${faTime(h.close)}` : `بسته است · ${faTime(h.open)} باز می‌شود`,
    };
  }, [hours]);
}

export default function BusinessProfileClient({
  business, category, user, initialInteraction, approvedReviews, announcements, jobs, similarBusinesses, isOwnerOrAdmin,
  publicOwner,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);
  const copyRef = async () => {
    if (!business.ref_no) return;
    await navigator.clipboard.writeText(String(business.ref_no));
    setRefCopied(true);
    toast.success(`شماره‌ی مرجع ${faNumber(business.ref_no)} کپی شد`);
    setTimeout(() => setRefCopied(false), 1500);
  };
  const verification = getVerificationStatus(business);
  const openNow = useOpenNow(business.working_hours);
  const provinceName = PROVINCES.find((p) => p.code === business.province)?.name ?? business.province;
  const cover = business.cover_url || category?.image_url || null;
  const services: any[] = Array.isArray(business.services) ? business.services : [];
  const branches: any[] = Array.isArray(business.branches) ? business.branches : [];
  const hours = business.working_hours && typeof business.working_hours === "object" ? business.working_hours : null;
  const hasHours = hours && DAYS.some((d) => hours[d.key]);
  const website = business.website ? (business.website.startsWith("http") ? business.website : `https://${business.website}`) : null;
  const wa = business.whatsapp ? `https://wa.me/${String(business.whatsapp).replace(/[^0-9]/g, "")}` : null;
  const mapsQuery = encodeURIComponent(`${business.name} ${business.address || ""}, ${business.city || ""}, ${business.province || ""}, Canada`);
  const directions = business.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
  const avgRating = approvedReviews.length
    ? approvedReviews.reduce((s, r) => s + (r.rating || 0), 0) / approvedReviews.length
    : null;
  // review_replies is a Starter+ feature — entitlementsFor recomputes it
  // from plan/plan_until every render, same expiry rule as the server
  // action that actually writes the reply.
  const canReplyToReviews = isOwnerOrAdmin && entitlementsFor(business).has("review_replies");
  const ownerSeesUpsell = isOwnerOrAdmin && !canReplyToReviews;
  const busyStatus = activeBusyStatus(business);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: business.name, text: business.short_description || business.name, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("لینک کپی شد");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[color:var(--bg)] pb-24" dir="rtl">
      <ViewCounter businessId={business.id} />

      {/* ───────────────────────────── Cover ───────────────────────────── */}
      <div className="relative h-[240px] md:h-[340px] overflow-hidden bg-[color:var(--annabi)]">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {/* Warm brand wash so any photo sits inside the palette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#14213d]/85 via-[#14213d]/25 to-[#800000]/20" />
        {/* Merlon parapet along the bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-3 opacity-90" aria-hidden>
          <svg viewBox="0 0 48 12" preserveAspectRatio="none" className="w-full h-full">
            <pattern id="merlon" width="48" height="12" patternUnits="userSpaceOnUse">
              <path d="M0,12 V8 H6 V4 H12 V0 H24 V4 H30 V8 H36 V12 Z" fill="#f6f1e8" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#merlon)" />
          </svg>
        </div>

        {/* Top-left actions */}
        <div className="absolute top-5 left-4 md:left-8 flex items-center gap-2 z-10">
          <button onClick={share} className="h-10 px-3.5 rounded-full bg-white/15 backdrop-blur-md text-white hover:bg-white/25 transition flex items-center gap-2 text-xs font-bold" title="اشتراک‌گذاری">
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            <span className="hidden sm:inline">{copied ? "کپی شد" : "اشتراک"}</span>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="absolute top-5 right-4 md:right-8 z-10 flex items-center gap-2 text-xs text-white/85">
          <Link href="/" className="hover:text-white flex items-center gap-1.5"><BrandMark size={16} color="#f6f1e8" simple /> چارانا</Link>
          <ChevronLeft size={12} />
          {category ? <Link href={`/categories/${category.slug}`} className="hover:text-white">{category.name}</Link> : null}
          {business.city ? (<><ChevronLeft size={12} /><Link href={`/cities/${encodeURIComponent(business.city)}`} className="hover:text-white">{business.city}</Link></>) : null}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ────────────────────────── Identity card ────────────────────────── */}
        <div className="-mt-16 md:-mt-20 relative z-10 bg-white rounded-[28px] shadow-[0_22px_60px_rgba(20,33,61,0.12)] p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-[color:var(--bg)] ring-4 ring-white shadow-lg overflow-hidden shrink-0 -mt-16 md:-mt-20 flex items-center justify-center">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl font-black text-[color:var(--annabi)]">{String(business.name).trim().charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <VerificationBadge status={verification} size="lg" audience="public" />
                {busyStatus === "busy" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                    <Flame size={12} /> الان شلوغیم
                  </span>
                ) : busyStatus === "quiet" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                    <Moon size={12} /> الان خلوته
                  </span>
                ) : null}
                {category ? (
                  <Link href={`/categories/${category.slug}`} className="text-xs font-bold text-[color:var(--lajvard)] bg-[color:var(--lajvard)]/8 px-2.5 py-1 rounded-full hover:bg-[color:var(--lajvard)]/12 transition">
                    {category.name}
                  </Link>
                ) : null}
                {business.sub_category ? <span className="text-xs text-[color:var(--muted-text)] bg-[color:var(--bg)] px-2.5 py-1 rounded-full">{business.sub_category}</span> : null}
                {business.ref_no ? (
                  <button type="button" onClick={copyRef} title="کپی شماره‌ی مرجع"
                    className="text-[11px] text-[color:var(--muted-text)] hover:text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition [font-family:var(--font-latin)] tabular-nums" dir="ltr">
                    <Hash size={11} /> {String(business.ref_no)} {refCopied ? <Check size={11} /> : null}
                  </button>
                ) : null}
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-[color:var(--text)] leading-tight">{business.name}</h1>
              {business.name_en ? <p className="text-sm md:text-base text-[color:var(--muted-text)] [font-family:var(--font-latin)] mt-0.5" dir="ltr" style={{ textAlign: "right" }}>{business.name_en}</p> : null}
              {business.tagline ? <p className="text-sm md:text-[15px] text-[color:var(--text)]/80 mt-2">{business.tagline}</p> : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs md:text-sm text-[color:var(--muted-text)]">
                {business.city ? (
                  <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-[color:var(--annabi)]" />{business.city}{provinceName ? `، ${provinceName}` : ""}</span>
                ) : null}
                {openNow?.known ? (
                  <span className={`inline-flex items-center gap-1.5 font-bold ${openNow.open ? "text-emerald-700" : "text-[color:var(--muted-text)]"}`}>
                    <span className={`w-2 h-2 rounded-full ${openNow.open ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {openNow.todayLabel}
                  </span>
                ) : null}
                {avgRating ? (
                  <span className="inline-flex items-center gap-1 font-bold text-[color:var(--text)]">
                    <Star size={14} className="fill-[color:var(--gold)] text-[color:var(--gold)]" />
                    {faNumber(Math.round(avgRating * 10) / 10 as unknown as number)}
                    <span className="text-[color:var(--muted-text)] font-normal">({faNumber(approvedReviews.length)} نظر)</span>
                  </span>
                ) : null}
                {business.established_year ? (
                  <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />از {faNumber(business.established_year)}</span>
                ) : null}
                <span className="mr-auto" />
                {isOwnerOrAdmin ? (
                  <Link href={`/dashboard/business/${business.id}/edit`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--text)] bg-[color:var(--bg)] hover:bg-[color:var(--line)] px-3 py-1.5 rounded-full transition"><Edit3 size={13} /> ویرایش پروفایل</Link>
                ) : verification.state === "unverified" ? (
                  <Link href={`/claim?businessId=${business.id}`} className="inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--annabi)] bg-[color:var(--annabi)]/6 hover:bg-[color:var(--annabi)]/10 px-3 py-1.5 rounded-full transition"><BadgeCheck size={13} /> صاحب این کسب‌وکار هستید؟</Link>
                ) : null}
              </div>
            </div>

          </div>

          {/* ─────────────────────── Primary actions ─────────────────────── */}
          {/* Styled by .bp-action in globals.css — see the note there on why
              these are classes and not Tailwind text-* utilities. */}
          <div
            className="bp-actions"
            style={{ ["--bp-cols" as string]: business.accepts_appointments && business.booking_url ? 5 : 4 }}
          >
            {business.phone ? (
              <a href={`tel:${business.phone}`} className="bp-action is-primary" onClick={() => trackEvent(business.id, "call")}>
                <span className="bp-action-icon"><Phone size={16} /></span> تماس
              </a>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="bp-action is-whatsapp" onClick={() => trackEvent(business.id, "whatsapp")}>
                <span className="bp-action-icon"><MessageCircle size={16} /></span> واتساپ
              </a>
            ) : null}
            {business.address || business.google_maps_url ? (
              <a href={directions} target="_blank" rel="noreferrer" className="bp-action is-directions" onClick={() => trackEvent(business.id, "directions")}>
                <span className="bp-action-icon"><Navigation size={16} /></span> مسیریابی
              </a>
            ) : null}
            {website ? (
              <a href={website} target="_blank" rel="noreferrer" className="bp-action is-website" onClick={() => trackEvent(business.id, "website")}>
                <span className="bp-action-icon"><Globe size={16} /></span> وب‌سایت
              </a>
            ) : null}
            {business.accepts_appointments && business.booking_url ? (
              <a href={business.booking_url} target="_blank" rel="noreferrer" className="bp-action is-book" onClick={() => trackEvent(business.id, "booking")}>
                <span className="bp-action-icon"><CalendarDays size={16} /></span> رزرو نوبت
              </a>
            ) : null}
          </div>
        </div>

        {/* Announcements — quota by plan (lib/billing/plans.ts
            ANNOUNCEMENT_LIMITS), fetched pre-filtered to non-expired ones.
            Absent entirely for the ~everyone who hasn't posted one; an
            empty "اعلان‌ها" section would be noise, not honesty. */}
        {announcements.length > 0 ? (
          <div className="mt-6 space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/8 p-4">
                <Megaphone size={16} className="mt-0.5 shrink-0 text-[color:var(--gold)]" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[color:var(--text)]">{a.title}</p>
                  {a.body ? <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--text)]/80">{a.body}</p> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Hiring ads. Absent when there are none — the count in the heading
            comes from the rows themselves, never from a stored number. */}
        {jobs.length > 0 ? (
          <div className="mt-6 rounded-3xl border border-[color:var(--line)] bg-white/70 p-4 backdrop-blur md:p-5">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)]">
              <Briefcase size={14} className="text-[color:var(--lajvard)]" />
              {jobs.length.toLocaleString("fa-IR")} فرصت شغلی
            </div>
            <ul className="space-y-2">
              {jobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.slug}`} className="block rounded-2xl border border-[color:var(--line)] p-3 transition hover:border-[color:var(--lajvard)]">
                    <span className="text-sm font-bold text-[color:var(--text)]">{j.title}</span>
                    <span className="mt-1 block text-xs text-[color:var(--muted-text)]">
                      {EMPLOYMENT_TYPE_LABELS_FA[j.employment_type]} · {WORKPLACE_TYPE_LABELS_FA[j.workplace_type]}
                      {j.city ? ` · ${j.city}` : ""} · {formatSalaryFa(j)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ───────────────────────── Personal (signed-in) ───────────────────────── */}
        <div className="mt-6">
          {user ? (
            <div className="bg-white/70 backdrop-blur rounded-3xl border border-[color:var(--line)] p-4 md:p-5">
              <div className="text-xs font-bold text-[color:var(--muted-text)] mb-3 flex items-center gap-1.5"><Bookmark size={14} className="text-[color:var(--annabi)]" /> برای خودتان</div>
              <InteractionBar businessId={business.id} initialInteraction={initialInteraction} />
              <PrivateNoteCard note={initialInteraction?.private_note} title={initialInteraction?.private_title} mediaUrls={initialInteraction?.private_media_urls} mediaTypes={initialInteraction?.private_media_types} />
            </div>
          ) : (
            <div className="rounded-2xl bg-[color:var(--lajvard)]/6 border border-[color:var(--lajvard)]/15 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[color:var(--text)]">
              <span>برای ذخیره، یادداشت خصوصی و ثبت نظر روی این کسب‌وکار وارد شوید.</span>
              <Button asChild size="sm" className="rounded-xl bg-[color:var(--lajvard)] text-white"><Link href={`/auth/login?next=/businesses/${business.slug || business.id}`}>ورود / ثبت‌نام</Link></Button>
            </div>
          )}
        </div>

        {/* ───────────────────────────── Body ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Section title="درباره" icon={<Sparkles size={16} />}>
              {business.short_description ? <p className="text-[15px] md:text-base font-bold text-[color:var(--text)] leading-relaxed mb-3">{business.short_description}</p> : null}
              {business.description ? (
                <p className="text-sm md:text-[15px] text-[color:var(--text)]/80 leading-[1.9] whitespace-pre-line">{business.description}</p>
              ) : !business.short_description ? (
                <p className="text-sm text-[color:var(--muted-text)]">توضیحی برای این کسب‌وکار ثبت نشده است.</p>
              ) : null}

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <Fact label="نوع خدمات" value={SERVICE_TYPE_FA[business.service_type] ?? null} />
                <Fact label="محدوده‌ی خدمات" value={SERVICE_AREA_FA[business.service_area] ?? null} />
                <Fact label="زبان‌ها" value={Array.isArray(business.languages) && business.languages.length ? business.languages.join("، ") : null} icon={<Languages size={13} />} />
                <Fact label="روش تماس ترجیحی" value={CONTACT_FA[business.preferred_contact] ?? null} />
              </div>
            </Section>

            {/* Gallery — plan-tiered (see lib/billing/plans.ts GALLERY_LIMITS);
                simply absent below its minimum photo, same as every other
                honest-empty-state section on this page. */}
            {business.gallery_urls?.length || business.gallery_video_url ? (
              <Section title="گالری" icon={<Building2 size={16} />} meta={business.gallery_urls?.length ? `${faNumber(business.gallery_urls.length)} عکس` : undefined}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {business.gallery_video_url ? (
                    <video src={business.gallery_video_url} controls className="col-span-2 aspect-video w-full rounded-xl bg-black object-cover sm:col-span-3" />
                  ) : null}
                  {(business.gallery_urls ?? []).map((url: string) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
                    </a>
                  ))}
                </div>
              </Section>
            ) : null}

            {/* Services */}
            {services.length ? (
              <Section title="خدمات و تعرفه‌ها" icon={<CheckCircle2 size={16} />} meta={`${faNumber(services.length)} مورد`}>
                <ul className="divide-y divide-[color:var(--line)]">
                  {services.map((s, i) => (
                    <li key={i} className="py-3.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-bold text-[color:var(--text)] text-sm md:text-[15px]">{s.name}</div>
                        {s.description ? <p className="text-xs md:text-sm text-[color:var(--muted-text)] mt-1 leading-relaxed">{s.description}</p> : null}
                        {s.price_note ? <p className="text-[11px] text-[color:var(--muted-text)] mt-1">{s.price_note}</p> : null}
                      </div>
                      <div className="shrink-0 text-left">
                        {s.price ? (
                          <div className="font-black text-[color:var(--annabi)] text-base leading-none">
                            {faNumber(Number(String(s.price).replace(/[^\d.]/g, "")) || 0) || s.price}
                            <span className="text-[11px] font-normal text-[color:var(--muted-text)] mr-1">{s.price_unit ? `/ ${s.price_unit}` : "دلار"}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[color:var(--muted-text)]">استعلام قیمت</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {/* Reviews */}
            <Section title="نظرات کاربران" icon={<Star size={16} />} meta={approvedReviews.length ? `${faNumber(approvedReviews.length)} نظر` : undefined}>
              {approvedReviews.length === 0 ? (
                <div className="rounded-2xl bg-[color:var(--bg)] p-6 text-center">
                  <Star className="h-8 w-8 text-[color:var(--gold)] mx-auto mb-2 opacity-70" />
                  <div className="font-bold text-sm text-[color:var(--text)]">هنوز نظری ثبت نشده</div>
                  <p className="text-xs text-[color:var(--muted-text)] mt-1">اولین نفری باشید که تجربه‌اش را می‌نویسد. نظرها پس از بررسی منتشر می‌شوند.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {approvedReviews.map((rev) => (
                    <li key={rev.id} className="rounded-2xl bg-[color:var(--bg)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[color:var(--annabi)]/10 text-[color:var(--annabi)] text-xs font-black flex items-center justify-center">{rev.user_name?.[0] || "ک"}</div>
                          <span className="font-bold text-xs text-[color:var(--text)]">{rev.user_name || "کاربر چارانا"}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= (rev.rating || 0) ? "fill-[color:var(--gold)] text-[color:var(--gold)]" : "text-[color:var(--line)]"} />)}
                        </div>
                      </div>
                      {rev.title ? <div className="font-bold text-sm text-[color:var(--text)] mb-1">{rev.title}</div> : null}
                      <p className="text-xs md:text-sm text-[color:var(--text)]/80 leading-relaxed">{rev.content}</p>

                      <OwnerReply review={rev} canReply={canReplyToReviews} />
                    </li>
                  ))}
                </ul>
              )}

              {ownerSeesUpsell ? (
                <p className="mt-4 text-xs text-[color:var(--muted-text)]">
                  پاسخ عمومی به نظرات از پلن {PLANS.pro.name} به بالا فعال می‌شود —{" "}
                  <Link href={`/dashboard/business/${business.id}/billing`} className="text-[color:var(--lajvard)] underline underline-offset-4">ارتقا بده</Link>.
                </p>
              ) : null}
            </Section>
          </div>

          {/* ───────────────────────────── Sidebar ───────────────────────────── */}
          <aside className="space-y-6">
            {/* Contact */}
            <Section title="اطلاعات تماس" icon={<Phone size={16} />} compact>
              <ul className="space-y-1">
                {business.phone ? <ContactRow icon={<Phone size={15} />} label="تلفن" value={business.phone} href={`tel:${business.phone}`} ltr /> : null}
                {business.whatsapp ? <ContactRow icon={<MessageCircle size={15} />} label="واتساپ" value={business.whatsapp} href={wa!} ltr /> : null}
                {business.contact_email ? <ContactRow icon={<Mail size={15} />} label="ایمیل" value={business.contact_email} href={`mailto:${business.contact_email}`} ltr /> : null}
                {website ? <ContactRow icon={<Globe size={15} />} label="وب‌سایت" value={website.replace(/^https?:\/\//, "").replace(/\/$/, "")} href={website} ltr external /> : null}
                {business.instagram ? <ContactRow icon={<AtSign size={15} />} label="اینستاگرام" value={"@" + String(business.instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")} href={business.instagram} ltr external /> : null}
                {business.telegram ? <ContactRow icon={<Send size={15} />} label="تلگرام" value={"@" + String(business.telegram).replace(/^https?:\/\/(t\.me|telegram\.me)\//, "").replace(/\/.*$/, "")} href={business.telegram} ltr external /> : null}
                {business.linkedin ? <ContactRow icon={<Briefcase size={15} />} label="لینکدین" value="پروفایل شرکت" href={business.linkedin} external /> : null}
              </ul>
              {!business.phone && !business.whatsapp && !business.contact_email && !website ? <p className="text-xs text-[color:var(--muted-text)]">راه تماسی ثبت نشده است.</p> : null}
            </Section>

            {/* Location */}
            {business.city || (business.is_address_public && business.address) ? (
              <Section title="موقعیت" icon={<MapPin size={16} />} compact>
                {business.is_address_public && business.address ? (
                  <p className="text-sm font-bold text-[color:var(--text)] leading-relaxed" dir="ltr" style={{ textAlign: "right" }}>{business.address}</p>
                ) : null}
                <p className="text-xs text-[color:var(--muted-text)] mt-1">
                  {business.city}{provinceName ? `، ${provinceName}` : ""}{business.is_address_public && business.postal_code ? <span dir="ltr" className="[font-family:var(--font-latin)]"> · {business.postal_code}</span> : null}
                </p>
                {/* Embedded map intentionally omitted until the Maps Embed API is
                    enabled on the key — a grey iframe reads as broken. Tracked in Notion. */}
                <a href={directions} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[color:var(--lajvard)]/8 text-[color:var(--lajvard)] text-xs font-bold hover:bg-[color:var(--lajvard)]/12 transition">
                  <ExternalLink size={14} /> باز کردن در نقشه
                </a>
                {branches.length ? (
                  <div className="mt-4 pt-3 border-t border-[color:var(--line)]">
                    <div className="text-xs font-bold text-[color:var(--muted-text)] mb-2">شعبه‌های دیگر</div>
                    <ul className="space-y-2">
                      {branches.map((b, i) => (
                        <li key={i} className="text-xs">
                          <div className="font-bold text-[color:var(--text)]">{b.name || `شعبه ${faNumber(i + 2)}`}</div>
                          <div className="text-[color:var(--muted-text)]" dir="ltr" style={{ textAlign: "right" }}>{[b.address, b.city].filter(Boolean).join(", ")}</div>
                          {b.phone ? <a href={`tel:${b.phone}`} className="text-[color:var(--lajvard)]" dir="ltr">{b.phone}</a> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            ) : null}

            {/* Hours */}
            {hasHours ? (
              <Section title="ساعات کاری" icon={<Clock size={16} />} compact>
                <ul className="text-xs md:text-[13px]">
                  {DAYS.map((d) => {
                    const h = hours[d.key];
                    const isToday = new Date().getDay() === d.jsIndex;
                    return (
                      <li key={d.key} className={`flex items-center justify-between py-1.5 ${isToday ? "font-black text-[color:var(--annabi)]" : "text-[color:var(--text)]"}`}>
                        <span>{d.label}{isToday ? <span className="text-[10px] font-bold mr-1.5 bg-[color:var(--annabi)]/10 px-1.5 py-0.5 rounded-full">امروز</span> : null}</span>
                        <span dir="ltr" className="[font-family:var(--font-latin)] tabular-nums">
                          {!h || h.closed || !h.open || !h.close ? <span className="text-[color:var(--muted-text)]">تعطیل</span> : `${faTime(h.open)} – ${faTime(h.close)}`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {business.accepts_appointments ? <p className="text-[11px] text-[color:var(--muted-text)] mt-2 flex items-center gap-1"><CalendarDays size={12} /> با هماهنگی قبلی هم پذیرش دارد.</p> : null}
              </Section>
            ) : business.accepts_appointments ? (
              <Section title="ساعات کاری" icon={<Clock size={16} />} compact>
                <p className="text-xs text-[color:var(--muted-text)]">با تعیین وقت قبلی.</p>
              </Section>
            ) : null}

            {/* Owner — only ever rendered when the server resolved a real,
                verified, non-hidden person (see the publicOwner prop). There
                is no "owner unknown" empty state on purpose: on 5,600
                imported listings that sentence would be the loudest thing on
                the page and would say nothing the «تایید نشده» box above
                doesn't already say. */}
            {publicOwner ? (
              <Section title={OWNER_SECTION_TITLE} icon={<UserRound size={16} />} compact>
                <div className="flex items-center gap-3">
                  {publicOwner.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicOwner.avatar_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--annabi)]/10 text-sm font-black text-[color:var(--annabi)]">
                      {publicOwner.full_name?.trim()[0] ?? "؟"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-[color:var(--text)]">
                      {publicOwner.full_name}
                    </div>
                    {publicOwner.member_since ? (
                      <div className="text-[11px] text-[color:var(--muted-text)]">
                        عضو چارانا از {faMonthYear(publicOwner.member_since)}
                      </div>
                    ) : null}
                  </div>
                </div>
                {verification.method ? (
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[color:var(--muted-text)]">
                    <BadgeCheck size={13} className="mt-px shrink-0 text-[color:var(--annabi)]" />
                    {OWNER_SECTION_NOTE[verification.method]}
                  </p>
                ) : null}
              </Section>
            ) : null}

            {/* Trust */}
            <Section title="اعتماد و شفافیت" icon={<ShieldCheck size={16} />} compact>
              <div className="text-xs space-y-3">
                <VerificationDetail status={verification} audience="public" />
                {verification.state === "unverified" ? (
                  <Link href={`/claim?businessId=${business.id}`} className="block rounded-xl bg-[color:var(--annabi)]/6 p-2.5 text-center font-bold text-[color:var(--annabi)] hover:bg-[color:var(--annabi)]/10 transition">
                    صاحب این کسب‌وکار هستید؟ مالکیتش را احراز کنید
                  </Link>
                ) : null}
                {business.is_iranian_owned ? (
                  <div className="flex items-center gap-2 text-[color:var(--text)]"><BrandMark size={14} color="#800000" simple /> کسب‌وکار ایرانی‌-کانادایی</div>
                ) : null}
                {business.ref_no ? (
                  <div className="pt-3 mt-1 border-t border-[color:var(--line)] flex items-center justify-between gap-2">
                    <span className="text-[color:var(--muted-text)]">شماره‌ی مرجع چارانا</span>
                    <button type="button" onClick={copyRef} className="font-black text-[color:var(--text)] tabular-nums [font-family:var(--font-latin)] tracking-wider inline-flex items-center gap-1.5 hover:text-[color:var(--annabi)] transition" dir="ltr" title="کپی">
                      #{String(business.ref_no)} {refCopied ? <Check size={13} /> : <Copy size={13} className="opacity-50" />}
                    </button>
                  </div>
                ) : null}
                {business.ref_no ? <p className="text-[11px] text-[color:var(--muted-text)]">در تماس با پشتیبانی یا احراز مالکیت، این شماره را بگویید.</p> : null}
                {/* A real report: posts to /api/reports and lands in the admin
                    queue. The old button raised a toast and wrote nothing. */}
                <div className="pt-3 mt-1 border-t border-[color:var(--line)]">
                  <ReportDialog businessId={business.id} businessName={business.name} />
                </div>
              </div>
            </Section>
          </aside>
        </div>

        {/* ───────────────────────────── Similar ───────────────────────────── */}
        {similarBusinesses?.length ? (
          <section className="mt-14">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-block w-3 h-3" aria-hidden><svg viewBox="0 0 18 18" className="w-full h-full"><path fill="#c9a24b" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg></span>
              <h2 className="text-lg md:text-xl font-black text-[color:var(--text)]">کسب‌وکارهای مشابه{business.city ? ` در ${business.city}` : ""}</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {similarBusinesses.map((sim) => (
                <Link key={sim.id} href={`/businesses/${sim.slug || sim.id}`} className="group bg-white rounded-2xl overflow-hidden border border-[color:var(--line)] hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] transition">
                  <div className="h-24 bg-[color:var(--bg)] relative overflow-hidden">
                    {sim.cover_url ? <img src={sim.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition" /> : <div className="w-full h-full bg-gradient-to-br from-[color:var(--annabi)]/10 to-[color:var(--lajvard)]/10 flex items-center justify-center"><Building2 size={22} className="text-[color:var(--annabi)]/50" /></div>}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-sm text-[color:var(--text)] truncate">{sim.name}</div>
                    <div className="text-[11px] text-[color:var(--muted-text)] mt-0.5 truncate">{sim.city || "کانادا"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────── bits ───────────────────────────────

function Section({ title, icon, meta, compact, children }: { title: string; icon?: React.ReactNode; meta?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-3xl border border-[color:var(--line)] ${compact ? "p-5" : "p-6 md:p-7"}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-black text-[color:var(--text)] flex items-center gap-2">
          <span className="text-[color:var(--gold)]"><svg viewBox="0 0 18 18" width="11" height="11"><path fill="currentColor" d="M0,18 V12 H6 V6 H12 V0 H18 V18 Z" /></svg></span>
          {title}
        </h2>
        {meta ? <span className="text-xs text-[color:var(--muted-text)]">{meta}</span> : icon ? <span className="text-[color:var(--muted-text)]">{icon}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl bg-[color:var(--bg)] px-3.5 py-3">
      <div className="text-[11px] text-[color:var(--muted-text)] flex items-center gap-1">{icon}{label}</div>
      <div className="text-sm font-bold text-[color:var(--text)] mt-0.5">{value}</div>
    </div>
  );
}

/**
 * The reply itself is always shown once it exists — it's public the moment
 * it's written, same as the review. `canReply` only controls whether *this*
 * viewer (the owner, on an entitled plan) gets the write UI; everyone else
 * only ever sees the read-only branch.
 */
function OwnerReply({ review, canReply }: { review: { id: string; owner_reply?: string | null; owner_reply_at?: string | null }; canReply: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.owner_reply || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const result = await replyToReview(review.id, text);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      toast.success("پاسخ ثبت شد");
    } else {
      toast.error(result.error || "خطا در ثبت پاسخ");
    }
  };

  const remove = async () => {
    setSaving(true);
    const result = await replyToReview(review.id, null);
    setSaving(false);
    if (result.success) { setText(""); setEditing(false); toast.success("پاسخ حذف شد"); }
    else toast.error(result.error || "خطا در حذف پاسخ");
  };

  if (editing) {
    return (
      <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پاسخ به عنوان صاحب کسب‌وکار…"
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-lg border border-[color:var(--line)] p-2 text-xs outline-none focus:border-[color:var(--lajvard)]"
        />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" onClick={save} disabled={saving || !text.trim()} className="h-8 rounded-lg px-3 text-xs">
            {saving ? "در حال ثبت…" : "ثبت پاسخ"}
          </Button>
          <button type="button" onClick={() => { setEditing(false); setText(review.owner_reply || ""); }} className="text-xs text-[color:var(--muted-text)]">
            انصراف
          </button>
        </div>
      </div>
    );
  }

  if (review.owner_reply) {
    return (
      <div className="mt-3 rounded-xl border-r-2 border-[color:var(--annabi)]/30 bg-white p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-black text-[color:var(--annabi)]">پاسخ صاحب کسب‌وکار</span>
          {canReply ? (
            <div className="flex items-center gap-2 text-[11px]">
              <button type="button" onClick={() => setEditing(true)} className="text-[color:var(--lajvard)]">ویرایش</button>
              <button type="button" onClick={remove} disabled={saving} className="text-red-600">حذف</button>
            </div>
          ) : null}
        </div>
        <p className="text-xs leading-relaxed text-[color:var(--text)]/80">{review.owner_reply}</p>
      </div>
    );
  }

  if (canReply) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="mt-3 text-xs font-bold text-[color:var(--lajvard)]">
        پاسخ به این نظر
      </button>
    );
  }

  return null;
}

function ContactRow({ icon, label, value, href, ltr, external }: { icon: React.ReactNode; label: string; value: string; href: string; ltr?: boolean; external?: boolean }) {
  return (
    <li>
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
        className="flex items-center gap-3 py-2 rounded-xl hover:bg-[color:var(--bg)] -mx-2 px-2 transition group">
        <span className="w-8 h-8 rounded-xl bg-[color:var(--bg)] text-[color:var(--annabi)] flex items-center justify-center shrink-0 group-hover:bg-white">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10.5px] text-[color:var(--muted-text)]">{label}</span>
          <span className={`block text-sm font-bold text-[color:var(--text)] truncate ${ltr ? "[font-family:var(--font-latin)]" : ""}`} dir={ltr ? "ltr" : undefined} style={ltr ? { textAlign: "right" } : undefined}>{value}</span>
        </span>
        {external ? <ExternalLink size={13} className="text-[color:var(--muted-text)] shrink-0" /> : null}
      </a>
    </li>
  );
}
