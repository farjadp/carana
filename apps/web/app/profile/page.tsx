// ============================================================================
// Source: app/profile/page.tsx
// Version: 2.0.0 — 2026-08-26
// Why: The signed-in home. v1 called itself «داشبورد کاربری» and was a
//      settings form with four identical cards stacked under it — two of
//      which restated things the page already showed (the email in a card of
//      its own, and «کاربر عادی», which is what everybody is).
//
//      v2 is one column and four zones: who you are, what you have done,
//      what you can change, and where to go. Denser and shorter at the same
//      time, because the density comes from real numbers rather than from
//      more boxes.
//
//      THE NUMBERS ARE COUNTED, NOT DECORATED. Saves, private notes, followed
//      businesses and reviews are five head-counts against this user's own
//      rows. Zero is shown here on purpose — «۰ ذخیره‌شده» is true, it is
//      about your own account, and it is the state that most needs a link out
//      of it. That is the opposite of a public «۰ نظر», which advertises a
//      business's emptiness to a stranger.
//
//      Two things v1 shipped are gone rather than restyled: `profileStatusCopy`
//      was computed and never rendered, and the progress bar promised that
//      completing your profile lets «کسب‌وکارها ارتباط مؤثرتری بگیرند» —
//      businesses cannot contact users at all. That is a claim nothing backs.
// Env / Identity: Requires an authenticated session; every count is scoped to
//      the signed-in user by RLS as well as by the filter.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Bookmark,
  MessageSquare,
  NotebookPen,
  Radio,
  ShieldAlert,
  Store,
  User as UserIcon,
} from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth/session";
import { ensureUserProfile } from "@/lib/profiles/ensure-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AccountActions } from "./account-actions";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "پروفایل من",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const fa = (n: number) => n.toLocaleString("fa-IR");
const faDate = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "long" });

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const { profile } = await ensureUserProfile(user);
  const supabase = await createSupabaseServerClient();

  const n = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const interactions = () =>
    supabase.from("user_business_interactions").select("business_id", { count: "exact", head: true }).eq("user_id", user.id);

  const [saved, notes, following, reviews, businesses, channels] = await Promise.all([
    n(interactions()),
    n(interactions().not("private_note", "is", null)),
    n(interactions().eq("notify_announcements", true)),
    n(
      supabase
        .from("public_reviews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "deleted_by_user"),
    ),
    n(
      supabase
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .or(`created_by.eq.${user.id},owner_user_id.eq.${user.id}`),
    ),
    n(supabase.from("channels").select("id", { count: "exact", head: true }).eq("submitted_by", user.id)),
  ]);

  const isStaff = profile?.role === "admin" || profile?.role === "moderator";
  const displayName = profile?.full_name?.trim() || user.email?.split("@")[0] || "کاربر گوپلازا";

  const stats = [
    { icon: Bookmark, label: "ذخیره‌شده", value: saved, href: "/profile/interactions" },
    { icon: NotebookPen, label: "یادداشت خصوصی", value: notes, href: "/profile/interactions" },
    { icon: Bell, label: "دنبال‌شده", value: following, href: "/profile/interactions" },
    { icon: MessageSquare, label: "نظر ثبت‌شده", value: reviews, href: "/profile/interactions" },
  ];

  const destinations = [
    {
      icon: NotebookPen,
      title: "دفترچه‌ی من",
      hint: "ذخیره‌شده‌ها، یادداشت‌ها و نظرها",
      href: "/profile/interactions",
      badge: saved + reviews > 0 ? fa(saved + reviews) : null,
    },
    {
      icon: Store,
      title: businesses > 0 ? "کسب‌وکار من" : "ثبت کسب‌وکار",
      hint: businesses > 0 ? "ویرایش، اعلان، آگهی و آمار" : "رایگان — از روی وب‌سایتت پر می‌شود",
      href: businesses > 0 ? "/dashboard/business" : "/dashboard/business/new",
      badge: businesses > 0 ? fa(businesses) : null,
    },
    {
      icon: Radio,
      title: channels > 0 ? "کانال‌های من" : "ثبت کانال یا گروه",
      hint: channels > 0 ? "وضعیت بررسی و تأیید دوباره" : "کانال تلگرام یا گروه واتس‌اپ",
      href: channels > 0 ? "/dashboard/channels" : "/channels/submit",
      badge: channels > 0 ? fa(channels) : null,
    },
    ...(isStaff
      ? [
          {
            icon: ShieldAlert,
            title: "پنل مدیریت",
            hint: "صف‌های بررسی و مدیریت پلتفرم",
            href: "/admin",
            badge: null as string | null,
          },
        ]
      : []),
  ];

  return (
    <PageShell currentPath="/profile" currentSection="business">
      <main className="page-main" dir="rtl">
        <div className="mx-auto max-w-3xl">
          {/* 1. Who you are. One row, not two cards — the email was its own
              card in v1, and «نقش دسترسی: کاربر عادی» was a second one saying
              what every account is. The role appears only when it means
              something. */}
          <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-[color:var(--line)] bg-white p-6">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)]">
              {profile?.avatar_url ? (
                // Plain <img>: avatar hosts are not all in next.config
                // remotePatterns, and next/image throws at request time there.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon size={30} className="text-[color:var(--muted-text)]" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight text-[color:var(--text)]">{displayName}</h1>
              {user.email ? (
                <p dir="ltr" className="mt-1 text-sm text-[color:var(--muted-text)]">
                  {user.email}
                </p>
              ) : null}

              <ul className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {/* Each chip is a fact with a column behind it. The unverified
                    states are shown too — an account that quietly believes it
                    is verified is how a password reset gets lost. */}
                <li
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    user.email_confirmed_at
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <BadgeCheck size={12} />
                  {user.email_confirmed_at ? "ایمیل تأیید شده" : "ایمیل تأیید نشده"}
                </li>
                <li
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    profile?.phone_verified_at
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[color:var(--bg)] text-[color:var(--muted-text)]"
                  }`}
                >
                  {profile?.phone_verified_at ? "موبایل تأیید شده" : "موبایل تأیید نشده"}
                </li>
                {profile?.created_at ? (
                  <li className="inline-flex items-center rounded-full bg-[color:var(--bg)] px-2.5 py-1 text-[color:var(--muted-text)]">
                    عضو از {faDate(profile.created_at)}
                  </li>
                ) : null}
                {isStaff ? (
                  <li className="inline-flex items-center rounded-full bg-[color:var(--text)] px-2.5 py-1 font-bold text-[#f6f1e8]">
                    {profile?.role === "admin" ? "مدیر" : "ناظر"}
                  </li>
                ) : null}
              </ul>
            </div>
          </section>

          {/* 2. What you have done. Five counted queries; every tile links to
              where that number lives, so a zero is a way in rather than a
              dead end. */}
          <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map(({ icon: Icon, label, value, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-2xl border border-[color:var(--line)] bg-white p-4 transition hover:border-[color:var(--lajvard)]"
              >
                <span className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--muted-text)]">
                  <Icon size={12} /> {label}
                </span>
                <p className="text-2xl font-black leading-none text-[color:var(--text)]">{fa(value)}</p>
              </Link>
            ))}
          </section>

          {/* 3. Where to go. Slim rows, not four cards each carrying a
              full-width button — the same shape as the /support tiles. */}
          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            {destinations.map(({ icon: Icon, title, hint, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4 transition hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)]">
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[color:var(--text)]">{title}</span>
                  <span className="block truncate text-xs text-[color:var(--muted-text)]">{hint}</span>
                </span>
                {badge ? (
                  <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--text)]">
                    {badge}
                  </span>
                ) : null}
                <ArrowLeft
                  size={14}
                  className="shrink-0 text-[color:var(--muted-text)] transition group-hover:-translate-x-0.5"
                />
              </Link>
            ))}
          </section>

          {/* 4. What you can change. */}
          <section className="mt-8">
            <ProfileForm profile={profile} email={user.email || ""} />
          </section>

          {/* 5. The account itself, kept quiet at the bottom where it belongs. */}
          <AccountActions />
        </div>
      </main>
    </PageShell>
  );
}
