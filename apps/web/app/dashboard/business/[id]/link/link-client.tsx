// ============================================================================
// Source: app/dashboard/business/[id]/link/link-client.tsx
// Version: 1.0.0 — 2026-08-25
// Why: Enable the page, publish it, copy the address, and choose a custom
//      handle. Everything it claims is backed by state the server returned —
//      the item list is what is actually stored, the handle gate is the real
//      entitlement, and there is no analytics panel here because no analytics
//      have been computed yet.
//
//      The publish switch is disabled while the listing itself is not
//      published, with the reason said out loud. RLS would hide the page
//      anyway; a toggle that flips to "live" and produces nothing a visitor
//      can open is a badge real state does not back.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { bioUrl, bioUrlDisplay, validateHandle } from "@goplaza/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLinkPageForBusiness, setLinkHandle, setLinkPageStatus } from "@/lib/actions/link-page";
import { faNumber as fa } from "@goplaza/core";

export type LinkItemRow = { id: string; kind: string; label_fa: string | null; enabled: boolean; position: number };

type Page = { id: string; handle: string; title: string; status: string; footer_hidden: boolean };

/** Persian digits: the app forces RTL and a Latin numeral mid-sentence reads
 *  as untranslated. */

const KIND_FA: Record<string, string> = {
  phone: "تماس تلفنی",
  whatsapp: "واتساپ",
  directions: "مسیریابی",
  hours: "ساعت کاری",
  instagram: "اینستاگرام",
  telegram: "تلگرام",
  website: "وب‌سایت",
  email: "ایمیل",
  booking: "رزرو نوبت",
  gallery: "گالری تصاویر",
  custom: "لینک دلخواه",
};

export function LinkPageClient({
  businessId,
  businessPublic,
  page,
  items,
  pro,
  customLinkLimit,
}: {
  businessId: string;
  businessPublic: boolean;
  page: Page | null;
  items: LinkItemRow[];
  pro: boolean;
  /** `null` = unlimited. */
  customLinkLimit: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [handleDraft, setHandleDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const live = page?.status === "live";

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(result.error ?? "ناموفق بود.");
      }
    });

  if (!page) {
    return (
      <div className="mt-8 rounded-2xl border border-[color:var(--line)] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--annabi)]/10 text-[color:var(--annabi)]">
          <Link2 size={26} />
        </div>
        <h2 className="text-lg font-black text-[color:var(--text)]">هنوز صفحه‌ی لینک نداری</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--muted-text)]">
          با یک کلیک ساخته می‌شود و از همین حالا کامل است — تلفن، واتساپ، مسیریابی و ساعت کاری از روی همین
          پروفایل. بعد می‌توانی منتشرش کنی.
        </p>
        <Button
          className="mt-6 h-11 rounded-xl px-6"
          disabled={pending}
          onClick={() => run(() => createLinkPageForBusiness(businessId), "صفحه‌ی لینک ساخته شد.")}
        >
          {pending ? <Loader2 className="animate-spin" size={16} /> : null} صفحه‌ی لینک را بساز
        </Button>
      </div>
    );
  }

  const url = bioUrl(page.handle);

  return (
    <div className="mt-8 space-y-5">
      {/* Address */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-[color:var(--text)]">آدرس صفحه</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code dir="ltr" className="flex-1 rounded-xl bg-[color:var(--bg)] px-3 py-2.5 text-sm font-bold">
            {bioUrlDisplay(page.handle)}
          </code>
          <Button
            variant="muted"
            className="h-10 gap-1.5 rounded-xl"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              toast.success("کپی شد.");
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} کپی
          </Button>
          {live && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button variant="muted" className="h-10 gap-1.5 rounded-xl">
                <ExternalLink size={15} /> بازکردن
              </Button>
            </a>
          )}
        </div>

        <div className="mt-4 border-t border-[color:var(--line)] pt-4">
          {pro ? (
            <>
              <label className="text-xs font-bold text-[color:var(--muted-text)]">آدرس دلخواه</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  dir="ltr"
                  value={handleDraft}
                  onChange={(e) => setHandleDraft(e.target.value)}
                  placeholder={page.handle}
                  className="h-10 flex-1 rounded-xl"
                />
                <Button
                  variant="muted"
                  className="h-10 rounded-xl"
                  disabled={pending || !handleDraft.trim()}
                  onClick={() => {
                    // Checked here only so the message is instant. The server
                    // checks again, and the database has the final say on
                    // whether the name is free.
                    const check = validateHandle(handleDraft);
                    if (!check.ok) return toast.error(check.message);
                    run(() => setLinkHandle(page.id, handleDraft), "آدرس ثبت شد.");
                  }}
                >
                  ثبت
                </Button>
              </div>
              <p className="mt-2 text-xs text-[color:var(--muted-text)]">
                حروف انگلیسی کوچک، عدد و خط تیره — بین ۳ تا ۳۰ کاراکتر.
              </p>
            </>
          ) : (
            <p className="text-xs leading-6 text-[color:var(--muted-text)]">
              آدرس فعلی خودکار ساخته شده. برای انتخاب آدرس دلخواه — چیزی که بشود روی کارت ویزیت چاپ کرد — به
              «لینک حرفه‌ای» یا هر پلن پولی نیاز داری.
            </p>
          )}
        </div>
      </section>

      {/* Publish */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[color:var(--text)]">{live ? "منتشر شده" : "پیش‌نویس"}</h2>
            <p className="mt-1 text-xs text-[color:var(--muted-text)]">
              {live ? "هر کسی با این آدرس صفحه را می‌بیند." : "فقط تو می‌بینی. تا منتشر نکنی، برای بقیه باز نمی‌شود."}
            </p>
          </div>
          <Button
            variant={live ? "muted" : "solid"}
            className="h-10 rounded-xl"
            disabled={pending || (!live && !businessPublic)}
            onClick={() => run(() => setLinkPageStatus(page.id, !live), live ? "به پیش‌نویس برگشت." : "منتشر شد.")}
          >
            {live ? "برگرداندن به پیش‌نویس" : "انتشار"}
          </Button>
        </div>
        {!businessPublic && !live && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
            تا وقتی خودِ آگهی کسب‌وکار منتشر نشده، صفحه‌ی لینک هم برای بازدیدکننده باز نمی‌شود — پس فعلاً قابل
            انتشار نیست.
          </p>
        )}
      </section>

      {/* What is on it */}
      <section className="rounded-2xl border border-[color:var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-[color:var(--text)]">روی صفحه چه چیزی هست</h2>
        <p className="mt-1 text-xs leading-6 text-[color:var(--muted-text)]">
          این‌ها از پروفایل خوانده می‌شوند، نه کپی. شماره‌ات را که عوض کنی، این صفحه هم عوض می‌شود.
        </p>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--muted-text)]">
            هیچ موردی ساخته نشد — یعنی در پروفایل هنوز تلفن، واتساپ، آدرس یا ساعت کاری ثبت نکرده‌ای.
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-[color:var(--bg)] px-3 py-2.5 text-sm"
              >
                <span className="font-bold text-[color:var(--text)]">
                  {item.label_fa ?? KIND_FA[item.kind] ?? item.kind}
                </span>
                {!item.enabled && <span className="text-xs text-[color:var(--muted-text)]">غیرفعال</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs leading-6 text-[color:var(--muted-text)]">
          ترتیب دادن و افزودن لینک دلخواه هنوز ساخته نشده.
          {customLinkLimit !== null && ` وقتی آمد، در پلن فعلی تا ${fa(customLinkLimit)} لینک دلخواه می‌توانی اضافه کنی.`}
        </p>
      </section>
    </div>
  );
}
