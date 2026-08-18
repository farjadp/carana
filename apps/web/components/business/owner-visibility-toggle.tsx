// ============================================================================
// Source: components/business/owner-visibility-toggle.tsx
// Version: 1.0.0 — 2026-08-17
// Why: The owner's view of the public "صاحب کسب‌وکار" section
//      (lib/actions/owner-visibility.ts). Three honest states, never a
//      disabled switch with no explanation:
//        · not verified yet → the section does not exist for anyone, so say
//          that rather than offering a control over nothing;
//        · Free / Starter   → it is shown, and here is what it shows;
//        · Premium          → an actual switch.
// Env / Identity: Client Component. The server action is the gate.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, UserRound } from "lucide-react";
import { toast } from "sonner";

import { setOwnerVisibility } from "@/lib/actions/owner-visibility";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

type Business = {
  id: string;
  plan?: string | null;
  plan_until?: string | null;
  hide_owner?: boolean | null;
  /** Whatever the profile page will actually print, so this is a preview, not a promise. */
  owner_name?: string | null;
  verified?: boolean;
};

export function OwnerVisibilityToggle({ business }: { business: Business }) {
  const [hidden, setHidden] = useState(!!business.hide_owner);
  const [pending, startTransition] = useTransition();
  const entitled = entitlementsFor(business).has("owner_privacy");

  if (!business.verified) {
    return (
      <p className="text-xs leading-relaxed text-[color:var(--muted-text)]">
        این بخش فقط روی آگهی‌های تاییدشده دیده می‌شود. بعد از احراز مالکیت، نام شما
        اینجا قابل تنظیم می‌شود.
      </p>
    );
  }

  if (!business.owner_name?.trim()) {
    return (
      <p className="text-xs leading-relaxed text-[color:var(--muted-text)]">
        نامی روی حساب کاربری‌ات ثبت نشده، پس چیزی برای نمایش نیست. اگر می‌خواهی نامت
        روی این آگهی دیده شود، اول در پروفایل حسابت آن را وارد کن.
      </p>
    );
  }

  const toggle = (next: boolean) => {
    startTransition(async () => {
      const result = await setOwnerVisibility(business.id, next);
      if (result.success) {
        setHidden(next);
        toast.success(next ? "نام شما دیگر روی آگهی دیده نمی‌شود" : "نام شما روی آگهی نمایش داده می‌شود");
      } else {
        toast.error(result.error || "خطا در ذخیره");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--annabi)]/10 text-xs font-black text-[color:var(--annabi)]">
            {business.owner_name.trim()[0]}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[color:var(--text)]">{business.owner_name}</div>
            <div className="flex items-center gap-1 text-[11px] text-[color:var(--muted-text)]">
              {hidden ? <EyeOff size={11} /> : <Eye size={11} />}
              {hidden ? "روی آگهی دیده نمی‌شود" : "روی آگهی دیده می‌شود"}
            </div>
          </div>
        </div>

        {entitled || hidden ? (
          <button
            type="button"
            role="switch"
            aria-checked={!hidden}
            aria-label="نمایش نام صاحب کسب‌وکار روی آگهی"
            disabled={pending}
            onClick={() => toggle(!hidden)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
              hidden ? "bg-[color:var(--line)]" : "bg-[color:var(--annabi)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                hidden ? "right-0.5" : "right-[1.375rem]"
              }`}
            />
          </button>
        ) : null}
      </div>

      {entitled ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[color:var(--muted-text)]">
          <UserRound size={12} /> در پلن {PLANS.featured.name} می‌توانی این را خاموش کنی.
        </p>
      ) : hidden ? (
        // Reachable after a Premium subscription lapses. The switch above stays
        // usable so nobody is locked into hidden, but re-hiding needs the plan
        // again — which the server action enforces regardless of this text.
        <p className="mt-1.5 text-xs text-[color:var(--muted-text)]">
          نام شما پنهان مانده است. اگر روشنش کنی، برای پنهان کردن دوباره به پلن{" "}
          {PLANS.featured.name} نیاز داری.
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-[color:var(--muted-text)]">
          در پلن‌های {PLANS.free.name} و {PLANS.pro.name} نام صاحب کسب‌وکار روی آگهی
          تاییدشده نمایش داده می‌شود. اختیار پنهان کردنش از پلن {PLANS.featured.name}{" "}
          فعال می‌شود.
        </p>
      )}
    </div>
  );
}
