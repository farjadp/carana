// ============================================================================
// Source: app/profile/contacts-actions.ts
// Version: 1.0.0 — 2026-08-26
// Why: Add and remove the extra contact rows behind «راه‌های تماس بیشتر».
//      Two emails and two phone numbers at most, on top of the account email
//      and profiles.mobile_number — three of each in total.
//
//      WHAT IS CHECKED HERE, AND WHY EACH CHECK EXISTS:
//      · the value is folded and validated by @goplaza/core, so the app and
//        the site cannot disagree about what may be stored (and so a phone
//        typed on a Persian keyboard is stored as ASCII — that fold has
//        broken sign-in and verification here before);
//      · it is compared against what the profile ALREADY holds, because a
//        "second email" that repeats the account email is not a second one;
//      · the cap is counted here for the message and enforced by the
//        `profile_contacts_cap` trigger for real. RLS lets the browser insert
//        these rows with the user's own token, so a limit that lives only in
//        this file is a limit only for people who use the form.
// Env / Identity: user-scoped client; every row is additionally fenced by RLS
//      to auth.uid(). Never the service key — nothing here needs to escape the
//      caller's own rows.
// ============================================================================
"use server";

import { revalidatePath } from "next/cache";

import {
  CONTACT_KINDS,
  MAX_EXTRA_CONTACTS,
  isSameContact,
  normalizeContactLabel,
  normalizeContactValue,
  type ContactKind,
} from "@goplaza/core";

import { createSupabaseActionClient } from "@/lib/supabase/server";

export type ContactRow = {
  id: string;
  kind: ContactKind;
  value: string;
  label: string | null;
};

type ActionResult = { success: boolean; error?: string };

function isContactKind(value: unknown): value is ContactKind {
  return typeof value === "string" && (CONTACT_KINDS as readonly string[]).includes(value);
}

export async function addProfileContact(formData: FormData): Promise<ActionResult> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "وارد حساب کاربری نیستی." };

  const kind = formData.get("kind");
  if (!isContactKind(kind)) return { success: false, error: "نوع تماس نامعتبر است." };

  const check = normalizeContactValue(kind, String(formData.get("value") ?? ""));
  if (!check.ok) return { success: false, error: check.error };
  const label = normalizeContactLabel(formData.get("label") as string | null);

  // Against the account's own two, which do not live in this table.
  if (kind === "email" && user.email && isSameContact("email", user.email, check.value)) {
    return { success: false, error: "این همان ایمیل حساب توست." };
  }
  if (kind === "phone") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("mobile_number")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.mobile_number && isSameContact("phone", profile.mobile_number, check.value)) {
      return { success: false, error: "این همان شماره‌ی موبایل پروفایل توست." };
    }
  }

  const { count } = await supabase
    .from("profile_contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", kind);

  if ((count ?? 0) >= MAX_EXTRA_CONTACTS) {
    return {
      success: false,
      error:
        kind === "email"
          ? "بیشتر از دو ایمیل اضافه نمی‌شود. یکی را حذف کن."
          : "بیشتر از دو شماره اضافه نمی‌شود. یکی را حذف کن.",
    };
  }

  const { error } = await supabase.from("profile_contacts").insert({
    user_id: user.id,
    kind,
    value: check.value,
    label,
  });

  if (error) {
    // The two failures the database can raise that are the person's business,
    // not ours. Everything else is reported as itself rather than guessed at.
    if (error.code === "23505") return { success: false, error: "این مورد قبلاً ثبت شده است." };
    if (/cap reached/i.test(error.message)) {
      return { success: false, error: "به سقف مجاز رسیده‌ای. یکی را حذف کن." };
    }
    if (/relation .*profile_contacts.* does not exist/i.test(error.message)) {
      return { success: false, error: "این بخش هنوز روی پایگاه داده فعال نشده است." };
    }
    console.error("profile contact insert failed:", error);
    return { success: false, error: "ذخیره نشد: " + error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function removeProfileContact(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "وارد حساب کاربری نیستی." };

  // The user_id filter is belt to RLS's braces: the policy already forbids
  // deleting someone else's row, and this makes it impossible to write a
  // future variant that forgets.
  const { error } = await supabase
    .from("profile_contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("profile contact delete failed:", error);
    return { success: false, error: "حذف نشد." };
  }

  revalidatePath("/profile");
  return { success: true };
}
