import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";

export const metadata: Metadata = {
  title: "شرایط استفاده | čārana",
};

export default function TermsPage() {
  return (
    <InnerPage
      currentPath="/terms"
      currentSection="brand"
      eyebrow="شرایط استفاده"
      title="برای استفاده از دایرکتوری، هم کاربران و هم صاحبان کسب‌وکار باید قواعد روشنی داشته باشند"
      description="این صفحه فعلاً نسخه اولیه است و بعداً با جزئیات مربوط به انتشار اطلاعات، استفاده از محتوا، رفتار مجاز و حقوق پلتفرم تکمیل می‌شود."
    >
      <div />
    </InnerPage>
  );
}
