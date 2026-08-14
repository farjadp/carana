// ============================================================================
// Source: app/admin/(dashboard)/listings/page.tsx
// Version: 1.0.0 — 2026-08-13
// Why: Admin business listings management page.
// Env / Identity: Server Component.
// ============================================================================
import { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import ListingsClient from "./listings-client";

export const metadata: Metadata = {
  title: "مدیریت کسب‌وکارها | داشبورد ادمین",
};

export default async function AdminListingsPage() {
  const supabase = await createSupabaseServerClient();

  // We order by created_at desc so the newest submissions are at the top
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select(`
      id,
      name,
      name_en,
      category,
      city,
      status,
      created_at,
      created_by,
      profiles ( id, full_name, email )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching businesses:", error);
  }

  // Ensure type match for the client component
  const typedBusinesses = (businesses || []).map(b => ({
    ...b,
    profiles: Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
  })) as any[];

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[color:var(--text)]">مدیریت کسب‌وکارها</h1>
          <p className="text-[color:var(--muted-text)] mt-1">
            در این بخش می‌توانید لیست تمامی کسب‌وکارهای ثبت شده در پلتفرم را بررسی، تایید و مدیریت کنید.
          </p>
        </div>
        <Link
          href="/admin/listings/import"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-sm hover:opacity-90 transition-opacity text-sm shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>ایمپورت گروهی (AI)</span>
        </Link>
      </div>

      <ListingsClient businesses={typedBusinesses} />
    </div>
  );
}
