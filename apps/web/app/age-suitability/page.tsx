// ============================================================================
// Source: app/age-suitability/page.tsx
// Version: 1.0.0 — 2026-10-08
// Why: The "Age Suitability URL" App Store Connect asks for: what a person of
//      any age can meet inside GOPLAZA, how user content reaches the screen,
//      and the age the terms set for an account. Bilingual on purpose — the
//      reader at Apple reads English, the people we answer to read Persian.
//
//      EVERY CLAIM HERE WAS CHECKED AGAINST THE CODE OR THE DATA ON 8 OCT:
//      reviews queue for an admin (pending_moderation); job ads publish
//      directly only for a verified owner and queue otherwise; announcements
//      are posted by the listing's owner with NO pre-moderation
//      (lib/actions/announcements.ts) — say so, do not round it up to
//      "everything is moderated". Alcohol/tobacco: a handful of hookah
//      lounges and a wine lounge among ~9,700 public listings. Health: blog
//      articles on dental care, mental health and cosmetic-injection rules.
//      The 16+ account minimum is terms §(account), not a new rule.
// Env / Identity: Static page. No secrets.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { InnerPage } from "@/components/inner-page";
import { LegalCallout, LegalList, LegalMeta, LegalSection } from "@/components/legal-doc";
import { company } from "@/lib/data/company";

export const metadata: Metadata = {
  alternates: { canonical: "/age-suitability" },
  title: "مناسب بودن برای سنین مختلف",
  description:
    "در پلازا چه محتوایی دیده می‌شود، محتوای کاربران چطور منتشر می‌شود، و برای ساخت حساب چند سال باید داشت. Age suitability information for the GOPLAZA app.",
};

const UPDATED = "2026-10-08";

export default function AgeSuitabilityPage() {
  return (
    <InnerPage
      currentPath="/age-suitability"
      currentSection="brand"
      eyebrow="سن و محتوا"
      title="پلازا برای چه سنی مناسب است"
      description={`${company.brandFa} فهرست کسب‌وکارهای ایرانی در کاناداست. این صفحه می‌گوید در آن چه محتوایی دیده می‌شود و چه چیزی دیده نمی‌شود.`}
    >
      <div className="legal-doc">
        <LegalMeta updated={UPDATED} />

        <LegalCallout title="خلاصه">
          <LegalList
            items={[
              "برای ساخت حساب باید حداقل ۱۶ سال داشته باشید (قوانین و مقررات). جستجو و دیدن کسب‌وکارها بدون حساب هم ممکن است.",
              "در اپ گفتگو، پیام خصوصی بین کاربران یا فید اجتماعی وجود ندارد.",
              "در اپ خریدی انجام نمی‌شود. پلن‌های پولی فقط به صاحبان کسب‌وکار و فقط در وب‌سایت فروخته می‌شوند.",
              "جایگاه‌های پولی همیشه با برچسب «ویژه» مشخص می‌شوند.",
            ]}
          />
        </LegalCallout>

        <LegalSection id="content" title="۱. چه محتوایی در پلازا هست">
          <p>
            اطلاعات کسب‌وکارها: نام، دسته، نشانی، تلفن، ساعت کاری و خدمات. در
            میان این کسب‌وکارها تعداد کمی قلیان‌سرا و رستورانی با سالن شراب هم
            هست، یعنی اشاره‌ی گاه‌به‌گاه به دخانیات و الکل.
          </p>
          <p>
            بخش مقالات شامل نوشته‌هایی درباره‌ی زندگی و کار در کاناداست، از جمله
            مطالبی درباره‌ی دندانپزشکی، سلامت روان و مقررات خدمات زیبایی. این
            مطالب اطلاع‌رسانی است و جای مشورت با پزشک را نمی‌گیرد (
            <Link href="/disclaimer">سلب مسئولیت</Link>).
          </p>
          <p>محتوای جنسی، خشونت، قمار یا مسابقه در پلازا نیست.</p>
        </LegalSection>

        <LegalSection id="ugc" title="۲. محتوای کاربران چطور منتشر می‌شود">
          <LegalList
            items={[
              "نظرهای عمومی: پیش از انتشار، مدیر هر نظر را بررسی می‌کند.",
              "آگهی‌های استخدام: آگهی صاحب کسب‌وکارِ احرازشده مستقیم منتشر می‌شود؛ بقیه پیش از انتشار بررسی می‌شوند.",
              "اعلان‌های کسب‌وکار: صاحب همان کسب‌وکار منتشرشان می‌کند و پیش از انتشار بررسی نمی‌شوند. اگر محتوایی نامناسب دیدید، از دکمه‌ی «گزارش مشکل» روی صفحه‌ی همان کسب‌وکار خبر بدهید.",
            ]}
          />
          <p>
            دکمه‌ی «گزارش مشکل» روی صفحه‌ی هر کسب‌وکار، در اپ و در وب‌سایت، هست و
            گزارش‌ها در صف بررسی تیم پلازا قرار می‌گیرند. شکایت را از{" "}
            <Link href="/complaint">صفحه‌ی شکایت</Link> هم می‌توانید ثبت کنید.
          </p>
        </LegalSection>

        <LegalSection id="account" title="۳. حساب کاربری و حریم خصوصی">
          <p>
            برای ساخت حساب باید حداقل ۱۶ سال داشته باشید (
            <Link href="/terms">قوانین و مقررات</Link>). اگر متوجه شویم حسابی
            متعلق به فردی زیر ۱۶ سال است، آن را حذف می‌کنیم (
            <Link href="/privacy">حریم خصوصی</Link>). اپ موقعیت مکانی شما را
            نمی‌خواهد. حساب را می‌توانید هر وقت خواستید از داخل اپ یا از{" "}
            <Link href="/account/delete">این صفحه</Link> حذف کنید.
          </p>
          <p>
            والدین یا سرپرستان می‌توانند به{" "}
            <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>{" "}
            بنویسند.
          </p>
        </LegalSection>

        <section id="en" dir="ltr" lang="en" className="mt-12 border-t border-[#e8e0d0] pt-8 text-left">
          <h2 className="text-xl font-bold mb-4">In English</h2>
          <p className="mb-3">
            GOPLAZA is a Persian-language directory of Iranian-owned businesses in Canada,
            operated by {company.legalName}.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>
              <strong>Account minimum age: 16</strong>, per our Terms. Browsing and search work
              without an account.
            </li>
            <li>
              <strong>Content:</strong> business listings and articles. A few listings are hookah
              lounges or a restaurant with a wine lounge (infrequent alcohol and tobacco
              references). Some articles cover dental care, mental health and cosmetic-injection
              regulations; they are informational, not medical advice. There is no sexual
              content, violence, gambling or contests.
            </li>
            <li>
              <strong>User-generated content:</strong> public reviews are moderated before
              publication; job ads publish directly only for verified business owners and are
              queued otherwise; business announcements are posted by the listing&apos;s owner
              without pre-moderation. Every business profile has a &quot;report a problem&quot;
              button that feeds a moderation queue.
            </li>
            <li>
              <strong>No</strong> chat, private messaging, social feed, location access or
              in-app purchases. Paid placements are always labelled «ویژه» (featured).
            </li>
            <li>
              Accounts can be deleted inside the app or at{" "}
              <Link href="/account/delete">goplaza.ca/account/delete</Link>. Contact:{" "}
              <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>.
            </li>
          </ul>
        </section>
      </div>
    </InnerPage>
  );
}
