// ============================================================================
// Source: app/admin/(dashboard)/channels/channels-client.tsx
// Version: 1.1.0 — 2026-08-26 (ownership attestation)
// Why: The two decisions a moderator can make on a queued entry, and enough of
//      it on screen to make them — including the join link itself, opened in a
//      new tab, because the only real check is looking.
//
//      A rejection requires a reason. moderateChannel() refuses without one:
//      "rejected, no reason given" is not reviewable by the next moderator and
//      not explainable to whoever submitted it.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ExternalLink, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  CHANNEL_KIND_LABELS_FA,
  CHANNEL_PLATFORM_LABELS_FA,
  CHANNEL_STATUS_LABELS_FA,
  CHANNEL_OWNERSHIP_LABEL_FA,
  CHANNEL_UNMEASURED_FA,
  channelOwnership,
  memberLineFa,
  relativeDayFa,
  type ChannelKind,
  type ChannelPlatform,
  type ChannelStatus,
} from "@goplaza/core";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { moderateChannel, verifyChannelOwner } from "@/lib/actions/channels";

export type AdminChannelRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  platform: ChannelPlatform;
  kind: ChannelKind;
  language: string;
  city: string | null;
  province: string | null;
  category_slug: string;
  join_url: string;
  tg_username: string | null;
  metrics_source: string;
  member_count: number | null;
  last_post_at: string | null;
  metrics_checked_at: string | null;
  check_failures: number;
  status: ChannelStatus;
  moderation_reason: string | null;
  confirm_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  tg_title: string | null;
  submitted_by: string | null;
  owner_user_id: string | null;
  owner_verified_at: string | null;
  owner_verified_until: string | null;
  owner_verified_method: string | null;
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "medium" });

export default function AdminChannelsClient({
  pending,
  recent,
}: {
  pending: AdminChannelRow[];
  recent: AdminChannelRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "recent">("pending");
  const [rejecting, setRejecting] = useState<AdminChannelRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();

  const decide = (id: string, decision: "published" | "rejected", note?: string) => {
    startTransition(async () => {
      const res = await moderateChannel(id, decision, note);
      if (res.success) {
        toast.success(decision === "published" ? "منتشر شد" : "رد شد");
        setRejecting(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(res.error ?? "ثبت تصمیم ناموفق بود");
      }
    });
  };

  const setOwner = (id: string, decision: "verify" | "revoke") => {
    startTransition(async () => {
      const res = await verifyChannelOwner(id, decision);
      if (res.success) {
        toast.success(decision === "verify" ? "مالکیت تأیید شد" : "تأیید مالکیت لغو شد");
        router.refresh();
      } else {
        toast.error(res.error ?? "ثبت ناموفق بود");
      }
    });
  };

  const rows = tab === "pending" ? pending : recent;

  return (
    <>
      <div className="mb-4 flex gap-2">
        {(["pending", "recent"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {t === "pending" ? `در صف (${pending.length.toLocaleString("fa-IR")})` : "بررسی‌شده‌ها"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {tab === "pending" ? "صف خالی است." : "هنوز چیزی بررسی نشده."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const members = memberLineFa(c);
            return (
              <li key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900">{c.title}</h2>
                    <p className="mt-1 text-sm leading-7 text-gray-600">{c.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700">
                    {CHANNEL_STATUS_LABELS_FA[c.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    {CHANNEL_KIND_LABELS_FA[c.kind]} {CHANNEL_PLATFORM_LABELS_FA[c.platform]}
                  </span>
                  <span>{c.category_slug}</span>
                  {c.city ? <span>{c.city}</span> : null}
                  {/* Which side of the axis this row is on, said in the queue,
                      because it changes what the moderator is approving: a
                      measured row will be re-checked daily, a declared one
                      will never be checked again by anything but a person. */}
                  <span className={c.metrics_source === "measured" ? "text-emerald-700" : "text-amber-700"}>
                    {c.metrics_source === "measured" ? "خودکار بررسی می‌شود" : "بررسی خودکار ندارد"}
                  </span>
                  <span>{members ?? CHANNEL_UNMEASURED_FA}</span>
                  {c.last_post_at ? <span>آخرین پست: {relativeDayFa(c.last_post_at)}</span> : null}
                  {c.check_failures > 0 ? (
                    <span className="text-amber-700">{c.check_failures.toLocaleString("fa-IR")} بررسی ناموفق</span>
                  ) : null}
                  <span>ثبت: {date(c.created_at)}</span>
                  {/* Which claim this row carries about who runs it. The
                      moderator is the person who can settle it, so it belongs
                      in the queue rather than only on the public page. */}
                  <span className={channelOwnership(c) === "verified" ? "text-emerald-700" : ""}>
                    {CHANNEL_OWNERSHIP_LABEL_FA[channelOwnership(c)]}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href={c.join_url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    dir="ltr"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <ExternalLink size={13} /> {c.join_url}
                  </a>
                  {c.status === "published" ? (
                    <Link href={`/channels/${c.slug}`} className="text-xs font-bold text-blue-700">
                      صفحه عمومی
                    </Link>
                  ) : null}
                </div>

                {c.moderation_reason ? (
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{c.moderation_reason}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {c.status === "pending_moderation" ? (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => decide(c.id, "published")}>
                        <CheckCircle size={15} /> انتشار
                      </Button>
                      <Button size="sm" variant="muted" disabled={busy} onClick={() => setRejecting(c)}>
                        <XCircle size={15} /> رد
                      </Button>
                    </>
                  ) : null}

                  {/* An attestation, not a guess: it says a named admin
                      confirmed it, at a recorded time, by a recorded method,
                      and it lapses in 182 days like a listing's badge. Only
                      press it for a channel you actually know is run by
                      whoever submitted it. */}
                  {channelOwnership(c) === "verified" ? (
                    <Button size="sm" variant="muted" disabled={busy} onClick={() => setOwner(c.id, "revoke")}>
                      <ShieldOff size={15} /> لغو تأیید مالکیت
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="muted"
                      disabled={busy || !c.submitted_by}
                      title={c.submitted_by ? undefined : "این کانال ثبت‌کننده‌ای ندارد"}
                      onClick={() => setOwner(c.id, "verify")}
                    >
                      <ShieldCheck size={15} /> تأیید مالکیتِ ثبت‌کننده
                    </Button>
                  )}
                </div>

                {rejecting?.id === c.id ? (
                  <div className="mt-3 rounded-xl border border-gray-200 p-3">
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      placeholder="چرا رد می‌شود؟ ثبت‌کننده همین را می‌بیند."
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy || reason.trim().length < 3}
                        onClick={() => decide(c.id, "rejected", reason)}
                      >
                        ثبت رد
                      </Button>
                      <Button size="sm" variant="muted" onClick={() => setRejecting(null)}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
