// ============================================================================
// Source: app/privacy/page.tsx
// Version: 2.0.0 — 2026-08-22
// Why: Real privacy policy. Apple requires a working privacy-policy URL before
//      an app can be reviewed, and it must actually describe what is collected.
//      Contents mirror the live schema — update both together.
// Env / Identity: Static legal page. No secrets.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import { LegalList, LegalMeta, LegalSection, LegalTable } from "@/components/legal-doc";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description:
    "سیاست حریم خصوصی گوپلازا: چه اطلاعاتی جمع‌آوری می‌شود، چرا، چه مدت نگهداری می‌شود و چگونه می‌توانید حذفش کنید.",
};

export default function PrivacyPage() {
  return (
    <InnerPage
      currentPath="/privacy"
      currentSection="brand"
      eyebrow="حریم خصوصی"
      title="چه اطلاعاتی جمع می‌کنیم، چرا، و چطور می‌توانید حذفش کنید"
      description={`${company.brandFa} محصولی از ${company.legalName} است. این سند توضیح می‌دهد دقیقاً چه داده‌ای نگهداری می‌شود و اختیار شما نسبت به آن چیست.`}
    >
      <div className="legal-doc">
        <LegalMeta updated={company.legalLastUpdated} />

        <LegalSection title="۱. مسئول داده کیست">
          <p>
            {company.legalName} ثبت‌شده در {company.jurisdiction}، مسئول پردازش
            اطلاعات شماست. برای هر پرسشی درباره‌ی این سند می‌توانید به{" "}
            <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>{" "}
            بنویسید.
          </p>
        </LegalSection>

        <LegalSection title="۲. چه اطلاعاتی جمع‌آوری می‌شود">
          <LegalTable
            head={["دسته", "نمونه", "چرا"]}
            rows={[
              [
                "حساب کاربری",
                "ایمیل، نام، شماره موبایل، تاریخ تولد (اختیاری)، تصویر پروفایل",
                "ساخت حساب، ورود، ارتباط با شما",
              ],
              [
                "اطلاعات کسب‌وکار",
                "نام، دسته، آدرس، تماس، ساعات کاری، خدمات، تصاویر",
                "انتشار در دایرکتوری عمومی",
              ],
              [
                "مدارک راستی‌آزمایی",
                "شماره ثبت شرکت، اطلاعات مجوز، یادداشت تایید",
                "بررسی صحت لیستینگ — هرگز عمومی نمایش داده نمی‌شود",
              ],
              [
                "تعاملات خصوصی شما",
                "یادداشت شخصی، امتیاز خصوصی، نشان‌شده‌ها، فایل‌های ضمیمه",
                "فقط برای خودتان؛ در دسترس هیچ کاربر دیگری نیست",
              ],
              [
                "نظرات عمومی",
                "متن نظر، امتیاز، نحوه‌ی نمایش هویت",
                "نمایش عمومی پس از بررسی",
              ],
              [
                "گزارش فعالیت",
                "زمان ورود و خروج، نشانی IP، نوع رویداد",
                "امنیت حساب و تشخیص سوءاستفاده",
              ],
              [
                "کد تایید",
                "کد یک‌بارمصرف موبایل و ایمیل (به‌صورت هش‌شده)",
                "تایید مالکیت شماره و ایمیل",
              ],
            ]}
          />
          <p>
            هیچ اطلاعات پرداختی روی سرورهای ما ذخیره نمی‌شود. ما اطلاعات کارت
            بانکی شما را نه می‌بینیم و نه نگه می‌داریم.
          </p>
        </LegalSection>

        <LegalSection title="۳. چه چیزی عمومی است و چه چیزی نیست">
          <LegalList
            items={[
              "اطلاعات لیستینگ منتشرشده عمومی است و در موتورهای جستجو نمایه می‌شود.",
              "یادداشت‌های خصوصی، امتیازهای شخصی، فایل‌های ضمیمه و فهرست نشان‌شده‌های شما هرگز عمومی نمی‌شوند.",
              "شماره ثبت شرکت، اطلاعات مجوز و مدارک راستی‌آزمایی فقط برای تیم بررسی قابل مشاهده است.",
              "هنگام ثبت نظر می‌توانید انتخاب کنید نامتان نمایش داده شود یا نظر ناشناس ثبت شود.",
            ]}
          />
        </LegalSection>

        <LegalSection title="۴. سرویس‌های شخص ثالث">
          <p>برای اجرای سرویس از این ارائه‌دهندگان استفاده می‌کنیم:</p>
          <LegalTable
            head={["سرویس", "کارکرد", "داده‌ای که دریافت می‌کند"]}
            rows={[
              [
                "Supabase",
                "میزبانی پایگاه داده، احراز هویت و فایل‌ها",
                "همه‌ی داده‌های حساب و لیستینگ",
              ],
              [
                "OpenAI",
                "کمک به نگارش توضیحات و بررسی خودکار تغییرات",
                "فقط متنی که خودتان برای پردازش ارسال می‌کنید",
              ],
              [
                "Google Maps",
                "نمایش نقشه و مسیریابی",
                "نشانی لیستینگ",
              ],
              [
                "Vercel",
                "میزبانی وب‌سایت",
                "گزارش‌های فنی درخواست‌ها",
              ],
            ]}
          />
          <p>
            ما اطلاعات شما را نمی‌فروشیم و برای تبلیغات هدفمند در اختیار شخص ثالث
            قرار نمی‌دهیم.
          </p>
        </LegalSection>

        <LegalSection title="۵. منبع اطلاعات کسب‌وکارها">
          <p>
            بخشی از لیستینگ‌های اولیه از منابع عمومی و دایرکتوری‌های موجود
            گردآوری شده‌اند. اگر صاحب کسب‌وکاری هستید و می‌خواهید لیستینگتان را
            در اختیار بگیرید، اصلاح کنید یا حذف شود، به{" "}
            <a href={`mailto:${company.email.support}`}>{company.email.support}</a>{" "}
            بنویسید؛ در کوتاه‌ترین زمان ممکن رسیدگی می‌کنیم.
          </p>
        </LegalSection>

        <LegalSection title="۶. مدت نگهداری">
          <LegalList
            items={[
              "اطلاعات حساب: تا زمانی که حساب فعال است.",
              "کدهای تایید: حداکثر ۱۵ دقیقه، سپس حذف می‌شوند.",
              "گزارش فعالیت: حداکثر ۱۲ ماه، برای بررسی امنیتی.",
              "پس از حذف حساب: داده‌های شخصی حذف می‌شوند، مگر مواردی که قانوناً موظف به نگهداری‌شان باشیم.",
            ]}
          />
        </LegalSection>

        <LegalSection id="rights" title="۷. حقوق شما">
          <p>
            بر اساس قانون حفاظت از اطلاعات شخصی کانادا (PIPEDA) شما حق دارید به
            داده‌های خود دسترسی داشته باشید، آن‌ها را اصلاح کنید، یا حذفشان
            بخواهید.
          </p>
          <LegalList
            items={[
              <>
                <strong>مشاهده و اصلاح:</strong> از صفحه‌ی{" "}
                <Link href="/profile">پروفایل</Link> در هر زمان.
              </>,
              <>
                <strong>حذف حساب:</strong> از صفحه‌ی{" "}
                <Link href="/account/delete">حذف حساب کاربری</Link>، بدون نیاز به
                تماس با پشتیبانی.
              </>,
              <>
                <strong>دریافت نسخه‌ی داده‌ها:</strong> با ایمیل به{" "}
                <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>.
              </>,
            ]}
          />
        </LegalSection>

        <LegalSection title="۸. امنیت">
          <p>
            دسترسی به داده‌ها در سطح پایگاه داده محدود شده است؛ هر کاربر تنها به
            رکوردهای خودش دسترسی دارد. کدهای تایید به‌صورت هش‌شده ذخیره می‌شوند و
            ارتباط با سرور رمزنگاری‌شده است. با این حال هیچ سیستمی صددرصد امن
            نیست و ما نمی‌توانیم امنیت مطلق را تضمین کنیم.
          </p>
        </LegalSection>

        <LegalSection title="۹. کودکان">
          <p>
            این سرویس برای افراد زیر ۱۶ سال طراحی نشده است و آگاهانه از آنان
            اطلاعاتی جمع‌آوری نمی‌کنیم.
          </p>
        </LegalSection>

        <LegalSection title="۱۰. تغییرات این سند">
          <p>
            در صورت تغییر بااهمیت، تاریخ بالای صفحه بروز می‌شود و کاربران دارای
            حساب از طریق ایمیل مطلع می‌شوند.
          </p>
        </LegalSection>

        <LegalSection title="English summary">
          <p lang="en" dir="ltr" style={{ textAlign: "left" }}>
            {company.brand} is a Persian-language directory of Iranian
            businesses in Canada, operated by {company.legalName} ({company.jurisdiction}).
            We collect account details (email, name, optional phone and date of
            birth), business listing information, private notes and ratings that
            are visible only to you, public reviews you choose to submit, and
            security logs including IP address. Verification codes are stored
            hashed. We use Supabase (hosting, auth, storage), OpenAI (optional
            writing assistance and automated change review), Google Maps and
            Vercel. We do not sell personal data. You may view and correct your
            data from your profile, delete your account at{" "}
            <Link href="/account/delete">/account/delete</Link>, or request a
            copy by writing to{" "}
            <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>.
          </p>
        </LegalSection>
      </div>
    </InnerPage>
  );
}
