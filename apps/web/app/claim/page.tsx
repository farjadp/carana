// ============================================================================
// Source: app/claim/page.tsx
// Version: 2.0.0 — 2026-08-15
// Why: Owner acquisition starts here. v2 makes the route usable from anywhere:
//      /claim with no id is a "which business is yours?" search (the header,
//      footer, contact and support pages all link here bare — v1 answered
//      with a 404); /claim?businessId= is the three-step proof, readable
//      before signing in so the visitor knows what they are about to do.
//      Proof itself is unchanged: an SMS code to the number already on the
//      listing, handled by lib/verification/actions.ts.
// Env / Identity: Server Component. RLS applies to the reads.
// ============================================================================
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, MessageSquare, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { BrandMark } from "@/components/brand-mark";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerificationStatus } from "@/lib/verification/status";
import ClaimClient from "./claim-client";

export const metadata: Metadata = {
  alternates: { canonical: "/claim" },
  title: "احراز مالکیت کسب‌وکار | پلازا",
  description: "کسب‌وکارتان در پلازا هست؟ با یک کد پیامکی مالکیتش را ثابت کنید و نشان تایید بگیرید.",
};

const CARD_COLUMNS = "id, slug, name, name_en, city, category, phone, verified_until, owner_user_id";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; q?: string }>;
}) {
  const { businessId, q } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─────────────────────────── Find mode ───────────────────────────
  if (!businessId) {
    const term = (q ?? "").trim().replace(/[,().%_\\*]/g, " ").replace(/\s+/g, " ").slice(0, 80);
    let results: { id: string; slug: string | null; name: string; name_en: string | null; city: string | null; phone: string | null; verified_until: string | null; owner_user_id: string | null }[] = [];
    if (term) {
      const pat = `%${term}%`;
      const { data } = await supabase
        .from("businesses")
        .select(CARD_COLUMNS)
        .eq("status", "PUBLISHED")
        .or(`name.ilike.${pat},name_en.ilike.${pat},phone.ilike.${pat}`)
        .order("name")
        .limit(20);
      results = (data ?? []) as typeof results;
    }

    return (
      <PageShell currentPath="/claim" currentSection="business">
        <div className="mx-auto max-w-3xl px-4 py-10 md:py-14" dir="rtl">
          <Hero />

          <form action="/claim" method="get" className="mt-8 bg-white rounded-2xl p-2 shadow-[0_18px_50px_rgba(20,33,61,0.12)] flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex items-center gap-2 px-3">
              <Search size={18} className="text-[color:var(--annabi)] shrink-0" />
              <input name="q" defaultValue={term} placeholder="نام کسب‌وکار یا شماره تلفنش" className="h-12 w-full bg-transparent outline-none text-[15px] text-[color:var(--text)]" autoFocus />
            </label>
            <button type="submit" className="h-12 px-6 rounded-xl bg-[color:var(--annabi)] hover:bg-[#5A1124] text-[#f6f1e8] font-bold transition">جستجو</button>
          </form>

          {term ? (
            results.length ? (
              <ul className="mt-6 space-y-2">
                {results.map((b) => {
                  const verified = !!b.verified_until && new Date(b.verified_until) > new Date();
                  const taken = !!b.owner_user_id;
                  return (
                    <li key={b.id}>
                      <Link href={`/claim?businessId=${b.id}`} className="group flex items-center gap-4 rounded-2xl bg-white border border-[color:var(--line)] p-4 hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] transition">
                        <div className="w-11 h-11 rounded-2xl bg-[color:var(--bg)] text-[color:var(--annabi)] font-black flex items-center justify-center shrink-0">{b.name.trim().charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[color:var(--text)] truncate">{b.name}</div>
                          <div className="text-xs text-[color:var(--muted-text)] truncate">
                            {[b.name_en, b.city].filter(Boolean).join(" · ")}
                            {b.phone ? <span dir="ltr" className="mr-2 [font-family:var(--font-latin)]"> · {maskPhone(b.phone)}</span> : null}
                          </div>
                        </div>
                        {taken || verified ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 shrink-0 inline-flex items-center gap-1"><BadgeCheck size={12} /> احرازشده</span>
                        ) : !b.phone ? (
                          <span className="text-[11px] text-[color:var(--muted-text)] shrink-0">بدون شماره</span>
                        ) : (
                          <ArrowLeft size={16} className="text-[color:var(--muted-text)] group-hover:-translate-x-0.5 transition shrink-0" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="mt-6 rounded-2xl bg-white border border-[color:var(--line)] p-6 text-center">
                <div className="font-bold text-[color:var(--text)]">چیزی با «{term}» پیدا نشد</div>
                <p className="text-sm text-[color:var(--muted-text)] mt-1">شاید کسب‌وکارتان هنوز در پلازا ثبت نشده باشد — رایگان ثبتش کنید و از همان اول احرازشده باشد.</p>
                <Link href="/dashboard/business/new" className="inline-flex items-center gap-2 mt-4 rounded-xl bg-[color:var(--annabi)] text-[#f6f1e8] font-bold px-4 py-2.5 hover:bg-[#5A1124] transition"><Sparkles size={16} /> ثبت کسب‌وکار جدید</Link>
              </div>
            )
          ) : (
            <HowItWorks />
          )}
        </div>
      </PageShell>
    );
  }

  // ─────────────────────────── Prove mode ───────────────────────────
  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, name, name_en, city, phone, category, verification_method, verified_at, verified_until, verified_phone, verified_email, contact_email, owner_user_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) notFound();

  const status = getVerificationStatus(business);
  const alreadyMine = !!user && business.owner_user_id === user.id;
  const takenByOther = !!business.owner_user_id && !alreadyMine;
  const nextUrl = `/claim?businessId=${business.id}`;

  return (
    <PageShell currentPath="/claim" currentSection="business">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-14" dir="rtl">
        <nav className="mb-6 text-sm text-[color:var(--muted-text)] flex items-center gap-2">
          <Link href="/claim" className="hover:underline">احراز مالکیت</Link>
          <span>›</span>
          <Link href={`/businesses/${business.slug ?? business.id}`} className="hover:underline truncate">{business.name}</Link>
        </nav>

        {/* Business card */}
        <div className="rounded-3xl bg-white border border-[color:var(--line)] p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[color:var(--bg)] text-[color:var(--annabi)] text-2xl font-black flex items-center justify-center shrink-0">{business.name.trim().charAt(0)}</div>
          <div className="min-w-0">
            <div className="text-lg font-black text-[color:var(--text)] truncate">{business.name}</div>
            <div className="text-xs text-[color:var(--muted-text)]">{[business.name_en, business.city].filter(Boolean).join(" · ")}</div>
          </div>
        </div>

        {takenByOther ? (
          <Notice tone="amber" title="این کسب‌وکار قبلاً احراز شده است">
            اگر فکر می‌کنید اشتباهی رخ داده یا مالکیت تغییر کرده، به <Link href="/support" className="underline font-bold">پشتیبانی</Link> بنویسید و نام کسب‌وکار را ذکر کنید.
          </Notice>
        ) : alreadyMine ? (
          <Notice tone="green" title="این کسب‌وکار متعلق به شماست">
            {status.daysRemaining !== null && status.daysRemaining > 0
              ? <>مالکیت شما احراز شده و {status.daysRemaining} روز دیگر اعتبار دارد. </>
              : <>اعتبار تایید شما تمام شده و باید تمدید شود. </>}
            <Link href="/dashboard/business" className="inline-block mt-3 rounded-xl bg-[color:var(--annabi)] px-4 py-2 font-bold text-[#f6f1e8]">رفتن به کسب‌وکارهای من</Link>
          </Notice>
        ) : (
          <>
            {/* Stepper */}
            <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { n: "۱", t: "ورود به حساب", done: !!user, icon: UserRound },
                { n: "۲", t: "کد پیامکی", done: false, icon: MessageSquare },
                { n: "۳", t: "نشان تایید", done: false, icon: BadgeCheck },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.n} className={`rounded-2xl p-3 border ${s.done ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white border-[color:var(--line)] text-[color:var(--muted-text)]"}`}>
                    <Icon size={16} className="mx-auto mb-1" />
                    <div className="font-bold">{s.n}. {s.t}</div>
                  </li>
                );
              })}
            </ol>

            {!user ? (
              <div className="mt-6 rounded-3xl bg-white border border-[color:var(--line)] p-6">
                <div className="font-black text-[color:var(--text)] text-lg">اول وارد حساب پلازا شوید</div>
                <p className="text-sm text-[color:var(--muted-text)] mt-1 leading-relaxed">
                  نشان تایید به حساب شما وصل می‌شود تا بعداً بتوانید پروفایل را ویرایش کنید و یادآور تمدید بگیرید. حساب ندارید؟ ساختنش یک دقیقه است — و بعدش دقیقاً همین‌جا برمی‌گردید.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <Link href={`/auth/login?next=${encodeURIComponent(nextUrl)}`} className="flex-1 h-12 rounded-xl bg-[color:var(--annabi)] hover:bg-[#5A1124] text-[#f6f1e8] font-bold flex items-center justify-center transition">ورود</Link>
                  <Link href={`/auth/signup?next=${encodeURIComponent(nextUrl)}`} className="flex-1 h-12 rounded-xl bg-white border border-[color:var(--line)] text-[color:var(--text)] font-bold flex items-center justify-center hover:bg-[color:var(--bg)] transition">ساخت حساب</Link>
                </div>
              </div>
            ) : (
              <ClaimClient businessId={business.id} businessName={business.name} hasPhone={!!business.phone?.trim()} maskedPhone={business.phone ? maskPhone(business.phone) : null} />
            )}

            <div className="mt-6 rounded-2xl bg-[color:var(--bg)] border border-[color:var(--line)] p-4 text-xs text-[color:var(--muted-text)] leading-relaxed flex gap-2">
              <ShieldCheck size={16} className="text-[color:var(--annabi)] shrink-0 mt-0.5" />
              <span>
                کد فقط به شماره‌ای پیامک می‌شود که هم‌اکنون روی این پروفایل ثبت است{business.phone ? <> (<span dir="ltr" className="[font-family:var(--font-latin)]">{maskPhone(business.phone)}</span>)</> : null} — نه شماره‌ای که شما وارد کنید. اگر آن شماره دیگر دست شما نیست، به <Link href="/support" className="underline font-bold">پشتیبانی</Link> بنویسید.
              </span>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

// ─────────────────────────────── bits ───────────────────────────────

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

function Hero() {
  return (
    <div className="rounded-3xl bg-[color:var(--annabi)] text-[#f6f1e8] p-7 md:p-9 relative overflow-hidden">
      <div className="absolute -left-16 -top-16 opacity-[0.07]" aria-hidden><BrandMark size={300} color="#f6f1e8" simple /></div>
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 text-xs bg-white/12 px-3 py-1.5 rounded-full mb-4"><BadgeCheck size={14} /> احراز مالکیت</div>
        <h1 className="text-2xl md:text-4xl font-black leading-tight">کسب‌وکارتان در پلازا هست؟<br />ثابت کنید مال شماست.</h1>
        <p className="mt-3 text-[#f6f1e8]/80 leading-relaxed max-w-xl text-sm md:text-base">
          یک کد پیامکی به شماره‌ای که روی پروفایل است — همین. بعدش نشان «مالکیت احرازشده» می‌گیرید، پروفایل را خودتان ویرایش می‌کنید، و در جستجوها بالاتر دیده می‌شوید. رایگان است.
        </p>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Search, t: "پیدایش کن", b: "نام یا شماره‌ی کسب‌وکارت را بالا جستجو کن." },
    { icon: UserRound, t: "وارد شو", b: "با حساب پلازا — تا نشان به حساب تو وصل شود." },
    { icon: MessageSquare, t: "کد را بگیر", b: "پیامک به شماره‌ی روی پروفایل می‌رود. کد را وارد کن." },
    { icon: BadgeCheck, t: "تمام", b: "نشان تایید ۶ ماه اعتبار دارد؛ برای تمدید یادآوری می‌فرستیم." },
  ];
  return (
    <ol className="mt-8 grid sm:grid-cols-2 gap-3">
      {steps.map(({ icon: Icon, t, b }, i) => (
        <li key={t} className="rounded-2xl bg-white border border-[color:var(--line)] p-4 flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--annabi)]/8 text-[color:var(--annabi)] flex items-center justify-center shrink-0"><Icon size={18} /></div>
          <div>
            <div className="font-bold text-[color:var(--text)]"><span className="text-[color:var(--gold)] ml-1">{"۱۲۳۴"[i]}.</span> {t}</div>
            <p className="text-sm text-[color:var(--muted-text)] mt-0.5 leading-relaxed">{b}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Notice({ tone, title, children }: { tone: "amber" | "green"; title: string; children: React.ReactNode }) {
  const cls = tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className={`mt-6 rounded-2xl border p-5 text-sm leading-relaxed ${cls}`}>
      <p className="font-bold mb-1">{title}</p>
      <div>{children}</div>
    </div>
  );
}
