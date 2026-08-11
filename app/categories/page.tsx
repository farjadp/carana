import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "دسته‌بندی کسب‌وکارها | čārana",
};

export default function CategoriesPage() {
  return (
    <InnerPage
      currentPath="/categories"
      currentSection="business"
      eyebrow="ساختار دایرکتوری"
      title="دسته‌بندی‌هایی که معرفی کسب‌وکارهای ایرانی را واقعاً قابل‌استفاده می‌کنند"
      description="این دایرکتوری نباید با دسته‌های کلی و بی‌دقت شروع شود. دسته‌ها باید طوری چیده شوند که کاربر بتواند سریع پزشک، وکیل، رستوران، مشاور، فروشگاه یا سرویس موردنیازش را پیدا کند."
    >
      <section className="category-grid">
        {[
          ["پزشکی و سلامت", "دندانپزشک، پزشک خانواده، روان‌درمانگر، کلینیک زیبایی، فیزیوتراپی و خدمات سلامت."],
          ["حقوقی و مهاجرت", "وکیل، مشاور مهاجرت، دفتر اسناد، خدمات بیمه و راهنمایی پرونده‌های رسمی."],
          ["مالی و حسابداری", "حسابدار، مالیات، bookkeeping، مشاوره مالی، mortgage و خدمات مالی بیزینسی."],
          ["غذا و مهمان‌داری", "رستوران، کترینگ، شیرینی‌فروشی، کافه و خدمات پذیرایی برای رویدادها."],
          ["خانه، ساختمان و دکور", "مشاور املاک، پیمانکار، بازسازی، نظافت، طراحی داخلی و خدمات نگهداری ملک."],
          ["خدمات خلاق و دیجیتال", "طراحی، مارکتینگ، تولید محتوا، عکاسی، چاپ، برندینگ و توسعه وب."],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="info-grid">
        <Card className="info-card">
          <CardContent>
            <strong>چرا این ساختار درست است</strong>
            <p>
              کاربران به دنبال معرفی قابل‌اعتماد کسب‌وکارها هستند، نه صرفاً یک اسم در فهرست.
              بنابراین دسته‌بندی باید تصمیم‌گیری را سریع کند و حس اعتبار ایجاد کند.
            </p>
          </CardContent>
        </Card>
        <Card className="info-card">
          <CardContent>
            <strong>اولویت فاز اول</strong>
            <p>
              اگر بخواهیم نسخه اولیه lean باشد، می‌توانیم از شش دسته پرتقاضا شروع کنیم:
              پزشکی، حقوقی، مالی، غذا، املاک، و خدمات دیجیتال.
            </p>
          </CardContent>
        </Card>
      </section>
    </InnerPage>
  );
}
