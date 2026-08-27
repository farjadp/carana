// ============================================================================
// Source: app/profile/contacts-form.tsx
// Version: 1.0.0 — 2026-08-26
// Why: «راه‌های تماس بیشتر» — up to two more emails and two more phone
//      numbers next to the account email and the profile's mobile number.
//
//      TWO SENTENCES HERE ARE NOT DECORATION. These addresses cannot sign you
//      in (Supabase Auth holds exactly one email per account) and nothing
//      verifies them. Both are said in the panel, because a field labelled
//      «ایمیل دوم» that silently does neither is the same class of thing as a
//      badge nothing backs — and this app has shipped that class before.
//
//      The account's own email and mobile are rendered as the first, locked
//      row of each list, so the count on screen («۱ از ۳») is the truth about
//      what the person has, not about what this table happens to hold.
// Env / Identity: client component; every write goes through the server
//      actions, which re-read the session.
// ============================================================================
"use client";

import { useState, useTransition } from "react";
import { AtSign, Loader2, Lock, Phone, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import {
  CONTACT_LABEL_MAX,
  MAX_EXTRA_CONTACTS,
  normalizeContactValue,
  toLatinDigits,
  type ContactKind,
} from "@goplaza/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { addProfileContact, removeProfileContact, type ContactRow } from "./contacts-actions";
import { faNumber as fa } from "@goplaza/core";


/** Everything that differs between the two lists, in one place. */
type KindMeta = {
  icon: LucideIcon;
  title: string;
  addLabel: string;
  placeholder: string;
  labelPlaceholder: string;
  inputType: "email" | "tel";
  primaryHint: string;
};

const KIND: Record<ContactKind, KindMeta> = {
  email: {
    icon: AtSign,
    title: "ایمیل‌ها",
    addLabel: "افزودن ایمیل",
    placeholder: "name@domain.com",
    labelPlaceholder: "برچسب — مثلاً کاری",
    inputType: "email",
    primaryHint: "ایمیل حساب — با همین وارد می‌شوی",
  },
  phone: {
    icon: Phone,
    title: "شماره‌های تماس",
    addLabel: "افزودن شماره",
    placeholder: "+1 416 123 4567",
    labelPlaceholder: "برچسب — مثلاً خانه",
    inputType: "tel",
    primaryHint: "شماره‌ی موبایل پروفایل",
  },
};

export function ContactsForm({
  contacts,
  accountEmail,
  mobileNumber,
}: {
  contacts: ContactRow[];
  accountEmail: string;
  /** profiles.mobile_number — the primary number, edited in the form above. */
  mobileNumber: string | null;
}) {
  return (
    <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6" dir="rtl">
      <div className="mb-2 border-b border-[color:var(--line)] pb-4">
        <h2 className="text-lg font-black text-[color:var(--text)]">راه‌های تماس بیشتر</h2>
        {/* The old sentence promised «تا ۳ ایمیل و ۳ شماره» flat. That is only
            true when the profile HAS a mobile number: the extra rows are
            capped at two per kind, so someone with no mobile number reached
            «۲ از ۳» and was told they were at the cap. Say the rule instead of
            the best case. */}
        <p className="mt-1 text-xs leading-6 text-[color:var(--muted-text)]">
          ایمیل حساب و شماره‌ی موبایل پروفایل، به‌علاوه‌ی حداکثر{" "}
          {fa(MAX_EXTRA_CONTACTS)} ایمیل و {fa(MAX_EXTRA_CONTACTS)} شماره‌ی دیگر. این‌ها فقط راه
          تماس‌اند: <b className="text-[color:var(--text)]">با آن‌ها نمی‌شود وارد حساب شد</b> و
          هیچ‌کدام تأیید نمی‌شوند. ورود و بازیابی رمز همیشه از ایمیل حساب انجام می‌شود.
        </p>
      </div>

      <ContactList
        kind="email"
        primary={accountEmail}
        rows={contacts.filter((c) => c.kind === "email")}
      />
      <ContactList
        kind="phone"
        primary={mobileNumber}
        rows={contacts.filter((c) => c.kind === "phone")}
      />
    </section>
  );
}

function ContactList({
  kind,
  primary,
  rows,
}: {
  kind: ContactKind;
  primary: string | null;
  rows: ContactRow[];
}) {
  const meta = KIND[kind];
  const Icon = meta.icon;

  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  // The denominator is what THIS person can actually reach, not the best
  // case: two extras plus the account's own row when it has one. Printing a 3
  // that the cap refuses is the same defect as any other unbacked number.
  const capacity = (primary ? 1 : 0) + MAX_EXTRA_CONTACTS;
  const used = (primary ? 1 : 0) + rows.length;
  const full = rows.length >= MAX_EXTRA_CONTACTS;

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const check = normalizeContactValue(kind, value);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    const data = new FormData();
    data.set("kind", kind);
    data.set("value", check.value);
    data.set("label", label);

    startTransition(async () => {
      const res = await addProfileContact(data);
      if (res.success) {
        toast.success("اضافه شد.");
        setValue("");
        setLabel("");
        setAdding(false);
      } else {
        toast.error(res.error ?? "اضافه نشد.");
      }
    });
  };

  const remove = (row: ContactRow) => {
    startTransition(async () => {
      const res = await removeProfileContact(row.id);
      if (res.success) toast.success("حذف شد.");
      else toast.error(res.error ?? "حذف نشد.");
    });
  };

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <Label className="flex items-center gap-1.5 font-bold">
          <Icon size={15} /> {meta.title}
        </Label>
        <span className="text-[11px] text-[color:var(--muted-text)]">
          {fa(used)} از {fa(capacity)}
        </span>
      </div>

      <ul className="space-y-2">
        {/* The account's own value, shown but not editable here. Without it
            the count above would be counting the wrong thing. */}
        {primary ? (
          <li className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg)] px-3 py-2.5">
            <Lock size={13} className="shrink-0 text-[color:var(--muted-text)]" />
            <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-sm">
              {primary}
            </span>
            <span className="shrink-0 text-[10px] text-[color:var(--muted-text)]">
              {meta.primaryHint}
            </span>
          </li>
        ) : null}

        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] px-3 py-2"
          >
            <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-sm">
              {row.value}
            </span>
            {row.label ? (
              <span className="shrink-0 rounded-full bg-[color:var(--bg)] px-2 py-0.5 text-[10px] text-[color:var(--muted-text)]">
                {row.label}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => remove(row)}
              disabled={pending}
              aria-label={`حذف ${row.value}`}
              className="shrink-0 rounded-lg p-1.5 text-[color:var(--muted-text)] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      {/* Without a mobile number on the profile this list tops out at two, and
          the way to a third is a field further up the page — so name it. */}
      {kind === "phone" && !primary ? (
        <p className="mt-2 text-[11px] leading-6 text-[color:var(--muted-text)]">
          شماره‌ی موبایل اصلی‌ات را در «اطلاعات من» بالاتر بنویس تا یکی به این‌ها اضافه شود.
        </p>
      ) : null}

      {adding ? (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            type={meta.inputType}
            value={value}
            // Phones fold as they are typed, so the box shows what will be
            // stored rather than changing under the person on save.
            onChange={(e) => setValue(kind === "phone" ? toLatinDigits(e.target.value) : e.target.value)}
            placeholder={meta.placeholder}
            dir="ltr"
            className="h-11 min-w-[200px] flex-1 rounded-xl text-left"
          />
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, CONTACT_LABEL_MAX))}
            placeholder={meta.labelPlaceholder}
            maxLength={CONTACT_LABEL_MAX}
            className="h-11 w-40 rounded-xl"
          />
          <Button type="submit" disabled={pending} className="h-11 gap-2 rounded-xl px-5">
            {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            ذخیره
          </Button>
          <Button
            type="button"
            variant="muted"
            className="h-11 rounded-xl px-4"
            onClick={() => {
              setAdding(false);
              setValue("");
              setLabel("");
            }}
          >
            انصراف
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={full}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[color:var(--line)] px-3 py-2 text-xs font-bold text-[color:var(--text)] transition hover:border-[color:var(--lajvard)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} />
          {full ? "به سقف رسیده‌ای" : meta.addLabel}
        </button>
      )}
    </div>
  );
}
