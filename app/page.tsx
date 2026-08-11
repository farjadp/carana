// ============================================================================
// Source: app/page.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Render the homepage for the Iranian-Canadian business directory.
// Env / Identity: Uses shared brand content and Supabase readiness status only.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SupabaseStatus } from "@/components/supabase-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "čārana | دایرکتوری کسب‌وکارهای ایرانیان کانادا",
};

export default function HomePage() {
  return (
    <PageShell currentPath="/" currentSection="home">
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">برای کشف، معرفی و رشد کسب‌وکارهای ایرانی در کانادا</p>
            <h1>
              جایی برای دیده‌شدن
              <span>کسب‌وکارهای ایرانیان کانادا</span>
            </h1>
            <p className="hero-text">
              در کانادا حدود ۲۰ هزار ایرانی کسب‌وکار دارند، اما هنوز یک مرجع فارسی‌زبانِ متمرکز
              برای معرفی همه آن‌ها وجود ندارد. <span dir="ltr">čārana</span> قرار است همان
              دایرکتوری قابل‌اعتماد و خوش‌ساختی باشد که کاربران بتوانند با آن وکیل، پزشک،
              رستوران، مشاور، فروشگاه، سرویس محلی و برندهای ایرانی را راحت‌تر پیدا کنند.
            </p>

            <div className="hero-actions">
              <Button asChild variant="solid">
                <Link href="/contact">اولین کسب‌وکار را ثبت کنید</Link>
              </Button>
              <Button asChild variant="muted">
                <Link href="/categories">دیدن دسته‌بندی‌ها</Link>
              </Button>
            </div>

            <div className="hero-meta">
              <div>
                <strong>فارسی و محلی</strong>
                <span>برای تورنتو، ونکوور، مونترال و هر شهری که جامعه ایرانی دارد</span>
              </div>
              <div>
                <strong>برای کشف کسب‌وکار</strong>
                <span>از جست‌وجوی ساده تا پروفایل حرفه‌ای برای هر بیزینس</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <Card className="search-card">
              <CardContent className="p-0">
                <div className="search-top">
                  <span>جست‌وجوی کسب‌وکار</span>
                  <span>Toronto, ON</span>
                </div>
                <div className="search-bar">
                  <span>مثلاً: دندانپزشک، رستوران، وکیل مهاجرت</span>
                  <Button type="button" size="sm">
                    جست‌وجو
                  </Button>
                </div>
                <div className="chip-row">
                  <span>پزشکی</span>
                  <span>حقوقی</span>
                  <span>رستوران</span>
                  <span>خدمات مالی</span>
                </div>
              </CardContent>
            </Card>

            <div className="listing-grid">
              <Card className="listing-card featured">
                <CardContent className="p-0">
                  <span className="listing-tag">پیشنهادی</span>
                  <h3>کلینیک دندانپزشکی فارسی در نورث‌یورک</h3>
                  <p>مشاوره، زیبایی، ایمپلنت و پذیرش بیمار با ارتباط کامل فارسی</p>
                  <div className="listing-foot">
                    <strong>پروفایل ویژه</strong>
                    <span>تورنتو</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="listing-card">
                <CardContent className="p-0">
                  <span className="listing-tag alt">خدمات مالی</span>
                  <h3>حسابداری و مالیات برای افراد و بیزینس‌ها</h3>
                  <p>مشاوره فارسی برای پرونده شخصی، شرکتی و تازه‌واردها</p>
                  <div className="listing-foot">
                    <strong>امتیاز ۴.۹</strong>
                    <span>ونکوور</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="listing-card accent">
                <CardContent className="p-0">
                  <span className="listing-tag warm">رستوران</span>
                  <h3>رستوران ایرانی با منوی سنتی و مدرن</h3>
                  <p>مناسب دورهمی، سفارش بیرون‌بر و پذیرایی برای رویدادهای محلی</p>
                  <div className="listing-foot">
                    <strong>باز است تا ۱۱ شب</strong>
                    <span>مونترال</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="signal-strip">
          <p>شروع با یک دایرکتوری جدی و خوش‌ساخت، نه یک لیست پراکنده و بی‌هویت.</p>
          <div>
            <span>Persian-first</span>
            <span>Canada-ready</span>
            <span>Mobile-minded</span>
          </div>
        </section>

        <section>
          <SupabaseStatus />
        </section>

        <section className="section-stack">
          <div className="section-heading">
            <p className="eyebrow">نقشه محتوا</p>
            <h2>حالا هر بخش، حول معرفی کسب‌وکارها بازتعریف شده است.</h2>
            <p>
              برای اینکه محصول از روز اول هویت روشنی داشته باشد، صفحه‌های اصلی از لندینگ جدا
              شده‌اند و هرکدام نقش مستقیمی در معرفی، کشف و اعتباردهی به بیزینس‌های ایرانی دارند.
            </p>
          </div>

          <div className="page-links">
            {[
              [
                "/categories",
                "دسته‌بندی‌ها",
                "ساختار دایرکتوری، حوزه‌های کاری و گروه‌بندی بیزینس‌های ایرانی.",
              ],
              [
                "/how-it-works",
                "چطور کار می‌کند",
                "مسیر کاربر از جست‌وجوی کسب‌وکار تا تماس، انتخاب و دیده‌شدن برندها.",
              ],
              [
                "/architecture",
                "معماری کاربری",
                "مدل نقش‌ها، پنل‌ها، سطح دسترسی و منطق claim برای کاربران و صاحبان بیزینس.",
              ],
              [
                "/trust",
                "اعتماد و امنیت",
                "رویکرد محصول به اعتبارسنجی بیزینس‌ها، گزارش تخلف و اعتماد کاربر.",
              ],
              ["/story", "داستان اسم", "ریشه واژه čārana و ارتباط آن با هویت برند."],
              [
                "/about",
                "درباره ما",
                "بیانیه برند، مأموریت دایرکتوری و بخش‌هایی که منتظر دیتای واقعی تو هستند.",
              ],
              [
                "/contact",
                "ارتباط با ما",
                "راه‌های تماس برای کاربران، بیزینس‌ها و همکاری‌های تجاری.",
              ],
            ].map(([href, title, description]) => (
              <Card key={href} className="page-link-card">
                <CardContent>
                  <Link href={href}>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="download">
          <div>
            <p className="eyebrow">گام بعدی</p>
            <h2>اسکلت دایرکتوری آماده است.</h2>
            <p>
              از اینجا به بعد می‌توانیم وارد طراحی صفحه لیست بیزینس‌ها، پروفایل هر کسب‌وکار،
              فیلتر شهر و دسته، و تجربه ابتدایی موبایل شویم.
            </p>
          </div>
          <Button asChild variant="solid">
            <Link href="/about">ادامه روی محتوای برند</Link>
          </Button>
        </section>
      </main>
    </PageShell>
  );
}
