// ============================================================================
// Source: app/admin/(dashboard)/cleanup/cities/cities-client.tsx
// Version: 1.0.0 — 2026-08-16
// Why: The queue itself. Two tiers, deliberately separated: codes that name
//      one city can be applied in bulk; region-only codes (905, 604, 519…)
//      get a dropdown, because guessing between Richmond Hill and Markham
//      would make the city pages assert something nobody verified.
// ============================================================================
"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, MapPin, Phone, SkipForward, Sparkles } from "lucide-react";

import { applyHighConfidence, setCity, skipBusiness } from "./actions";

export type CleanupRow = {
  id: string; name: string; slug: string | null; phone: string | null; province: string | null;
  category: string | null; website: string | null; address: string | null; handled: boolean;
  areaCode: string | null; region: string | null; suggestion: string | null;
  confidence: "city" | "region" | null; candidates: string[];
};

const fa = (n: number) => n.toLocaleString("fa-IR");

export function CityCleanupClient({ rows }: { rows: CleanupRow[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"auto" | "manual" | "none">("auto");

  const groups = useMemo(() => {
    const auto = rows.filter((r) => r.confidence === "city" && !r.handled);
    const manual = rows.filter((r) => r.confidence === "region" && !r.handled);
    const none = rows.filter((r) => !r.confidence && !r.handled);
    return { auto, manual, none };
  }, [rows]);

  const visible = groups[tab].filter((r) => !done.has(r.id));

  const act = (id: string, fn: () => Promise<{ success: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.success) setDone((s) => new Set(s).add(id));
      else setMsg(r.error ?? "خطا");
    });

  const bulk = () =>
    start(async () => {
      setMsg(null);
      const r = await applyHighConfidence();
      setMsg(r.success ? `${fa(r.updated ?? 0)} کسب‌وکار شهر گرفتند.` : r.error ?? "خطا");
      if (r.success) setDone((s) => { const n = new Set(s); groups.auto.forEach((x) => n.add(x.id)); return n; });
    });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">شهرهای نامشخص</h1>
        <p className="mt-1 max-w-3xl text-sm leading-7 text-[color:var(--muted-text)]">
          {fa(rows.length)} کسب‌وکار شهرشان «نامشخص» است؛ تا وقتی شهر نداشته باشند در هیچ فیلتر شهری، صفحه‌ی شهر یا صفحه‌ی دسته×شهر دیده نمی‌شوند.
          این‌ها آدرس و کد پستی ندارند، پس تنها سرنخ <strong>کد منطقه‌ی تلفن</strong> است.
        </p>
      </div>

      {msg ? <p className="rounded-xl bg-[color:var(--gold)]/15 px-4 py-2 text-sm font-bold text-[color:var(--text)]">{msg}</p> : null}

      {/* The bulk action, with its limits stated */}
      {groups.auto.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black text-[color:var(--text)]">{fa(groups.auto.length)} مورد کد شهرِ قطعی دارند</h2>
            <p className="mt-1 text-xs leading-6 text-[color:var(--muted-text)]">
              ۴۱۶ / ۶۴۷ / ۴۳۷ فقط تورنتو است، ۶۱۳ فقط اتاوا، ۵۱۴ فقط مونترال. این‌ها با برچسب «حدس از روی تلفن» ثبت می‌شوند، نه به‌عنوان گفته‌ی صاحب کسب‌وکار.
            </p>
          </div>
          <button type="button" disabled={pending} onClick={bulk} className="inline-flex h-11 flex-none items-center gap-2 rounded-full bg-[color:var(--annabi)] px-6 text-sm font-black text-[#f6f1e8] disabled:opacity-50">
            <Sparkles size={16} /> {pending ? "در حال اعمال…" : "همه را اعمال کن"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 text-sm">
        {([["auto", `کد قطعی (${fa(groups.auto.length)})`], ["manual", `فقط منطقه — نیاز به انتخاب (${fa(groups.manual.length)})`], ["none", `بدون تلفن (${fa(groups.none.length)})`]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full border px-3 py-1.5 font-bold ${tab === k ? "border-transparent bg-[color:var(--text)] text-[#f6f1e8]" : "border-[color:var(--line)] bg-white text-[color:var(--text)]"}`}>{label}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-white p-10 text-center text-[color:var(--muted-text)]">این دسته خالی است.</div>
      ) : (
        <ul className="space-y-2">
          {visible.slice(0, 100).map((r) => {
            const pick = picks[r.id] ?? r.suggestion ?? "";
            return (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--muted-text)]">
                    {r.category ? <span className="rounded-full bg-[color:var(--bg)] px-2 py-0.5 font-bold">{r.category}</span> : null}
                    {r.province ? <span>{r.province}</span> : null}
                    {r.areaCode ? <span className="inline-flex items-center gap-1" dir="ltr"><Phone size={11} /> {r.phone}</span> : <span className="text-[color:var(--annabi)]">بدون تلفن</span>}
                    {r.region ? <span className="inline-flex items-center gap-1"><MapPin size={11} /> {r.region}</span> : null}
                  </div>
                  <h3 className="mt-1 truncate font-bold text-[color:var(--text)]">{r.name}</h3>
                  {r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[color:var(--lajvard)]" dir="ltr">{r.website.slice(0, 48)} <ExternalLink size={10} /></a> : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    list={`cities-${r.id}`}
                    value={pick}
                    onChange={(e) => setPicks((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="نام شهر (انگلیسی)"
                    dir="ltr"
                    className="h-9 w-44 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 text-sm outline-none focus:bg-white"
                  />
                  <datalist id={`cities-${r.id}`}>
                    {r.candidates.map((c) => <option key={c} value={c} />)}
                  </datalist>
                  <button type="button" disabled={pending || !pick.trim()} onClick={() => act(r.id, () => setCity(r.id, pick, r.confidence === "city" && pick === r.suggestion ? "area_code" : "admin"))} className="inline-flex h-9 items-center gap-1 rounded-xl bg-[color:var(--success,#0f7b4f)] px-3 text-sm font-bold text-white disabled:opacity-40">
                    <Check size={14} /> ثبت
                  </button>
                  <button type="button" disabled={pending} onClick={() => act(r.id, () => skipBusiness(r.id))} title="قابل تشخیص نیست" className="inline-flex h-9 items-center gap-1 rounded-xl border border-[color:var(--line)] bg-white px-3 text-sm font-bold text-[color:var(--muted-text)]">
                    <SkipForward size={14} />
                  </button>
                  {r.slug ? <Link href={`/businesses/${r.slug}`} target="_blank" className="text-xs font-bold text-[color:var(--lajvard)]">پروفایل</Link> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {visible.length > 100 ? <p className="text-center text-xs text-[color:var(--muted-text)]">۱۰۰ مورد اول نمایش داده شد؛ بعد از ثبت، بقیه می‌آیند.</p> : null}
    </div>
  );
}
