// ============================================================================
// Source: app/channels/submit/page.tsx
// Version: 1.0.0 — 2026-08-26
// Why: Anyone signed in may add a channel or a group. Owning a listing is
//      deliberately NOT required: most of these have nothing to do with a
//      business, and requiring one would leave the section empty.
//
//      Sign-in is required, though, and it is the only abuse control that
//      works before a human looks: everything queues, and a rate limit counted
//      in the database bounds how fast one account can fill the queue.
// Env / Identity: Server component; reads the session to decide whether to
//      show the form or the sign-in prompt.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { getOptionalUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { SubmitChannelForm } from "./submit-form";

export const metadata: Metadata = {
  title: "ثبت کانال یا گروه",
  description: "کانال تلگرام یا گروه واتس‌اپ فارسی‌زبان کانادا را در پلازا ثبت کن. رایگان است.",
  alternates: { canonical: "/channels/submit" },
  // A form has nothing to rank for, and an indexed submit page competes with
  // the index it feeds.
  robots: { index: false, follow: true },
};

export default async function SubmitChannelPage() {
  const user = await getOptionalUser();
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("channel_categories")
    .select("slug, name_fa")
    .order("position");

  return (
    <PageShell currentPath="/channels" currentSection="home">
      <main className="page-main">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">
            <Link href="/channels">کانال‌ها و گروه‌ها</Link>
          </p>
          <h1 className="text-3xl font-black leading-tight text-[color:var(--text)]">ثبت کانال یا گروه</h1>
          <p className="mt-3 text-sm leading-8 text-[color:var(--muted-text)]">
            رایگان است و لازم نیست کسب‌وکاری داشته باشی. هر مورد پیش از انتشار به دست یک نفر بررسی
            می‌شود.
          </p>

          {user ? (
            <SubmitChannelForm categories={categories ?? []} />
          ) : (
            <div className="mt-6 rounded-2xl border border-[color:var(--line)] bg-white p-6">
              <h2 className="mb-2 text-lg font-black text-[color:var(--text)]">اول وارد حساب شو</h2>
              <p className="mb-5 text-sm leading-8 text-[color:var(--muted-text)]">
                برای ثبت کانال باید وارد حساب کاربری باشی — این تنها چیزی است که جلوی پر شدن این بخش
                از لینک اسپم را می‌گیرد.
              </p>
              <Link
                href="/auth/login?next=/channels/submit"
                className="inline-flex items-center rounded-xl bg-[color:var(--lajvard)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                ورود یا ثبت‌نام
              </Link>
            </div>
          )}
        </div>
      </main>
    </PageShell>
  );
}
