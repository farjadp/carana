// ============================================================================
// Source: app/categories/page.tsx
// Version: 1.3.0 — 2026-08-12
// Why: Display all active categories dynamically from the database.
// Env / Identity: Server Component.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { InnerPage } from "@/components/inner-page";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  alternates: { canonical: "/categories" },
  title: "دسته‌بندی کسب‌وکارها",
};

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <InnerPage
      currentPath="/categories"
      currentSection="business"
      eyebrow="ساختار دایرکتوری"
      title="دسته‌بندی‌های کسب‌وکارهای ایرانی"
      description="این دایرکتوری طوری طراحی شده است که بتوانید سریع پزشک، وکیل، رستوران، مشاور، فروشگاه یا سرویس موردنیاز خود را در کانادا پیدا کنید."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {categories && categories.map((category, i) => (
          <Link key={category.id} href={`/categories/${category.slug}`} className="group block h-48 md:h-56 rounded-xl overflow-hidden relative shadow-sm hover:shadow-lg transition-all border border-gray-100">
            {category.image_url ? (
              <img
                // The first row is above the fold on a desktop viewport;
                // lazy-loading it would push the page's own LCP candidate
                // behind everything else the browser is fetching.
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                src={category.image_url} 
                alt={category.name} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gray-100" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="text-3xl mb-2 drop-shadow-md">{category.icon}</div>
              <h3 className="font-bold text-lg md:text-xl drop-shadow-md mb-1">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-gray-200 line-clamp-2 drop-shadow-md">{category.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </InnerPage>
  );
}
