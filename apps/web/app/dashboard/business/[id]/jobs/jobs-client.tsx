// ============================================================================
// Source: app/dashboard/business/[id]/jobs/jobs-client.tsx
// Version: 1.1.0 — 2026-08-18 (Markdown editor + AI drafting)
// Why: The posting form and the owner's list. Every rule shown here is
//      enforced again in lib/actions/jobs.ts — this side only exists so
//      hitting one is not a surprise.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ExternalLink, RotateCw, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS_FA,
  JOB_AI_NOTES_MAX,
  JOB_DEFAULT_DAYS,
  JOB_DESCRIPTION_MAX,
  JOB_DESCRIPTION_MIN,
  JOB_STATUS_LABELS_FA,
  JOB_TITLE_MAX,
  SALARY_PERIODS,
  SALARY_PERIOD_LABELS_FA,
  WORKPLACE_TYPES,
  WORKPLACE_TYPE_LABELS_FA,
  formatSalaryFa,
  isJobLive,
  jobDescriptionLength,
  jobDaysRemaining,
  type EmploymentType,
  type JobStatus,
  type SalaryPeriod,
  type WorkplaceType,
} from "@charana/core";

import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { closeJob, createJob, extendJob } from "@/lib/actions/jobs";

export type JobRow = {
  id: string;
  slug: string;
  title: string;
  employment_type: EmploymentType;
  workplace_type: WorkplaceType;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod | null;
  salary_is_public: boolean;
  requires_persian: boolean;
  requires_english: boolean;
  apply_method: "email" | "phone" | "url";
  apply_value: string;
  status: JobStatus;
  moderation_reason: string | null;
  expires_at: string;
  closed_at: string | null;
  published_at: string | null;
  created_at: string;
};

const fa = (n: number) => n.toLocaleString("fa-IR");
const date = (iso: string) => new Date(iso).toLocaleDateString("fa-IR", { dateStyle: "medium" });

const field = "h-11 w-full rounded-xl border border-[color:var(--line)] px-3 text-sm outline-none focus:border-[color:var(--lajvard)]";

export function JobsClient({
  businessId,
  businessCity,
  defaultEmail,
  defaultPhone,
  canPost,
  rateLimited,
  jobs,
}: {
  businessId: string;
  businessCity: string | null;
  defaultEmail: string | null;
  defaultPhone: string | null;
  canPost: boolean;
  rateLimited: boolean;
  jobs: JobRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState<string>("full_time");
  const [workplaceType, setWorkplaceType] = useState<string>("on_site");
  const [city, setCity] = useState(businessCity ?? "");
  // Salary is optional for now, so the honest default is «توافقی» rather than
  // an empty number field that renders as nothing on the public page.
  const [salaryIsPublic, setSalaryIsPublic] = useState(false);
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState<string>("hour");
  const [requiresPersian, setRequiresPersian] = useState(true);
  const [requiresEnglish, setRequiresEnglish] = useState(false);
  const [applyMethod, setApplyMethod] = useState<"email" | "phone" | "url">(defaultEmail ? "email" : "phone");
  const [applyValue, setApplyValue] = useState(defaultEmail ?? defaultPhone ?? "");
  const [days, setDays] = useState<string>(String(JOB_DEFAULT_DAYS));
  const [aiNotes, setAiNotes] = useState("");
  const [showAiNotes, setShowAiNotes] = useState(false);
  const [drafting, setDrafting] = useState(false);

  // Length is judged on the words, not on the Markdown that formats them:
  // «**وظایف**» is six characters of content, not ten. The server counts the
  // same way, so the button and the action agree.
  const descriptionLength = jobDescriptionLength(description);

  /**
   * Ask the endpoint for a draft and stream it into the editor.
   *
   * First press opens the notes box instead of calling — a draft written from
   * a title alone is generic enough to be worse than nothing, and the call
   * costs money either way.
   */
  const draft = async () => {
    if (!showAiNotes) { setShowAiNotes(true); return; }
    setDrafting(true);
    try {
      const response = await fetch("/api/ai/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId, title, notes: aiNotes,
          employmentType, workplaceType,
          salaryIsPublic, salaryMin, salaryMax, salaryPeriod,
          requiresPersian, requiresEnglish,
        }),
      });

      if (!response.ok || !response.body) {
        const problem = await response.json().catch(() => null);
        toast.error(problem?.error || "تولید متن ناموفق بود.");
        return;
      }

      // Replaces the field, so a draft never silently overwrites work in
      // progress without warning.
      if (description.trim() && !window.confirm("متن فعلی با پیش‌نویس تازه جایگزین شود؟")) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      setDescription("");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setDescription(text);
      }
      toast.success("پیش‌نویس آماده است — بخوان و اصلاحش کن.");
    } catch {
      toast.error("تولید متن ناموفق بود.");
    } finally {
      setDrafting(false);
    }
  };

  const submit = () => {
    startTransition(async () => {
      const result = await createJob(businessId, {
        title, description, employmentType, workplaceType,
        city, salaryIsPublic, salaryMin, salaryMax, salaryPeriod,
        requiresPersian, requiresEnglish, applyMethod, applyValue,
        days: Number(days),
      });
      if (result.success) {
        toast.success(result.message ?? "ثبت شد");
        setTitle(""); setDescription("");
        router.refresh();
      } else {
        toast.error(result.error || "خطا در ثبت آگهی");
      }
    });
  };

  const close = (id: string) => {
    startTransition(async () => {
      const result = await closeJob(id, businessId);
      if (result.success) { toast.success(result.message ?? "بسته شد"); router.refresh(); }
      else toast.error(result.error || "خطا");
    });
  };

  const extend = (id: string) => {
    startTransition(async () => {
      const result = await extendJob(id, businessId, JOB_DEFAULT_DAYS);
      if (result.success) { toast.success(result.message ?? "تمدید شد"); router.refresh(); }
      else toast.error(result.error || "خطا");
    });
  };

  return (
    <div className="mt-6 space-y-6">
      {rateLimited ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)] p-5 text-sm text-[color:var(--text)]">
          امروز به سقف ثبت آگهی رسیدی. این یک محدودیت پلن نیست و با ارتقا برداشته نمی‌شود — فردا دوباره می‌توانی ثبت کنی.
        </div>
      ) : canPost ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-5">
          <h2 className="mb-4 font-bold text-[color:var(--text)]">آگهی تازه</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">عنوان شغل</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={JOB_TITLE_MAX}
                placeholder="مثلاً «آشپز ایرانی — تمام‌وقت»" className={field} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">شرح شغل</label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                rows={10}
                maxLength={JOB_DESCRIPTION_MAX}
                placeholder="وظایف، شرایط، ساعات کاری و هر چیزی که متقاضی باید پیش از تماس بداند."
                toolbarExtra={
                  <button
                    type="button"
                    onClick={draft}
                    disabled={drafting || !title.trim()}
                    title={title.trim() ? "نوشتن پیش‌نویس با هوش مصنوعی" : "اول عنوان شغل را بنویس"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--lajvard)]/30 bg-[color:var(--lajvard)]/8 px-2.5 py-1.5 text-[11px] font-bold text-[color:var(--lajvard)] transition hover:bg-[color:var(--lajvard)]/15 disabled:opacity-40"
                  >
                    <Sparkles size={13} />
                    {drafting ? "در حال نوشتن…" : "کمک هوش مصنوعی"}
                  </button>
                }
                hint={
                  <>
                    دست‌کم {fa(JOB_DESCRIPTION_MIN)} کاراکتر — تا اینجا {fa(descriptionLength)}. لینک، ایمیل و
                    شماره تماس در متن حذف می‌شوند؛ روش درخواست را پایین‌تر وارد کن.
                  </>
                }
              />

              {/* The AI writes from the fields above plus this note, and from
                  nothing else. Said out loud so nobody expects it to know
                  about a salary or a benefit they have not entered. */}
              {showAiNotes ? (
                <div className="mt-2 rounded-xl border border-[color:var(--lajvard)]/25 bg-[color:var(--lajvard)]/5 p-3">
                  <label className="mb-1 block text-[11px] font-bold text-[color:var(--lajvard)]">
                    چند خط دربارهٔ این شغل بنویس — هوش مصنوعی از همین و از فیلدهای بالا متن را می‌سازد
                  </label>
                  <textarea
                    value={aiNotes}
                    onChange={(e) => setAiNotes(e.target.value)}
                    rows={3}
                    maxLength={JOB_AI_NOTES_MAX}
                    placeholder="مثلاً: آشپز با تجربه‌ی غذای ایرانی، شیفت عصر، تجربه‌ی کار در رستوران لازم است، محل کار نزدیک مترو."
                    className="w-full resize-none rounded-lg border border-[color:var(--line)] p-2 text-xs outline-none focus:border-[color:var(--lajvard)]"
                  />
                  <p className="mt-1 text-[11px] text-[color:var(--muted-text)]">
                    فقط از چیزی که اینجا و در فیلدهای بالا نوشته‌ای استفاده می‌شود — حقوق، مزایا یا سابقه‌ای
                    که ننوشته‌ای ساخته نمی‌شود. متن نهایی را خودت بخوان و اصلاح کن؛ چیزی بدون تأیید تو ثبت نمی‌شود.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">نوع همکاری</label>
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={field}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS_FA[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">محل کار</label>
                <select value={workplaceType} onChange={(e) => setWorkplaceType(e.target.value)} className={field}>
                  {WORKPLACE_TYPES.map((t) => <option key={t} value={t}>{WORKPLACE_TYPE_LABELS_FA[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">شهر</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثلاً Toronto" className={field} />
              </div>
            </div>

            {/* Salary: a number or an explicit «توافقی». Never a silently empty
                field — the public page always says one or the other. */}
            <div className="rounded-xl border border-[color:var(--line)] p-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!salaryIsPublic} onChange={() => setSalaryIsPublic(false)} />
                  حقوق توافقی
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={salaryIsPublic} onChange={() => setSalaryIsPublic(true)} />
                  اعلام حقوق
                </label>
              </div>
              {salaryIsPublic ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="حداقل (دلار)" className={field} inputMode="numeric" />
                  <input value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="حداکثر (اختیاری)" className={field} inputMode="numeric" />
                  <select value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)} className={field}>
                    {SALARY_PERIODS.map((p) => <option key={p} value={p}>{SALARY_PERIOD_LABELS_FA[p]}</option>)}
                  </select>
                </div>
              ) : null}
            </div>

            {/* The differentiator. This is the reason someone searches here
                rather than on Indeed. */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-xs font-bold text-[color:var(--text)]">زبان لازم:</span>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={requiresPersian} onChange={(e) => setRequiresPersian(e.target.checked)} /> فارسی
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={requiresEnglish} onChange={(e) => setRequiresEnglish(e.target.checked)} /> انگلیسی
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">روش درخواست</label>
                <select value={applyMethod} onChange={(e) => setApplyMethod(e.target.value as "email" | "phone" | "url")} className={field}>
                  <option value="email">ایمیل</option>
                  <option value="phone">تماس تلفنی</option>
                  <option value="url">لینک</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[color:var(--text)]">
                  {applyMethod === "email" ? "ایمیل دریافت رزومه" : applyMethod === "phone" ? "شماره تماس" : "لینک فرم درخواست"}
                </label>
                <input value={applyValue} onChange={(e) => setApplyValue(e.target.value)} dir="ltr" className={field}
                  placeholder={applyMethod === "url" ? "https://…" : ""} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[color:var(--muted-text)]">مدت نمایش</label>
              <select value={days} onChange={(e) => setDays(e.target.value)} className="h-9 rounded-lg border border-[color:var(--line)] px-2 text-xs">
                <option value="14">۱۴ روز</option>
                <option value="30">۳۰ روز</option>
                <option value="60">۶۰ روز</option>
              </select>
              <span className="text-[11px] text-[color:var(--muted-text)]">بعد از این تاریخ آگهی خودبه‌خود از سایت برداشته می‌شود.</span>
            </div>

            <Button type="button" onClick={submit} disabled={pending || drafting || !title.trim() || descriptionLength < JOB_DESCRIPTION_MIN} className="rounded-xl">
              {pending ? "در حال ثبت…" : "ثبت آگهی"}
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 font-bold text-[color:var(--text)]">آگهی‌های این کسب‌وکار</h2>
        {jobs.length === 0 ? (
          <p className="rounded-2xl bg-[color:var(--bg)] p-5 text-center text-sm text-[color:var(--muted-text)]">هنوز آگهی‌ای ثبت نشده.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((j) => {
              const live = isJobLive(j);
              const remaining = jobDaysRemaining(j);
              const expired = j.status === "published" && !j.closed_at && remaining !== null && remaining <= 0;
              return (
                <li key={j.id} className={`rounded-2xl border border-[color:var(--line)] p-4 ${live ? "bg-white" : "bg-[color:var(--bg)]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Briefcase size={14} className="shrink-0 text-[color:var(--lajvard)]" />
                        <span className="text-sm font-bold text-[color:var(--text)]">{j.title}</span>
                        <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[10px] text-[color:var(--muted-text)]">
                          {expired ? "منقضی‌شده" : JOB_STATUS_LABELS_FA[j.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--muted-text)]">
                        {EMPLOYMENT_TYPE_LABELS_FA[j.employment_type]} · {WORKPLACE_TYPE_LABELS_FA[j.workplace_type]}
                        {j.city ? ` · ${j.city}` : ""} · {formatSalaryFa(j)}
                      </p>
                      <p className="mt-1 text-[11px] text-[color:var(--muted-text)]">
                        ثبت {date(j.created_at)}
                        {live && remaining !== null ? ` · ${fa(remaining)} روز تا پایان` : ""}
                        {j.closed_at ? ` · بسته‌شده ${date(j.closed_at)}` : ""}
                      </p>
                      {j.status === "rejected" && j.moderation_reason ? (
                        <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-800">دلیل رد: {j.moderation_reason}</p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {live ? (
                        <Link href={`/jobs/${j.slug}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-[color:var(--lajvard)]">
                          دیدن آگهی <ExternalLink size={12} />
                        </Link>
                      ) : null}
                      {live ? (
                        <button type="button" onClick={() => close(j.id)} disabled={pending}
                          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-text)] hover:text-red-600">
                          <XCircle size={12} /> بستن
                        </button>
                      ) : null}
                      {(expired || j.status === "closed") ? (
                        <button type="button" onClick={() => extend(j.id)} disabled={pending}
                          className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-text)] hover:text-[color:var(--lajvard)]">
                          <RotateCw size={12} /> تمدید {fa(JOB_DEFAULT_DAYS)} روز
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
