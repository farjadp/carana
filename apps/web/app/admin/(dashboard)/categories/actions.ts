"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";

export async function saveCategory(formData: FormData) {
  try {
    const user = await requireUser();
    const adminClient = createSupabaseAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
      return { success: false, error: "Unauthorized" };
    }

    const supabase = await createSupabaseServerClient();

    const id = formData.get("id") as string | null;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const icon = formData.get("icon") as string;
    const image_url = formData.get("image_url") as string;
    const description = formData.get("description") as string;
    const display_order = parseInt(formData.get("display_order") as string) || 0;
    const is_active = formData.get("is_active") === "on";

    const payload = {
      name,
      slug,
      icon,
      image_url,
      description,
      display_order,
      is_active
    };

    if (id) {
      // Update
      const { error } = await supabase.from("categories").update(payload).eq("id", id);
      if (error) return { success: false, error: error.message };
    } else {
      // Insert
      const { error } = await supabase.from("categories").insert(payload);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/admin/categories");
    revalidatePath("/");
    revalidatePath("/categories");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Server Error" };
  }
}
