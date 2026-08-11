import type { Metadata } from "next";

import { InnerPage } from "@/components/inner-page";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "اعتماد و امنیت | čārana",
};

export default function TrustPage() {
  return (
    <InnerPage
      currentPath="/trust"
      currentSection="business"
      eyebrow="اعتماد و امنیت"
      title="برای دایرکتوری کسب‌وکارها، اعتماد باید در خود معرفی بیزینس‌ها دیده شود"
      description="کاربر وقتی دنبال یک وکیل، پزشک، حسابدار یا رستوران می‌گردد، پیش از هر چیز می‌پرسد: «می‌توانم به این کسب‌وکار و این پلتفرم اعتماد کنم؟» پاسخ محصول باید در طراحی، محتوا و سازوکارها دیده شود."
    >
      <section className="trust-principles">
        {[
          ["پروفایل‌های معتبرتر", "امکان احراز هویت، لینک‌دادن به وب‌سایت یا شبکه اجتماعی واقعی، و نمایش سابقه بیزینس باید به مرور اضافه شود."],
          ["گزارش تخلف و بازبینی", "کاربر باید بتواند اطلاعات غلط، ادعای گمراه‌کننده یا رفتار نامناسب را سریع گزارش کند."],
          ["شفافیت در اطلاعات", "حوزه خدمات، شهر، نحوه تماس، ساعات کاری و محدوده سرویس نباید مبهم یا پنهان باشند."],
          ["لحن انسانی و حرفه‌ای", "وقتی متن محصول اغراق‌آمیز نیست، اعتماد راحت‌تر ساخته می‌شود. اینجا زبان محصول هم بخشی از امنیت است."],
        ].map(([title, description]) => (
          <Card key={title} className="principle-card">
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="info-grid">
        {[
          ["آنچه در فاز اول کافی است", "قوانین پایه ثبت بیزینس، دکمه گزارش، ریویوی دستی اولیه و هشدارهای امنیتی برای کاربران."],
          ["آنچه در فازهای بعد مهم می‌شود", "امتیازدهی، ریویوی کاربران، نشان بیزینس معتبر و رتبه‌بندی هوشمندتر کسب‌وکارها."],
        ].map(([title, description]) => (
          <Card key={title} className="info-card">
            <CardContent>
              <strong>{title}</strong>
              <p>{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </InnerPage>
  );
}
