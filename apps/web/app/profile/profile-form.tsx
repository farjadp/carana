// ============================================================================
// Source: app/profile/profile-form.tsx
// Version: 2.0.0 — 2026-08-26
// Why: The editable half of the profile.
//
//      Three things changed with the v2 redesign, each for a reason:
//
//      · THE PROGRESS BAR TOLD A LIE. It said completing your profile lets
//        «کسب‌وکارها ارتباط مؤثرتری با شما بگیرند» — businesses cannot
//        contact users at all; there is no such feature and no column that
//        would carry one. A percentage with an invented benefit under it is
//        the same class as a badge nothing backs. It is now a plain count of
//        what is filled, and it NAMES the missing fields instead of implying
//        a reward.
//      · alert() AND confirm() ARE GONE. Every other write in this app
//        reports through sonner; two of them here opened native dialogs that
//        look like the browser, not the product.
//      · PERSIAN DIGITS ARE FOLDED BEFORE SAVE. The app forces RTL and the
//        keyboard opens in Persian, so a phone typed here arrives as
//        «۶۴۷…» with no ASCII digit in it. That has already broken sign-in
//        and verification once — see docs/06-gotchas.md. Folded on the client
//        so the field shows what will be stored, and again on the server,
//        which is the boundary.
// Env / Identity: Client component. The server action re-reads the session.
// ============================================================================
"use client";

import { useState } from "react";
import { Calendar, Loader2, Mail, Phone, Save, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toLatinDigits } from "@/lib/utils/digits";

import { updateUserProfile } from "./actions";

type ProfileRow = {
  full_name?: string | null;
  avatar_url?: string | null;
  mobile_number?: string | null;
  birth_date?: string | null;
  bio?: string | null;
} | null;

/** What "complete" means, named rather than implied by a percentage. */
const FIELDS = [
  { key: "full_name", label: "نام" },
  { key: "avatar_url", label: "تصویر" },
  { key: "mobile_number", label: "موبایل" },
  { key: "birth_date", label: "تاریخ تولد" },
] as const;

const BIO_MAX = 280;

export function ProfileForm({ profile, email }: { profile: ProfileRow; email: string }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    avatar_url: profile?.avatar_url ?? "",
    mobile_number: profile?.mobile_number ?? "",
    birth_date: profile?.birth_date ?? "",
    bio: profile?.bio ?? "",
  });

  const missing = FIELDS.filter((f) => !String(form[f.key] ?? "").trim());
  const filled = FIELDS.length - missing.length;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const data = new FormData(e.currentTarget);
    // ImageUploader keeps its value in state rather than a native input.
    data.set("avatar_url", form.avatar_url);
    const res = await updateUserProfile(data);
    if (res.success) toast.success("ذخیره شد.");
    else toast.error(res.error ?? "ذخیره نشد.");
    setSaving(false);
  };

  const field = "h-11 rounded-xl";

  return (
    <form onSubmit={submit} className="rounded-3xl border border-[color:var(--line)] bg-white p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-[color:var(--line)] pb-4">
        <h2 className="text-lg font-black text-[color:var(--text)]">اطلاعات من</h2>
        <p className="text-xs text-[color:var(--muted-text)]">
          {missing.length === 0 ? (
            "کامل است."
          ) : (
            <>
              {filled.toLocaleString("fa-IR")} از {FIELDS.length.toLocaleString("fa-IR")} — هنوز{" "}
              <span className="font-bold text-[color:var(--text)]">
                {missing.map((m) => m.label).join("، ")}
              </span>{" "}
              را ننوشته‌ای.
            </>
          )}
        </p>
      </div>

      <div className="mb-6 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg)]">
          {form.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={28} className="text-[color:var(--muted-text)]" />
          )}
        </span>
        <div className="flex-1 space-y-2 text-center sm:text-right">
          <Label className="block font-bold">تصویر پروفایل</Label>
          <ImageUploader
            bucketName="avatars"
            onChange={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            label="آپلود تصویر"
            value={form.avatar_url}
          />
          <p className="text-xs text-[color:var(--muted-text)]">حداکثر ۲ مگابایت. PNG یا JPG.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-medium">
            <User size={15} /> نام و نام خانوادگی
          </Label>
          <Input
            name="full_name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="مثال: علی رضایی"
            className={field}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-medium text-[color:var(--muted-text)]">
            <Mail size={15} /> ایمیل
          </Label>
          <Input value={email} readOnly dir="ltr" className={`${field} cursor-not-allowed bg-[color:var(--bg)] text-left`} />
          <p className="text-xs text-[color:var(--muted-text)]">
            ایمیل حساب از این‌جا عوض نمی‌شود. برای تغییرش به پشتیبانی بنویس.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-medium">
            <Phone size={15} /> شماره موبایل
          </Label>
          <Input
            name="mobile_number"
            value={form.mobile_number}
            // Folded as it is typed, so the field shows exactly what gets
            // stored rather than silently changing on save.
            onChange={(e) => setForm((f) => ({ ...f, mobile_number: toLatinDigits(e.target.value) }))}
            placeholder="+1 416 123 4567"
            dir="ltr"
            className={field}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 font-medium">
            <Calendar size={15} /> تاریخ تولد
          </Label>
          <Input
            type="date"
            name="birth_date"
            value={form.birth_date}
            onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
            className={`${field} block w-full`}
          />
        </div>
      </div>

      {/* The `bio` column has existed since the profiles table and nothing has
          ever written to it. It is private today — no public surface reads a
          user bio — and the hint says so rather than letting anyone assume
          otherwise. */}
      <div className="mt-5 space-y-2">
        <Label className="font-medium">درباره‌ی من</Label>
        <Textarea
          name="bio"
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="یک خط درباره‌ی خودت — اختیاری."
          className="rounded-xl"
        />
        <p className="text-xs text-[color:var(--muted-text)]">
          فعلاً در هیچ صفحه‌ی عمومی‌ای نمایش داده نمی‌شود؛ فقط خودت می‌بینی‌اش.{" "}
          {form.bio.length > 0 ? `${form.bio.length.toLocaleString("fa-IR")} از ${BIO_MAX.toLocaleString("fa-IR")}` : null}
        </p>
      </div>

      <div className="mt-6 flex justify-end border-t border-[color:var(--line)] pt-5">
        <Button
          type="submit"
          disabled={saving}
          className="h-11 gap-2 rounded-xl bg-[color:var(--lajvard)] px-8 text-white hover:opacity-90"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          ذخیره
        </Button>
      </div>
    </form>
  );
}
