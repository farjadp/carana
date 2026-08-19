// ============================================================================
// Source: components/dashboard-overview.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Summarize user roles, panel responsibilities, and future ACL surfaces.
// Env / Identity: Static architecture helper for dashboard and access pages.
// ============================================================================
import { Card, CardContent } from "@/components/ui/card";

export function DashboardOverview() {
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">معماری پنل</p>
          <h1>مدل دسترسی برای گوپلازا باید از روز اول روشن و قابل‌گسترش باشد</h1>
          <p>
            در این نسخه، نقش‌ها و پنل‌ها با این منطق طراحی می‌شوند که هم کاربر عادی بتواند
            کسب‌وکار پیدا کند، هم صاحب بیزینس بتواند پروفایلش را مدیریت کند، و هم ادمین کنترل
            moderation و claimها را داشته باشد.
          </p>
        </div>
      </section>

      <section className="role-grid">
        {[
          [
            "مهمان",
            "مرور دسته‌ها، جست‌وجوی کسب‌وکارها، دیدن پروفایل‌ها و ارسال درخواست اولیه بدون دسترسی مدیریتی.",
          ],
          [
            "کاربر ثبت‌نام‌شده",
            "ذخیره کسب‌وکار، گزارش تخلف، مدیریت پروفایل شخصی، و شروع claim برای یک بیزینس.",
          ],
          [
            "صاحب کسب‌وکار",
            "ایجاد و ویرایش پروفایل بیزینس، مدیریت تصاویر، ساعات کاری، اطلاعات تماس و دریافت لید.",
          ],
          [
            "ادمین / moderator",
            "بررسی claimها، تأیید یا رد تغییرات، مدیریت دسته‌ها، گزارش‌ها و کیفیت دایرکتوری.",
          ],
        ].map(([title, description]) => (
          <Card key={title} className="info-card">
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="access-grid">
        <Card className="info-card">
          <CardContent>
            <strong>پنل کاربر</strong>
            <p>
              مسیر پایه: ویرایش پروفایل، ذخیره بیزینس‌ها، پیگیری درخواست claim و مدیریت
              اعلان‌ها.
            </p>
          </CardContent>
        </Card>
        <Card className="info-card">
          <CardContent>
            <strong>پنل صاحب کسب‌وکار</strong>
            <p>
              مدیریت listing، دسته‌بندی، شهر، محتوای پروفایل، وضعیت verification و analytics
              اولیه.
            </p>
          </CardContent>
        </Card>
        <Card className="info-card">
          <CardContent>
            <strong>پنل ادمین</strong>
            <p>
              moderation queue، مدیریت claimها، کنترل ریویو و سیاست‌های کیفیت داده برای
              دایرکتوری.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
