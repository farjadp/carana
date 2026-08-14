// ============================================================================
// Source: app/admin/(dashboard)/page.tsx
// Version: 1.1.0 — 2026-08-12
// Why: Render the dashboard content inside the shared admin layout wrapper.
// Env / Identity: Static admin dashboard metrics and mockup claims verification queue.
// ============================================================================
import {
  Building2,
  Users,
  Layers,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  let businessesCount = 0;
  let usersCount = 0;
  let categoriesCount = 0;

  try {
    const [{ count: bCount }, { count: uCount }, { count: cCount }] = await Promise.all([
      supabase.from("businesses").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("categories").select("*", { count: "exact", head: true })
    ]);
    businessesCount = bCount || 0;
    usersCount = uCount || 0;
    categoriesCount = cCount || 0;
  } catch (e) {
    console.error("Error fetching admin stats:", e);
  }

  return (
    <>
      {/* Stats Overview */}
      <div className="admin-stats-grid">
        <Card className="admin-stat-card">
          <CardContent>
            <div className="stat-header">
              <span>کل کسب‌وکارها</span>
              <Building2 size={20} className="text-lajvard" />
            </div>
            <div className="stat-value">{businessesCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card">
          <CardContent>
            <div className="stat-header">
              <span>دسته‌بندی‌های سیستم</span>
              <Layers size={20} className="text-mesi" />
            </div>
            <div className="stat-value">{categoriesCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="admin-stat-card">
          <CardContent>
            <div className="stat-header">
              <span>کاربران عضو</span>
              <Users size={20} className="text-firouzeh" />
            </div>
            <div className="stat-value">{usersCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Panels */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Layers size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">مدیریت دسته‌بندی‌ها</h2>
                  <p className="text-gray-500 text-sm mt-1">ویرایش، افزودن یا حذف دسته‌بندی‌ها و تصاویر هوش مصنوعی</p>
                </div>
              </div>
              <Link 
                href="/admin/categories" 
                className="mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>ورود به بخش دسته‌بندی‌ها</span>
                <ArrowLeft size={16} />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
