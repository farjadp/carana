import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "ارتباط با ما | čārana",
};

export default function ContactPage() {
  return (
    <InnerPage
      currentPath="/contact"
      currentSection="brand"
      eyebrow="ارتباط با ما"
      title="اگر بخواهی با čārana در تماس باشی، این صفحه باید برای کاربران و صاحبان کسب‌وکار شفاف باشد"
      description="اینجا هم برای کسی که دنبال یک بیزینس ایرانی است مهم است، هم برای صاحبان کسب‌وکارها، هم برای کسانی که می‌خواهند همکاری، تبلیغات یا پیشنهاد توسعه بدهند."
    >
      <section className="contact-layout">
        <Card className="contact-card">
          <CardContent>
            <strong>راه‌های ارتباطی پیشنهادی</strong>
            <ul className="plain-list">
              <li>ایمیل عمومی: hello@charana.ca</li>
              <li>همکاری و بیزینس: partners@charana.ca</li>
              <li>پشتیبانی کاربران و بیزینس‌ها: support@charana.ca</li>
              <li>اینستاگرام یا شبکه اجتماعی اصلی برند</li>
              <li>شهر یا ناحیه فعالیت اولیه</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="contact-card">
          <CardContent>
            <strong>فرم اولیه تماس</strong>
            <div className="form-placeholder">
              <div>نام</div>
              <div>ایمیل</div>
              <div>موضوع</div>
              <div className="textarea-line">متن پیام</div>
              <Button type="button">ارسال پیام</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="note-card">
        <p className="eyebrow">این بخش منتظر دیتای توست</p>
        <h2>برای نهایی‌کردن صفحه «ارتباط با ما»، این اطلاعات را بفرست</h2>
        <ul className="plain-list">
          <li>ایمیل یا ایمیل‌های واقعی برند</li>
          <li>لینک شبکه‌های اجتماعی</li>
          <li>شهر یا محدوده فعالیت اصلی</li>
          <li>اینکه فرم تماس به کجا باید وصل شود</li>
          <li>اگر بخش ثبت کسب‌وکار، تبلیغات یا همکاری جدا لازم داری، دقیق مشخص کن</li>
        </ul>
      </section>
    </InnerPage>
  );
}
