// ============================================================================
// Source: app/admin/(dashboard)/jobs/jobs-client.tsx
// Version: 1.1.0 — 2026-08-18 (renders the Markdown body)
// Why: The two decisions a moderator can make on a queued ad, and enough of
//      the ad on screen to make them. A rejection requires a reason — the
//      poster has to know what to fix, and moderateJob() refuses without one.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, ExternalLink, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  EMPLOYMENT_TYPE_LABELS_FA,
  JOB_STATUS_LABELS_FA,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  isJobLive,
  languageRequirementFa,
  type EmploymentType,
  type JobStatus,
  type WorkplaceType,
} from "@charana/core";

import { Button } from "@/components/ui/button";
import { JobMarkdown } from "@/components/ui/markdown-editor";
import { Textarea } from "@/components/ui/textarea";
import { moderateJob } from "@/lib/actions/jobs";

export type AdminJobRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: "hour" | "month" | "year" | null;
  salary_is_public: boolean;
  requires_persian: boolean;
  requires_english: boolean;
  apply_method: "email" | "phone" | "url";
  apply_value: string;
  status: JobStatus;
  moderation_reason: string | null;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  business: { id: string; name: string; slug: string | null } | null;
};

const date = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "medium" });

export default function AdminJobsClient({
  pendingJobs,
  recentJobs,
}: {
  pendingJobs: AdminJobRow[];
  recentJobs: AdminJobRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "recent">("pending");
  const [rejecting, setRejecting] = useState<AdminJobRow | null>(null);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const decide = (id: string, decision: "published" | "rejected", why?: string) => {
    startTransition(async () => {
      const result = await moderateJob(id, decision, why);
      if (result.success) {
        toast.success(result.message ?? "انجام شد");
        setRejecting(null);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.error || "خطایی رخ داد.");
      }
    });
  };

  const rows = tab === "pending" ? pendingJobs : recentJobs;

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pending")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "pending" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          در انتظار بررسی ({pendingJobs.length.toLocaleString("fa-IR")})
        </button>
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === "recent" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          بررسی‌شده‌ها
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500">
          {tab === "pending" ? "صف بررسی خالی است." : "هنوز آگهی بررسی‌شده‌ای نیست."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((j) => {
            const live = isJobLive(j);
            const language = languageRequirementFa(j);
            return (
              <li key={j.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900">{j.title}</h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {j.business?.name ?? "—"}
                      {j.business?.slug ? (
                        <Link href={`/businesses/${j.business.slug}`} target="_blank" className="mr-2 inline-flex items-center gap-1 text-xs text-blue-600">
                          دیدن کسب‌وکار <ExternalLink size={11} />
                        </Link>
                      ) : null}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-700">
                    {JOB_STATUS_LABELS_FA[j.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>{EMPLOYMENT_TYPE_LABELS_FA[j.employment_type]}</span>
                  <span>{WORKPLACE_TYPE_LABELS_FA[j.workplace_type]}</span>
                  {j.city ? <span>{j.city}</span> : null}
                  <span>{formatSalaryFa(j)}</span>
                  {language ? <span>زبان: {language}</span> : null}
                  <span dir="ltr">{j.apply_method}: {j.apply_value}</span>
                  <span>ثبت {date(j.created_at)}</span>
                  <span>انقضا {date(j.expires_at)}</span>
                </div>

                {/* Rendered, not raw: a moderator has to judge what the
                    public will actually see, not the source of it. */}
                <div className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                  <JobMarkdown>{j.description}</JobMarkdown>
                </div>

                {j.moderation_reason ? (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">دلیل: {j.moderation_reason}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {j.status === "pending_moderation" ? (
                    <>
                      <Button type="button" size="sm" disabled={pending} onClick={() => decide(j.id, "published")} className="gap-1.5">
                        <CheckCircle size={14} /> انتشار
                      </Button>
                      <Button type="button" size="sm" variant="muted" disabled={pending} onClick={() => { setRejecting(j); setReason(""); }} className="gap-1.5">
                        <XCircle size={14} /> رد
                      </Button>
                    </>
                  ) : live ? (
                    <Link href={`/jobs/${j.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600">
                      دیدن آگهی منتشرشده <ExternalLink size={12} />
                    </Link>
                  ) : null}
                </div>

                {rejecting?.id === j.id ? (
                  <div className="mt-4 rounded-xl border border-gray-200 p-3">
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      placeholder="چرا رد می‌شود؟ همین متن برای آگهی‌دهنده نمایش داده می‌شود."
                    />
                    <div className="mt-2 flex gap-2">
                      <Button type="button" size="sm" disabled={pending || !reason.trim()} onClick={() => decide(j.id, "rejected", reason)}>
                        ثبت رد
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(null)}>
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
    </div>
  );
}
