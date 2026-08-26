// ============================================================================
// Source: app/channels/[slug]/page.tsx
// Version: 1.2.0 — 2026-08-26 (ownership can be proven, so it can be shown)
// Why: One channel entry. Design: docs/15-channels-directory.md.
//
//      THIS PAGE SHOWS NO CHANNEL CONTENT. No posts, no embed, no preview
//      text — there is not even a column to put it in. That is what keeps
//      somebody else's scam post off goplaza.ca, and it is why this section
//      can exist without a content-moderation layer we do not have.
//
//      What it does show is the facts a link on its own never carries: when
//      the channel last posted, how many members it has, WHEN WE CHECKED, and
//      — when there is no number — which of the two reasons applies. Every one
//      of those decisions is made by @goplaza/core, not here.
//
//      v1.1 adds the two things the first real submissions exposed. A channel
//      we can read but have not read yet said «بررسی خودکار ممکن نیست», which
//      is false; it is «هنوز بررسی نشده». And nothing on the page said who
//      stood behind the entry, so a reader could reasonably assume the channel
//      itself had listed it. Nobody can prove they administer a channel here
//      yet, and the page now says that out loud rather than staying silent.
//
//      v1.2: it can be proven now, by a GOPLAZA admin recording an
//      attestation. v1.1 refused to show ownership at all on the grounds that
//      only the phase-2 bot could establish it — and GOPLAZA's own channel,
//      submitted by a GOPLAZA admin who administers it, read «مالکیت تأیید
//      نشده». Refusing to record a fact we have is as wrong as printing one we
//      do not. The badge names the METHOD, never a bare "verified", and it
//      lapses in 182 days like a listing's.
// Env / Identity: Reads through the request-scoped (anon) client. The RLS
//      policy decides visibility; isChannelPublic() decides what renders.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, MessageCircle, Send, TrendingUp, UserRoundCheck, Users } from "lucide-react";

import {
  CHANNEL_ACTIVITY_HINTS_FA,
  CHANNEL_ACTIVITY_LABELS_FA,
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_LANGUAGE_LABELS_FA,
  CHANNEL_PLATFORM_LABELS_FA,
  CHANNEL_OWNERSHIP_HINT_FA,
  CHANNEL_OWNERSHIP_LABEL_FA,
  CHANNEL_OWNER_METHOD_FA,
  CHANNEL_PENDING_FA,
  CHANNEL_PENDING_HINT_FA,
  CHANNEL_SUBMITTER_FA,
  CHANNEL_UNMEASURED_FA,
  channelActivity,
  channelMetricsState,
  channelOwnership,
  memberLineFa,
  relativeDayFa,
  showsViewCount,
  unmeasurableReasonFa,
  type ChannelKind,
  type ChannelOwnerMethod,
  type ChannelLanguage,
  type ChannelPlatform,
} from "@goplaza/core";

import { ReportDialog } from "@/components/business/report-dialog";
import { JsonLd } from "@/components/json-ld";
import { PageShell } from "@/components/page-shell";
import { breadcrumbLd } from "@/lib/seo/local";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { JoinButton } from "./join-button";

export const revalidate = 3600;

const fa = (n: number) => n.toLocaleString("fa-IR");

const SELECT =
  "id, slug, title, description, platform, kind, language, city, province, category_slug, join_url, metrics_source, member_count, last_post_at, posts_last_30d, metrics_checked_at, confirm_by, status, created_at, owner_user_id, owner_verified_at, owner_verified_until, owner_verified_method";

async function loadChannel(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("channels").select(SELECT).eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const channel = await loadChannel(slug);
  if (!channel) return { title: "پیدا نشد" };
  const kind = CHANNEL_KIND_LABELS_FA[channel.kind as ChannelKind];
  const platform = CHANNEL_PLATFORM_LABELS_FA[channel.platform as ChannelPlatform];
  return {
    title: `${channel.title} — ${kind} ${platform}`,
    description: channel.description.slice(0, 160),
    alternates: { canonical: `/channels/${channel.slug}` },
  };
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = await loadChannel(slug);
  // The RLS policy already hides anything unpublished or lapsed, so this is
  // reached for a genuinely missing slug — but it is spelled out rather than
  // relying on the policy, because a 200 with an empty page is worse than a 404.
  if (!channel) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ data: category }, { data: snapshots }, { data: views }] = await Promise.all([
    supabase.from("channel_categories").select("slug, name_fa").eq("slug", channel.category_slug).maybeSingle(),
    supabase
      .from("channel_member_snapshots")
      .select("day, member_count")
      .eq("channel_id", channel.id)
      .order("day", { ascending: false })
      .limit(40),
    supabase.rpc("channel_view_count", { p_channel_id: channel.id }),
  ]);

  const platform = channel.platform as ChannelPlatform;
  const state = channelMetricsState(channel);
  const ownership = channelOwnership(channel);
  const activity = channelActivity(channel);
  const members = memberLineFa(channel);
  const lastPost = relativeDayFa(channel.last_post_at);
  const Icon = platform === "telegram" ? Send : MessageCircle;

  // Growth needs two real observations, a month apart, of the same channel.
  // With fewer than two snapshots there is no growth to report and the block
  // simply does not render — an interpolated trend would be a made-up number.
  const snaps = snapshots ?? [];
  const oldest = snaps.at(-1);
  const newest = snaps.at(0);
  const growth =
    newest && oldest && oldest.member_count > 0 && newest.day !== oldest.day
      ? {
          percent: Math.round(((newest.member_count - oldest.member_count) / oldest.member_count) * 100),
          days: Math.round(
            (new Date(newest.day).getTime() - new Date(oldest.day).getTime()) / 86_400_000,
          ),
        }
      : null;

  const viewCount = typeof views === "number" ? views : null;

  return (
    <PageShell currentPath="/channels" currentSection="home">
      <JsonLd
        data={breadcrumbLd([
          { name: "خانه", url: "/" },
          { name: "کانال‌ها و گروه‌ها", url: "/channels" },
          { name: channel.title, url: `/channels/${channel.slug}` },
        ])}
      />
      <main className="page-main">
        <article className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-[color:var(--line)] bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)]">
                  <Icon size={24} className="text-[color:var(--muted-text)]" />
                </span>
                <div className="min-w-0">
                  <p className="eyebrow">
                    {CHANNEL_KIND_LABELS_FA[channel.kind as ChannelKind]} {CHANNEL_PLATFORM_LABELS_FA[platform]}
                  </p>
                  <h1 className="text-2xl font-black leading-tight text-[color:var(--text)] md:text-3xl">
                    {channel.title}
                  </h1>
                </div>
              </div>
              <span
                className="shrink-0 rounded-full border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-1.5 text-xs font-bold text-[color:var(--text)]"
                title={state === "pending" ? CHANNEL_PENDING_HINT_FA : CHANNEL_ACTIVITY_HINTS_FA[activity]}
              >
                {state === "pending" ? CHANNEL_PENDING_FA : CHANNEL_ACTIVITY_LABELS_FA[activity]}
              </span>
            </div>

            <p className="mt-5 text-sm leading-8 text-[color:var(--text)]/85">{channel.description}</p>

            <div className="mt-6">
              <JoinButton
                channelId={channel.id}
                joinUrl={channel.join_url}
                label={`عضویت در ${CHANNEL_KIND_LABELS_FA[channel.kind as ChannelKind]}`}
              />
              <p className="mt-2 text-[11px] leading-6 text-[color:var(--muted-text)]">
                این لینک به بیرون از گوپلازا می‌رود. ما اداره‌کننده‌ی این {CHANNEL_KIND_LABELS_FA[channel.kind as ChannelKind]} نیستیم.
              </p>
            </div>
          </div>

          {/* The numbers. Each one says where it came from, or says that it
              could not come from anywhere. */}
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
              <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)]">
                <Users size={13} /> اعضا
              </p>
              {members ? (
                <p className="text-sm leading-7 text-[color:var(--text)]">{members}</p>
              ) : (
                <p className="text-sm italic leading-7 text-[color:var(--muted-text)]">
                  {state === "pending" ? "در نوبت اولین بررسی" : CHANNEL_UNMEASURED_FA}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
              <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)]">
                <CalendarClock size={13} /> آخرین فعالیت
              </p>
              <p className={`text-sm leading-7 ${lastPost ? "text-[color:var(--text)]" : "italic text-[color:var(--muted-text)]"}`}>
                {lastPost ?? (state === "pending" ? "در نوبت اولین بررسی" : CHANNEL_UNMEASURED_FA)}
              </p>
              {typeof channel.posts_last_30d === "number" ? (
                <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                  {fa(channel.posts_last_30d)} پست در ۳۰ روز گذشته
                </p>
              ) : null}
            </div>

            {growth ? (
              <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)]">
                  <TrendingUp size={13} /> رشد اعضا
                </p>
                <p className="text-sm leading-7 text-[color:var(--text)]">
                  {growth.percent >= 0 ? "+" : "−"}
                  {fa(Math.abs(growth.percent))}٪ در {fa(growth.days)} روز گذشته
                </p>
              </div>
            ) : null}

            {/* Only past the floor. Below it the number is too small to mean
                anything, and printing it makes the section read dead. */}
            {showsViewCount(viewCount) ? (
              <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                <p className="mb-1 text-xs font-bold text-[color:var(--muted-text)]">بازدید در گوپلازا</p>
                <p className="text-sm leading-7 text-[color:var(--text)]">{fa(viewCount as number)} بار</p>
              </div>
            ) : null}
          </section>

          {/* Said once, plainly. Without it the two empty cards above look like
              a bug in our page rather than a limit of the platform — or, in the
              pending case, like a channel nobody can read. */}
          {state !== "measured" ? (
            <p className="mt-4 rounded-2xl border border-dashed border-[color:var(--line)] bg-[color:var(--bg)] p-5 text-xs leading-7 text-[color:var(--muted-text)]">
              {state === "pending" ? CHANNEL_PENDING_HINT_FA : unmeasurableReasonFa(platform)}
            </p>
          ) : null}

          {/* Who stands behind this entry. Staying silent about it is what lets
              a reader assume the channel itself listed here — so it is said
              either way, and the verified case names the method rather than
              showing a bare "تأیید شده". */}
          <section
            className={`mt-4 rounded-2xl border p-5 ${
              ownership === "verified"
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-[color:var(--line)] bg-white"
            }`}
          >
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold text-[color:var(--muted-text)]">
              {ownership === "verified" ? <BadgeCheck size={13} /> : <UserRoundCheck size={13} />} اداره‌کننده
            </p>
            <p
              className={`text-sm font-bold ${
                ownership === "verified" ? "text-emerald-700" : "text-[color:var(--text)]"
              }`}
            >
              {CHANNEL_OWNERSHIP_LABEL_FA[ownership]}
            </p>
            <p className="mt-1 text-xs leading-7 text-[color:var(--muted-text)]">
              {ownership === "verified"
                ? CHANNEL_OWNER_METHOD_FA[channel.owner_verified_method as ChannelOwnerMethod]
                : CHANNEL_OWNERSHIP_HINT_FA}
            </p>
            <p className="mt-2 text-xs text-[color:var(--muted-text)]">
              {ownership === "verified" && channel.owner_verified_at ? (
                <>تأیید شده {relativeDayFa(channel.owner_verified_at)}</>
              ) : (
                <>
                  {CHANNEL_SUBMITTER_FA}
                  {channel.created_at ? ` · ${relativeDayFa(channel.created_at)}` : null}
                </>
              )}
            </p>
          </section>

          <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-5 text-xs text-[color:var(--muted-text)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {category ? (
                <Link href={`/channels/category/${category.slug}`} className="font-bold text-[color:var(--lajvard)]">
                  {category.name_fa}
                </Link>
              ) : null}
              {channel.city ? (
                <Link href={`/channels?city=${encodeURIComponent(channel.city)}`}>{channel.city}</Link>
              ) : null}
              <span>زبان: {CHANNEL_LANGUAGE_LABELS_FA[channel.language as ChannelLanguage]}</span>
            </div>
            <ReportDialog subject={{ kind: "channel", id: channel.id, name: channel.title }} />
          </section>

          <p className="mt-6 text-center text-xs text-[color:var(--muted-text)]">
            <Link href="/channels" className="font-bold text-[color:var(--lajvard)]">
              بازگشت به همه کانال‌ها و گروه‌ها
            </Link>
          </p>
        </article>
      </main>
    </PageShell>
  );
}
