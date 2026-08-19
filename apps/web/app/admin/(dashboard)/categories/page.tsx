import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CategoriesClient from "./categories-client";

export const metadata: Metadata = {
  title: "مدیریت دسته‌بندی‌ها | پنل مدیریت",
};

export default async function AdminCategoriesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">مدیریت دسته‌بندی‌ها</h1>
        <p className="text-gray-500">لیست دسته‌بندی‌های نمایش داده شده در پلتفرم را مدیریت کنید.</p>
      </div>

      <CategoriesClient initialCategories={categories || []} />
    </div>
  );
}
