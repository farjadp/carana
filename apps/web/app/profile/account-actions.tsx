// ============================================================================
// Source: app/profile/account-actions.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The three things you do to the account itself rather than to what is
//      in it: change the password, sign out, delete. Kept at the foot of the
//      profile in muted type — they are rare, and one of them is permanent.
//
//      v1 of the profile put «تغییر رمز عبور» inside the save form as a red
//      ghost button next to «ذخیره اطلاعات», so the destructive-looking
//      control and the routine one sat a thumb apart.
// Env / Identity: Client. The reset action re-reads the session server-side.
// ============================================================================
"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, LogOut, UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { sendPasswordResetEmail } from "./actions";

export function AccountActions() {
  const [sending, setSending] = useState(false);

  return (
    <section className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[color:var(--line)] pt-6 text-xs">
      <button
        type="button"
        disabled={sending}
        onClick={async () => {
          setSending(true);
          const res = await sendPasswordResetEmail();
          // The message says what happened, not what we hope happened: the
          // link is emailed, it is not a password change on its own.
          if (res.success) toast.success("لینک تغییر رمز به ایمیلت فرستاده شد.");
          else toast.error(res.error ?? "ارسال ایمیل ناموفق بود.");
          setSending(false);
        }}
        className="inline-flex items-center gap-1.5 font-bold text-[color:var(--muted-text)] transition hover:text-[color:var(--text)] disabled:opacity-50"
      >
        {sending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
        تغییر رمز عبور
      </button>

      <form action="/auth/logout" method="post">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 font-bold text-[color:var(--muted-text)] transition hover:text-[color:var(--text)]"
        >
          <LogOut size={13} /> خروج از حساب
        </button>
      </form>

      <Link
        href="/account/delete"
        className="inline-flex items-center gap-1.5 font-bold text-[color:var(--muted-text)] transition hover:text-[color:var(--annabi)]"
      >
        <UserRoundX size={13} /> حذف حساب
      </Link>
    </section>
  );
}
