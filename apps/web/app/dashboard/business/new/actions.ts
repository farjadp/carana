// ============================================================================
// Source: app/dashboard/business/new/actions.ts
// Version: 1.0.0 — 2026-08-13
// Why: Server actions to handle saving and submitting business forms safely.
// Env / Identity: Server-side execution, interacts with Supabase using authenticated action client.
// ============================================================================
"use server";

import { createSupabaseActionClient } from "@/lib/supabase/server";
import { finalBusinessSchema } from "@goplaza/core";
import { logUserActivity } from "@/lib/actions/logs";
import { slugify } from "@goplaza/core";

// ----------------------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------------------

/**
 * Creates a unique slug for the business.
 */
async function generateUniqueSlug(supabase: any, name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;

  while (!isUnique) {
    const { data } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
    if (data) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    } else {
      isUnique = true;
    }
  }

  return slug;
}

// ----------------------------------------------------------------------------
// Actions
// ----------------------------------------------------------------------------

/**
 * ذخیره پیش‌نویس (Save Draft)
 * این اکشن فیلدها را بدون سخت‌گیری (Validation) کامل ذخیره می‌کند تا کاربر بتواند بعداً تکمیل کند.
 */
export async function saveBusinessDraft(formData: any, businessId?: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "کاربر وارد نشده است." };
    }

    // Since it's a draft, we don't fully parse with Zod, just a loose structure.
    const slug = await generateUniqueSlug(supabase, formData.name || "draft-business");

    // Sanitize established_year
    const sanitizedData: any = { ...formData };
    if (sanitizedData.established_year === "") {
      sanitizedData.established_year = null;
    } else if (typeof sanitizedData.established_year === "string") {
      sanitizedData.established_year = parseInt(sanitizedData.established_year, 10);
    }

    const payload = {
      ...sanitizedData,
      slug: businessId ? undefined : slug, // Don't override slug if updating
      created_by: user.id,
      status: "DRAFT",
      updated_at: new Date().toISOString(),
    };

    let resultId = businessId;

    if (businessId) {
      const { error } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId)
        .eq("created_by", user.id); // Ensure ownership

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      resultId = data.id;
    }

    // Log the action
    await logUserActivity("PROFILE_UPDATE", { type: "business_draft_saved", business_id: resultId });

    return { success: true, businessId: resultId };
  } catch (error: any) {
    console.error("Save draft error:", error);
    return { success: false, error: error.message || "خطایی رخ داد." };
  }
}

/**
 * ارسال نهایی برای بررسی (Submit for Review)
 * تمامی فیلدها به شدت اعتبارسنجی می‌شوند و وضعیت به SUBMITTED تغییر می‌کند.
 */
export async function submitBusiness(rawFormData: any, businessId?: string) {
  try {
    const supabase = await createSupabaseActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "کاربر وارد نشده است." };
    }

    // Validate strictly with Zod
    const validationResult = finalBusinessSchema.safeParse(rawFormData);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: "اطلاعات فرم ناقص یا نامعتبر است.",
        issues: validationResult.error.flatten().fieldErrors 
      };
    }

    const validData = validationResult.data;
    const slug = await generateUniqueSlug(supabase, validData.name);

    // Sanitize established_year
    const sanitizedData: any = { ...validData };
    if (sanitizedData.established_year === "") {
      sanitizedData.established_year = null;
    } else if (typeof sanitizedData.established_year === "string") {
      sanitizedData.established_year = parseInt(sanitizedData.established_year, 10);
    }

    const payload = {
      ...sanitizedData,
      slug: businessId ? undefined : slug, 
      created_by: user.id,
      status: "SUBMITTED",
      updated_at: new Date().toISOString(),
    };

    let resultId = businessId;

    if (businessId) {
      const { error } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId)
        .eq("created_by", user.id);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      resultId = data.id;
    }

    // Log the submission
    await logUserActivity("PROFILE_UPDATE", { type: "business_submitted", business_id: resultId });

    return { success: true, businessId: resultId };
  } catch (error: any) {
    console.error("Submit business error:", error);
    return { success: false, error: error.message || "خطایی رخ داد." };
  }
}
