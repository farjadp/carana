// ============================================================================
// Source: app/admin/(dashboard)/sidebar-nav.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Interactive sidebar nav Client Component to dynamically highlight active admin routes.
// Env / Identity: Client-side navigation rendering.
// ============================================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  FileCheck,
  Settings,
  MessageSquare,
  Activity,
  Layers,
  FileSpreadsheet, Lightbulb, Newspaper } from "lucide-react";

export function AdminSidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "داشبورد اصلی", icon: LayoutDashboard },
    { href: "/admin/claims", label: "درخواست‌های مالکیت (Claims)", icon: FileCheck, badge: "۵" },
    { href: "/admin/listings", label: "مدیریت کسب‌وکارها", icon: Building2 },
    { href: "/admin/listings/import", label: "ایمپورت اکسل (AI)", icon: FileSpreadsheet },
    { href: "/admin/categories", label: "دسته‌بندی‌ها", icon: Layers },
    { href: "/admin/reviews", label: "بررسی نظرات", icon: MessageSquare },
    { href: "/admin/suggestions", label: "پیشنهادها", icon: Lightbulb },
    { href: "/admin/blog", label: "وبلاگ", icon: Newspaper },
    { href: "/admin/users", label: "مدیریت کاربران", icon: Users },
    { href: "/admin/logs", label: "گزارش فعالیت‌ها", icon: Activity },
    { href: "/admin/reports", label: "گزارش تخلفات", icon: ShieldAlert, badge: "۲", badgeDanger: true },
    { href: "/admin/settings", label: "تنظیمات سیستم", icon: Settings },
  ];

  return (
    <nav className="admin-sidebar-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? "is-active" : ""}`}
          >
            <Icon size={18} />
            <span>{item.label}</span>
            {item.badge && (
              <span className={`badge-count ${item.badgeDanger ? "is-danger" : ""}`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
