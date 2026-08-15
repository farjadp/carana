// ============================================================================
// Source: app/download/page.tsx
// Version: 1.0.0 — 2026-08-15
// Why: One place to get the app. Store buttons appear only when a store URL
//      exists; until then they say "coming" honestly. The direct APK is the
//      real download today (Android, sideload), served from EAS.
// Env / Identity: Static, public.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { Apple, ArrowLeft, Download, Play, ShieldCheck, Smartphone } from "lucide-react";

import { InnerPage } from "@/components/inner-page";
import { BrandMark } from "@/components/brand-mark";
import { APP_VERSION, STORES } from "@/lib/data/releases";

export const metadata: Metadata = {
  title: "دانلود اپلیکیشن",
  description: "اپ چارانا برای iOS و Android — دایرکتوری کسب‌وکارهای ایرانی کانادا در جیب شما.",
};

const fa = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export default function DownloadPage() {
  return (
    <InnerPage
      currentPath="/download"
      currentSection="brand"
      eyebrow="دانلود"
      title="چارانا را همراه داشته باش."
      description={`نسخه‌ی ${fa(APP_VERSION)} — همان حساب سایت، همان کسب‌وکارها، با تماس و مسیریابی یک‌لمسی. رایگان.`}
    >
      <section className="grid md:grid-cols-3 gap-4" dir="rtl">
        <StoreCard
          icon={<Apple size={26} />}
          name="App Store"
          sub="iPhone و iPad"
          href={STORES.appStore}
          comingNote="در انتظار تایید حساب سازمانی اپل. به‌زودی."
        />
        <StoreCard
          icon={<Play size={24} />}
          name="Google Play"
          sub="اندروید"
          href={STORES.playStore}
          comingNote="در انتظار تایید حساب سازمانی گوگل. به‌زودی."
        />
        <div className="rounded-3xl bg-[color:var(--annabi)] text-[#f6f1e8] p-6 relative overflow-hidden flex flex-col">
          <div className="absolute -left-10 -bottom-12 opacity-10" aria-hidden><BrandMark size={180} color="#f6f1e8" simple /></div>
          <div className="relative flex-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3"><Download size={24} /></div>
            <div className="text-lg font-black">فایل مستقیم APK</div>
            <div className="text-xs text-[#f6f1e8]/70 mt-0.5">اندروید · نسخه‌ی {fa(STORES.apkVersion)} · {fa(STORES.apkSizeMb)} مگابایت · {fa(STORES.apkBuiltAt)}</div>
            <p className="text-sm text-[#f6f1e8]/85 mt-3 leading-relaxed">همین حالا، بدون استور. روی گوشی اندرویدی باز کن، اجازه‌ی نصب از منبع ناشناس را یک‌بار بده، نصب کن.</p>
          </div>
          <a href={STORES.apkDirect} className="relative mt-4 h-12 rounded-xl bg-[#f6f1e8] font-bold flex items-center justify-center gap-2 hover:bg-white transition" style={{ color: "#800000" }}>
            <Download size={18} /> دانلود APK
          </a>
        </div>
      </section>

      <section className="mt-8 grid md:grid-cols-2 gap-4" dir="rtl">
        <div className="rounded-2xl bg-white border border-[color:var(--line)] p-5">
          <div className="font-black text-[color:var(--text)] flex items-center gap-2 mb-2"><Smartphone size={18} className="text-[color:var(--annabi)]" /> نصب APK — قدم‌به‌قدم</div>
          <ol className="text-sm text-[color:var(--text)]/80 leading-relaxed space-y-1.5 list-decimal pr-5">
            <li>لینک بالا را روی گوشی اندروید باز کن (یا با QR از همین صفحه).</li>
            <li>وقتی دانلود تمام شد روی فایل بزن. اندروید می‌پرسد «نصب از این منبع؟» — یک‌بار اجازه بده.</li>
            <li>نصب کن و باز کن. با همان حساب سایت وارد شو.</li>
          </ol>
          <p className="text-xs text-[color:var(--muted-text)] mt-3">این هشدار برای هر اپی خارج از Play Store طبیعی است؛ فایل مستقیم از سرور بیلد Expo زیر حساب Ashavid می‌آید.</p>
        </div>
        <div className="rounded-2xl bg-white border border-[color:var(--line)] p-5">
          <div className="font-black text-[color:var(--text)] flex items-center gap-2 mb-2"><ShieldCheck size={18} className="text-[color:var(--annabi)]" /> iPhone دارم — الان چه؟</div>
          <p className="text-sm text-[color:var(--text)]/80 leading-relaxed">
            نسخه‌ی iOS ساخته شده و روی دستگاه اجرا می‌شود؛ انتشار عمومی و TestFlight پشت تایید حساب سازمانی اپل است. تا آن موقع، سایت روی سافاری همه‌ی امکانات را دارد — می‌توانی از منوی اشتراک، «Add to Home Screen» بزنی تا مثل اپ باز شود.
          </p>
          <Link href="/releases" className="inline-flex items-center gap-1 text-sm font-bold text-[color:var(--lajvard)] mt-3">تغییرات هر نسخه <ArrowLeft size={14} /></Link>
        </div>
      </section>
    </InnerPage>
  );
}

function StoreCard({ icon, name, sub, href, comingNote }: { icon: React.ReactNode; name: string; sub: string; href: string; comingNote: string }) {
  const live = !!href;
  const inner = (
    <>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${live ? "bg-[color:var(--text)] text-[#f6f1e8]" : "bg-[color:var(--bg)] text-[color:var(--muted-text)]"}`}>{icon}</div>
      <div className="text-lg font-black text-[color:var(--text)]" dir="ltr" style={{ textAlign: "right" }}>{name}</div>
      <div className="text-xs text-[color:var(--muted-text)]">{sub}</div>
      <p className={`text-sm mt-3 leading-relaxed flex-1 ${live ? "text-[color:var(--text)]/80" : "text-[color:var(--muted-text)]"}`}>{live ? "نصب از استور رسمی." : comingNote}</p>
      <div className={`mt-4 h-12 rounded-xl font-bold flex items-center justify-center gap-2 ${live ? "bg-[color:var(--text)] text-[#f6f1e8]" : "bg-[color:var(--bg)] text-[color:var(--muted-text)]"}`}>
        {live ? <>باز کردن {name}</> : "به‌زودی"}
      </div>
    </>
  );
  return live
    ? <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-3xl bg-white border border-[color:var(--line)] p-6 flex flex-col hover:shadow-[0_14px_36px_rgba(20,33,61,0.10)] transition">{inner}</a>
    : <div className="rounded-3xl bg-white border border-dashed border-[color:var(--line)] p-6 flex flex-col">{inner}</div>;
}
