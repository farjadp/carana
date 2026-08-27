// ============================================================================
// Source: app/disclaimer/page.tsx
// Version: 2.0.0 — 2026-08-26
// Why: v1 was a placeholder that said a fuller text "would arrive later" — a
//      legal page that disclaims nothing is worse than none, because the
//      footer links to it as though it did. This is the real document.
//
//      It covers every surface that publishes a claim we did not verify:
//      imported listings, reviews, job ads, the channels directory (where
//      almost every number is a claim nobody can check), AI-assisted text, the
//      map, and the footer's FX rates — which are financial figures shown on
//      every page and had no disclaimer anywhere.
//
//      THE VERIFICATION SECTION IS THE IMPORTANT ONE. The badge means one
//      narrow thing: someone proved control of a phone or email. Anyone who
//      reads it as "vetted" or "endorsed" is the person who later sues. Say
//      what it is not, in the same breath as what it is — and keep this in
//      step with packages/core/src/plans.ts, which refuses to sell it.
// Env / Identity: Static legal page. No secrets.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import {
  LegalCallout,
  LegalList,
  LegalMeta,
  LegalSection,
  LegalToc,
} from "@/components/legal-doc";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  alternates: { canonical: "/disclaimer" },
  title: "سلب مسئولیت",
  description:
    "حدود مسئولیت پلازا درباره‌ی صحت اطلاعات کسب‌وکارها، معنای نشان تایید، نظرات کاربران، آگهی‌های شغلی، فهرست کانال‌ها، نرخ ارز و محتوای تولیدشده با هوش مصنوعی.",
};

const TOC = [
  { id: "s1", label: "۱. نقش ما: معرفی، نه ضمانت" },
  { id: "s2", label: "۲. صحت اطلاعات کسب‌وکارها" },
  { id: "s3", label: "۳. نشان تایید یعنی چه — و یعنی چه نیست" },
  { id: "s4", label: "۴. جایگاه ویژه و محتوای تبلیغاتی" },
  { id: "s5", label: "۵. نظرات کاربران" },
  { id: "s6", label: "۶. آگهی‌های شغلی" },
  { id: "s7", label: "۷. فهرست کانال‌ها و گروه‌ها" },
  { id: "s8", label: "۸. نقشه و موقعیت مکانی" },
  { id: "s9", label: "۹. نرخ ارز و ساعت تهران" },
  { id: "s10", label: "۱۰. محتوای تولیدشده با هوش مصنوعی" },
  { id: "s11", label: "۱۱. پیوندهای خارجی" },
  { id: "s12", label: "۱۲. این سایت مشاوره تخصصی نمی‌دهد" },
  { id: "s13", label: "۱۳. در دسترس بودن سرویس" },
  { id: "s14", label: "۱۴. حدود مسئولیت" },
  { id: "s15", label: "۱۵. اشتباهی دیدید؟" },
];

export default function DisclaimerPage() {
  return (
    <InnerPage
      currentPath="/disclaimer"
      currentSection="brand"
      eyebrow="سلب مسئولیت"
      title="آنچه در این دایرکتوری می‌بینید معرفی است، نه تضمین"
      description={`${company.brandFa} کسب‌وکارها را معرفی می‌کند؛ آن‌ها را نمی‌فروشد، تایید صلاحیت نمی‌کند و ضامنشان نیست. این صفحه دقیقاً می‌گوید مسئولیت ما تا کجاست و از کجا به بعد نیست.`}
    >
      <div className="legal-doc">
        <LegalMeta updated={company.legalLastUpdated} />

        <LegalCallout title="کوتاه و صریح">
          <p>
            {company.brandFa} یک دایرکتوری است. ما طرف هیچ معامله‌ای میان شما و
            یک کسب‌وکار نیستیم، کیفیت کار کسی را تضمین نمی‌کنیم، و صحت هر
            اطلاعاتی که کسب‌وکارها یا کاربران وارد می‌کنند بر عهده‌ی خودشان
            است. پیش از هر تصمیم مالی، حقوقی یا شخصی، خودتان راستی‌آزمایی کنید.
          </p>
        </LegalCallout>

        <LegalToc items={TOC} />

        <LegalSection id="s1" title="۱. نقش ما: معرفی، نه ضمانت">
          <p>
            {company.brandFa}، محصولی از {company.legalName}، یک بستر معرفی
            است. ما کسب‌وکارها را در یک جا گرد می‌آوریم تا پیدا کردنشان
            آسان‌تر شود. ما فروشنده، پیمانکار، واسطه، نماینده یا شریک هیچ‌یک از
            کسب‌وکارهای فهرست‌شده نیستیم.
          </p>
          <p>
            هر قرارداد، خرید، پرداخت، قرار ملاقات یا توافقی که با یک کسب‌وکار
            می‌بندید، مستقیماً میان شما و آن کسب‌وکار است. {company.legalName}{" "}
            طرف آن نیست و مسئولیتی نسبت به اجرا، کیفیت، تاخیر، خسارت یا اختلاف
            ناشی از آن ندارد.
          </p>
          <p>
            حضور یک کسب‌وکار در این فهرست به معنای تایید، توصیه یا پیشنهاد ما
            نیست.
          </p>
        </LegalSection>

        <LegalSection id="s2" title="۲. صحت اطلاعات کسب‌وکارها">
          <p>
            اطلاعات لیستینگ‌ها از دو منبع می‌آید: خود صاحبان کسب‌وکار، و منابع
            عمومی و دایرکتوری‌های موجود که بخشی از فهرست اولیه از آن‌ها
            گردآوری شده است.
          </p>
          <p>
            ما هر لیستینگ را پیش از انتشار بررسی می‌کنیم، اما این بررسی یک
            کنترل کیفی است، نه حسابرسی. ما نمی‌توانیم و ادعا نمی‌کنیم که موارد
            زیر را تضمین می‌کنیم:
          </p>
          <LegalList
            items={[
              "اینکه کسب‌وکار هنوز باز است یا در همان نشانی فعالیت می‌کند.",
              "درستی ساعات کاری، شماره تماس، قیمت‌ها یا فهرست خدمات.",
              "داشتن مجوز، بیمه، پروانه یا صلاحیت حرفه‌ای لازم برای آن کار.",
              "کیفیت، ایمنی یا نتیجه‌ی کالا و خدماتی که ارائه می‌شود.",
              "ایرانی بودن مالکیت کسب‌وکار — این ادعا را خود کسب‌وکار مطرح می‌کند.",
            ]}
          />
          <p>
            اطلاعات کسب‌وکارها به مرور کهنه می‌شود. اگر تصمیمی می‌گیرید که
            برایتان هزینه دارد، پیش از آن مستقیماً با خود کسب‌وکار تماس بگیرید
            و اطلاعات را تایید کنید.
          </p>
        </LegalSection>

        <LegalSection id="s3" title="۳. نشان تایید یعنی چه — و یعنی چه نیست">
          <p>
            نشان تایید روی یک لیستینگ دقیقاً یک چیز می‌گوید:{" "}
            <strong>
              کسی ثابت کرده که به شماره تلفن یا نشانی ایمیل اعلام‌شده‌ی آن
              کسب‌وکار دسترسی دارد
            </strong>
            . همین و بس.
          </p>
          <LegalCallout title="نشان تایید این‌ها را نمی‌گوید">
            <LegalList
              items={[
                "که کسب‌وکار مجوز، پروانه یا بیمه‌ی معتبر دارد.",
                "که کیفیت کارش خوب است یا مشتریانش راضی‌اند.",
                "که ما آن را توصیه می‌کنیم.",
                "که وضعیت مالی یا حقوقی‌اش را بررسی کرده‌ایم.",
                "که ادعاهای نوشته‌شده در توضیحاتش راست است.",
              ]}
            />
          </LegalCallout>
          <p>
            نشان تایید فروشی نیست و با هیچ بسته‌ی پولی به دست نمی‌آید. این یک
            تصمیم عمدی است: اگر تنها نشانه‌ی صادقانه‌ی این دایرکتوری قابل خریدن
            باشد، دیگر نشانه‌ی چیزی نیست.
          </p>
        </LegalSection>

        <LegalSection id="s4" title="۴. جایگاه ویژه و محتوای تبلیغاتی">
          <p>
            برخی کسب‌وکارها برای دیده‌شدن بیشتر هزینه می‌پردازند و ممکن است
            بالاتر از بقیه نمایش داده شوند. این لیستینگ‌ها همیشه با نشان{" "}
            «ویژه» مشخص می‌شوند.
          </p>
          <p>
            پرداخت هزینه هیچ تاثیری بر نشان تایید، بر امکان ثبت نظر درباره‌ی آن
            کسب‌وکار، یا بر حذف نظرات منفی ندارد. رتبه‌ای که بی‌آنکه گفته شود
            به نفع پرداخت‌کننده باشد، تبلیغ پنهان است و ما این کار را
            نمی‌کنیم.
          </p>
        </LegalSection>

        <LegalSection id="s5" title="۵. نظرات کاربران">
          <p>
            نظرها را کاربران می‌نویسند. آن‌ها{" "}
            <strong>نظر شخصی نویسنده‌اند، نه اظهار واقعیت از سوی ما</strong>.{" "}
            {company.legalName} محتوای نظرها را تایید نمی‌کند و مسئول درستی
            آن‌ها نیست.
          </p>
          <p>
            نظرها پیش از نمایش عمومی بررسی می‌شوند و موارد توهین‌آمیز،
            تهدیدآمیز، تبلیغاتی یا حاوی اطلاعات شخصی دیگران حذف می‌شوند. این
            بررسی نمی‌تواند تشخیص دهد که تجربه‌ی روایت‌شده واقعاً رخ داده یا
            نه.
          </p>
          <p>
            میانگین امتیاز یک محاسبه‌ی ساده روی نظرهای ثبت‌شده است، نه سنجش
            بی‌طرفانه‌ی کیفیت. تعداد کم نظر می‌تواند تصویری گمراه‌کننده بسازد.
          </p>
          <p>
            اگر صاحب کسب‌وکاری هستید و نظری را نادرست یا افترا‌آمیز می‌دانید،
            از دکمه‌ی گزارش روی همان نظر استفاده کنید یا به{" "}
            <a href={`mailto:${company.email.support}`}>{company.email.support}</a>{" "}
            بنویسید. رسیدگی می‌کنیم.
          </p>
        </LegalSection>

        <LegalSection id="s6" title="۶. آگهی‌های شغلی">
          <p>
            آگهی‌های شغلی را کارفرمایان منتشر می‌کنند. {company.brandFa} کاریاب،
            آژانس استخدام یا کارفرما نیست و در فرآیند استخدام نقشی ندارد.
          </p>
          <LegalList
            items={[
              "ما وجود واقعی شغل، درستی حقوق اعلام‌شده، شرایط کار یا هویت کارفرما را تضمین نمی‌کنیم.",
              "مسئولیت رعایت قوانین کار و حقوق بشر انتاریو در متن آگهی و در فرآیند استخدام، تماماً با کارفرماست.",
              "اطلاعاتی که در پاسخ به یک آگهی مستقیماً برای کارفرما می‌فرستید از دسترس ما خارج است و سیاست حریم خصوصی ما شامل آن نمی‌شود.",
              "هیچ کارفرمای واقعی برای استخدام از شما پول، اطلاعات کارت بانکی یا مدارک هویتی پیش از عقد قرارداد نمی‌خواهد. چنین درخواستی را گزارش کنید.",
            ]}
          />
        </LegalSection>

        <LegalSection id="s7" title="۷. فهرست کانال‌ها و گروه‌ها">
          <p>
            کانال‌ها و گروه‌های فهرست‌شده روی پلتفرم‌های شخص ثالث (مانند تلگرام
            و اینستاگرام) قرار دارند. ما آن‌ها را اداره نمی‌کنیم، محتوایشان را
            نمی‌بینیم و بر آن کنترلی نداریم.
          </p>
          <p>
            عددهایی که در این بخش می‌بینید — تعداد اعضا، زمان آخرین فعالیت —
            چیزی است که خود پلتفرم یا پیشنهاددهنده گزارش کرده است. تعداد اعضا
            قابل خریدن است و ما راهی برای تشخیص عضو خریداری‌شده نداریم؛ به همین
            دلیل ترتیب پیش‌فرض این فهرست بر اساس تازگی فعالیت است، نه تعداد
            اعضا. کانالی که مدتی است فعالیتی نداشته با برچسب «راکد» نشان داده
            می‌شود، نه پنهان.
          </p>
          <p>
            پیوستن به هر کانال یا گروه به انتخاب و مسئولیت خود شماست، و شرایط و
            حریم خصوصی همان پلتفرم بر آن حاکم است.
          </p>
        </LegalSection>

        <LegalSection id="s8" title="۸. نقشه و موقعیت مکانی">
          <p>
            نقشه‌ها و مسیریابی از <span dir="ltr">Google Maps</span> می‌آید.
            موقعیت نشان‌داده‌شده بر پایه‌ی نشانی ثبت‌شده در لیستینگ است و ممکن
            است نادقیق باشد یا با ورودی واقعی محل تفاوت داشته باشد. پیش از سفر،
            نشانی را با خود کسب‌وکار تایید کنید.
          </p>
        </LegalSection>

        <LegalSection id="s9" title="۹. نرخ ارز و ساعت تهران">
          <p>
            نرخ‌های ارز و ساعت تهران که در پایین صفحه‌ها نمایش داده می‌شود{" "}
            <strong>صرفاً برای اطلاع‌رسانی عمومی</strong> است.
          </p>
          <LegalList
            items={[
              "این نرخ‌ها از منابع شخص ثالث می‌آید، ممکن است با تاخیر بروز شود و با نرخ واقعی هر صرافی یا بانک تفاوت دارد.",
              "این اعداد پیشنهاد خرید یا فروش ارز، مشاوره‌ی سرمایه‌گذاری یا نرخ قابل معامله نیستند.",
              <>
                برای هر تصمیم مالی به منبع رسمی و به‌روز مراجعه کنید.{" "}
                {company.legalName} مسئول زیان ناشی از اتکا به این ارقام نیست.
              </>,
            ]}
          />
        </LegalSection>

        <LegalSection id="s10" title="۱۰. محتوای تولیدشده با هوش مصنوعی">
          <p>
            بخشی از متن‌های این سایت با کمک هوش مصنوعی نوشته یا پیشنهاد شده
            است. هوش مصنوعی می‌تواند اشتباه کند و مطالبی بسازد که درست به نظر
            می‌رسند اما نادرست‌اند.
          </p>
          <p>
            مسئولیت نهایی متن هر لیستینگ با صاحب همان لیستینگ است؛ او پیش از
            انتشار متن را می‌بیند و می‌تواند تغییرش دهد. هیچ تصمیمی درباره‌ی
            حساب، لیستینگ یا محتوای شما به‌صورت خودکار و تنها توسط هوش مصنوعی
            گرفته نمی‌شود.
          </p>
        </LegalSection>

        <LegalSection id="s11" title="۱۱. پیوندهای خارجی">
          <p>
            این سایت به وب‌سایت‌ها، شبکه‌های اجتماعی و سرویس‌های دیگری پیوند
            می‌دهد که ما اداره‌شان نمی‌کنیم. وجود یک پیوند به معنای تایید محتوا
            یا امنیت آن مقصد نیست، و ما مسئول محتوا، سیاست حریم خصوصی یا رفتار
            آن سایت‌ها نیستیم.
          </p>
        </LegalSection>

        <LegalSection id="s12" title="۱۲. این سایت مشاوره تخصصی نمی‌دهد">
          <p>
            هیچ بخشی از {company.brandFa} — از جمله توضیح کسب‌وکارها، مقاله‌ها،
            راهنماها و پاسخ‌های پشتیبانی — مشاوره‌ی حقوقی، مالی، سرمایه‌گذاری،
            مالیاتی، پزشکی یا مهاجرتی نیست و نباید جای آن گرفته شود.
          </p>
          <p>
            پیدا کردن یک وکیل، حسابدار، مشاور مهاجرت یا پزشک از طریق این
            دایرکتوری به معنای تایید صلاحیت او از سوی ما نیست. صلاحیت، پروانه و
            عضویت در نهاد صنفی مربوطه را مستقیماً از مرجع رسمی همان حرفه
            راستی‌آزمایی کنید.
          </p>
        </LegalSection>

        <LegalSection id="s13" title="۱۳. در دسترس بودن سرویس">
          <p>
            سرویس «همان‌گونه که هست» و «به هر میزان که در دسترس است» ارائه
            می‌شود. ما تضمین نمی‌کنیم که سایت همیشه بالا باشد، بی‌خطا کار کند،
            یا اینکه امکانات امروز در آینده هم به همین شکل باقی بمانند.
            امکانات می‌توانند تغییر کنند یا حذف شوند.
          </p>
        </LegalSection>

        <LegalSection id="s14" title="۱۴. حدود مسئولیت">
          <p>
            تا حدی که قانون اجازه می‌دهد، {company.legalName} مسئول زیان‌های
            غیرمستقیم، تبعی یا از دست رفتن سود، داده یا فرصت — ناشی از استفاده
            از این سرویس، اتکا به اطلاعات آن، یا معامله با کسب‌وکارهای
            فهرست‌شده — نیست. سقف و جزئیات این محدودیت در{" "}
            <Link href="/terms">قوانین و مقررات</Link> آمده است.
          </p>
          <p>
            هیچ بخشی از این صفحه حقوقی را که قانون کانادا یا قانون حمایت از
            مصرف‌کننده‌ی انتاریو برای شما در نظر گرفته و قابل سلب نیست، محدود
            نمی‌کند.
          </p>
        </LegalSection>

        <LegalSection id="s15" title="۱۵. اشتباهی دیدید؟">
          <p>
            اگر اطلاعاتی نادرست، لیستینگی جعلی یا محتوایی نامناسب دیدید، از
            دکمه‌ی گزارش روی همان صفحه استفاده کنید یا به{" "}
            <a href={`mailto:${company.email.support}`}>{company.email.support}</a>{" "}
            بنویسید. برای ثبت گزارش لازم نیست حساب کاربری داشته باشید.
          </p>
        </LegalSection>

        <LegalSection id="en" title="English summary">
          <p lang="en" dir="ltr" style={{ textAlign: "left" }}>
            {company.brand}, operated by {company.legalName}, is a directory. We
            are not a party to any transaction between you and a listed
            business, and we do not endorse, vet or guarantee any business, its
            licensing, its insurance or the quality of its work. A verification
            badge means only that someone proved control of the phone number or
            email address on the listing — nothing more; it is never sold. Paid
            placement is always labelled. Reviews are the personal opinions of
            their authors, not statements of fact by us. Job ads are published
            by employers, who are solely responsible for their accuracy and for
            compliance with Ontario employment and human rights law. Channels
            listed here run on third-party platforms we do not control, and
            their member counts are self-reported and can be purchased. The
            exchange rates and Tehran clock shown in the footer are for general
            information only and are not financial advice or tradeable rates.
            Some text is AI-assisted and may contain errors. Nothing here is
            legal, financial, tax, medical or immigration advice. The service is
            provided &quot;as is&quot;. See our{" "}
            <Link href="/terms">Terms</Link> for the full limitation of
            liability. Nothing on this page limits rights you have under
            Canadian law or the Ontario Consumer Protection Act that cannot be
            waived.
          </p>
        </LegalSection>
      </div>
    </InnerPage>
  );
}
