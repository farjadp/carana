// ============================================================================
// Source: app/dashboard/channels/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: What one person has submitted, in every state — pending, published,
//      rejected with its reason, and lapsed. A submitter who cannot see a
//      rejection cannot fix it.
//
//      It is also where a declared entry gets reconfirmed. Those rows expire
//      every 90 days by design (a WhatsApp invite link rots and nobody tells
//      us) and the only person who can say "it is still there" is whoever put
//      it there.
// Env / Identity: Signed-in user; reads only their own rows through the
//      "Submitters read their own channels" policy.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_PLATFORM_LABELS_FA,
  CHANNEL_STATUS_LABELS_FA,
  CHANNEL_UNMEASURED_FA,
  memberLineFa,
  needsReconfirm,
  relativeDayFa,
  type ChannelKind,
  type ChannelPlatform,
  type ChannelStatus,
} from "@goplaza/core";

import { PageShell } from "@/components/page-shell";
import { getOptionalUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ReconfirmButton } from "./reconfirm-button";

export const metadata: Metadata = { title: "کانال‌های من", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MyChannelsPage() {
  const user = await getOptionalUser();
  if (!user) redirect("/auth/login?next=/dashboard/channels");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("channels")
    .select(
      "id, slug, title, platform, kind, status, moderation_reason, metrics_source, member_count, metrics_checked_at, last_post_at, confirm_by, created_at",
    )
    .eq("submitted_by", user.id)
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <PageShell currentPath="/dashboard/channels" currentSection="business">
      <main className="page-main">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                <Link href="/channels">کانال‌ها و گروه‌ها</Link>
              </p>
              <h1 className="text-3xl font-black text-[color:var(--text)]">کانال‌های من</h1>
            </div>
            <Link
              href="/channels/submit"
              className="rounded-xl bg-[color:var(--lajvard)] px-5 py-2.5 text-sm font-bold text-white"
            >
              ثبت مورد تازه
            </Link>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-2xl border border-[color:var(--line)] bg-white p-8 text-center text-sm text-[color:var(--muted-text)]">
              هنوز چیزی ثبت نکرده‌ای.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((c) => {
                const lapsed = needsReconfirm(c);
                const members = memberLineFa(c);
                return (
                  <li key={c.id} className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-[color:var(--text)]">
                          {c.status === "published" && !lapsed ? (
                            <Link href={`/channels/${c.slug}`}>{c.title}</Link>
                          ) : (
                            c.title
                          )}
                        </h2>
                        <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                          {CHANNEL_KIND_LABELS_FA[c.kind as ChannelKind]}{" "}
                          {CHANNEL_PLATFORM_LABELS_FA[c.platform as ChannelPlatform]}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[color:var(--bg)] px-3 py-1 text-[11px] font-bold text-[color:var(--text)]">
                        {/* Lapsed is not a status in the table and is not
                            rendered as one here either — it is what the
                            expiry means today, computed today. */}
                        {lapsed ? "نیاز به تأیید دارد" : CHANNEL_STATUS_LABELS_FA[c.status as ChannelStatus]}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted-text)]">
                      <span>{members ?? CHANNEL_UNMEASURED_FA}</span>
                      {c.last_post_at ? <span>آخرین پست: {relativeDayFa(c.last_post_at)}</span> : null}
                    </div>

                    {c.moderation_reason ? (
                      <p className="mt-3 rounded-lg bg-[color:var(--bg)] p-3 text-xs leading-6 text-[color:var(--muted-text)]">
                        {c.moderation_reason}
                      </p>
                    ) : null}

                    {c.metrics_source === "declared" && c.status === "published" ? (
                      <div className="mt-3">
                        <ReconfirmButton channelId={c.id} lapsed={lapsed} confirmBy={c.confirm_by} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </PageShell>
  );
}
