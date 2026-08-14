// ============================================================================
// Source: app/admin/(dashboard)/layout.tsx
// Version: 1.1.0 — 2026-08-12
// Why: Shared layout shell for all admin dashboard pages, including sidebar and header.
// Env / Identity: Server-side check using admin client to read profile role.
// ============================================================================
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LogOut,
  Bell,
} from "lucide-react";

import { getOptionalUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { AdminSidebarNav } from "./sidebar-nav";



export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/admin/login");
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    redirect("/auth/login?error=unauthorized");
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="brand-mark">č</span>
          <div className="brand-copy">
            <strong>čārana</strong>
            <span>پنل مدیریت و امنیت</span>
          </div>
        </div>

        <AdminSidebarNav />

        <div className="admin-sidebar-footer">
          <form action="/auth/logout" method="post">
            <button type="submit" className="admin-logout-btn">
              <LogOut size={16} />
              <span>خروج از پنل مدیریت</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Top Header */}
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>خلاصه وضعیت سیستم</h1>
            <p>خوش آمدید. امروز ۲۱ مرداد ۱۴۰۵ - مانیتورینگ زنده فعال است.</p>
          </div>

          <div className="admin-header-actions">
            <button className="icon-notification-btn" aria-label="اعلان‌ها">
              <Bell size={20} />
              <span className="notification-dot" />
            </button>
            <div className="admin-user-profile">
              <div className="profile-avatar">مدیر</div>
              <span>مدیریت کل سیستم</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
