import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";

export const metadata: Metadata = {
  title: "حریم خصوصی | čārana",
};

export default function PrivacyPage() {
  return (
    <InnerPage
      currentPath="/privacy"
      currentSection="brand"
      eyebrow="حریم خصوصی"
      title="اطلاعات کاربران و کسب‌وکارها باید با شفافیت و احترام مدیریت شود"
      description="این صفحه فعلاً نسخه اولیه است و بعداً با سیاست دقیق جمع‌آوری، نگهداری و استفاده از داده‌ها تکمیل می‌شود."
    >
      <div />
    </InnerPage>
  );
}
