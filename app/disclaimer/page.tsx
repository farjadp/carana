import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";

export const metadata: Metadata = {
  title: "سلب مسئولیت | čārana",
};

export default function DisclaimerPage() {
  return (
    <InnerPage
      currentPath="/disclaimer"
      currentSection="brand"
      eyebrow="سلب مسئولیت"
      title="اطلاعات درج‌شده در این دایرکتوری باید به‌عنوان معرفی کسب‌وکار تفسیر شود، نه تضمین نهایی"
      description="این صفحه فعلاً نسخه اولیه است و بعداً متن کامل‌تری درباره حدود مسئولیت پلتفرم، اطلاعات کسب‌وکارها و تعامل کاربران با آن‌ها دریافت خواهد کرد."
    >
      <div />
    </InnerPage>
  );
}
