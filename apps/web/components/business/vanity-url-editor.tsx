// ============================================================================
// Source: components/business/vanity-url-editor.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Owner control for the Premium vanity URL (lib/actions/vanity-url.ts).
//      A lower-plan owner sees the upsell line, never a hidden or disabled
//      field with no explanation.
// Env / Identity: Client Component.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setVanitySlug } from "@/lib/actions/vanity-url";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLANS } from "@/lib/billing/plans";

type Business = { id: string; plan?: string | null; plan_until?: string | null; vanity_slug?: string | null };

export function VanityUrlEditor({ business }: { business: Business }) {
  const [slug, setSlug] = useState(business.vanity_slug ?? "");
  const [saved, setSaved] = useState(business.vanity_slug ?? null);
  const [pending, startTransition] = useTransition();

  if (!entitlementsFor(business).has("vanity_url")) {
    return (
      <p className="text-xs text-[color:var(--muted-text)]">
        آدرس اختصاصی (GoPlaza.ca/b/…) از پلن {PLANS.featured.name} فعال می‌شود.
      </p>
    );
  }

  const save = () => {
    startTransition(async () => {
      const result = await setVanitySlug(business.id, slug.trim() || null);
      if (result.success) {
        setSaved(result.slug ?? null);
        toast.success(result.slug ? "آدرس اختصاصی ثبت شد" : "آدرس اختصاصی حذف شد");
      } else {
        toast.error(result.error || "خطا در ثبت آدرس");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs text-[color:var(--muted-text)]" dir="ltr">GoPlaza.ca/b/</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="dr-ahmadi"
          dir="ltr"
          maxLength={60}
          className="h-10 flex-1 rounded-lg border border-[color:var(--line)] px-3 text-sm outline-none focus:border-[color:var(--lajvard)]"
        />
        <Button type="button" onClick={save} disabled={pending || slug === (saved ?? "")} className="h-10 rounded-lg px-4 text-xs">
          {pending ? "…" : "ذخیره"}
        </Button>
      </div>
      {saved ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[color:var(--success,#0f7b4f)]">
          <Check size={12} /> فعال: <a href={`/b/${saved}`} target="_blank" rel="noreferrer" className="underline underline-offset-4" dir="ltr">GoPlaza.ca/b/{saved}</a>
        </p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[color:var(--muted-text)]">
          <Link2 size={12} /> فقط حروف انگلیسی، عدد و خط تیره
        </p>
      )}
    </div>
  );
}
