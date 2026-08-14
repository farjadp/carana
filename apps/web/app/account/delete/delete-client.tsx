// ============================================================================
// Source: app/account/delete/delete-client.tsx
// Version: 1.0.0 — 2026-08-22
// Why: Confirmation UI for irreversible account deletion.
// ============================================================================
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteOwnAccount } from "./actions";

export function DeleteAccountClient({ email }: { email: string }) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const result = await deleteOwnAccount(confirmation);

    if (result.success) {
      setDone(true);
      setTimeout(() => router.replace("/"), 2500);
      return;
    }

    setError(result.error ?? "خطایی رخ داد.");
    setBusy(false);
  }

  if (done) {
    return (
      <div className="delete-account-done">
        <h2>حساب شما حذف شد</h2>
        <p>
          اطلاعات شخصی، یادداشت‌ها و نظرات شما پاک شدند. در حال انتقال به صفحه‌ی
          اصلی…
        </p>
      </div>
    );
  }

  return (
    <div className="delete-account-card">
      <div className="delete-account-warning">
        <AlertTriangle size={20} />
        <div>
          <strong>این کار برگشت‌پذیر نیست.</strong>
          <p>حساب <bdi>{email}</bdi> و همه‌ی موارد زیر برای همیشه حذف می‌شوند:</p>
        </div>
      </div>

      <ul className="plain-list">
        <li>پروفایل و اطلاعات شخصی شما</li>
        <li>یادداشت‌های خصوصی، امتیازها و فهرست نشان‌شده‌ها</li>
        <li>فایل‌ها و تصاویری که آپلود کرده‌اید</li>
        <li>نظرات عمومی که ثبت کرده‌اید</li>
      </ul>

      <p className="delete-account-note">
        اگر کسب‌وکاری ثبت کرده‌اید، لیستینگ آن از نمایش عمومی خارج می‌شود. برای
        انتقال مالکیت لیستینگ به شخص دیگر، پیش از حذف حساب با پشتیبانی تماس
        بگیرید.
      </p>

      <form onSubmit={handleDelete} className="delete-account-form">
        <label htmlFor="confirm">
          برای تایید، عبارت <code>DELETE</code> را وارد کنید
        </label>
        <Input
          id="confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="DELETE"
          dir="ltr"
          autoComplete="off"
          required
        />

        {error ? <div className="auth-alert is-error">{error}</div> : null}

        <Button
          type="submit"
          disabled={busy || confirmation.trim().toLowerCase() !== "delete"}
          className="delete-account-btn"
        >
          {busy ? <Loader2 className="animate-spin" size={18} /> : "حذف دائمی حساب کاربری"}
        </Button>
      </form>
    </div>
  );
}
