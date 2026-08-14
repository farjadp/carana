// ============================================================================
// Source: app/admin/(dashboard)/users/[id]/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Detailed view of a user's activity logs for admins.
// Env / Identity: Server-side rendering, accesses user_activity_logs via admin client (or logged in admin session).
// ============================================================================
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, User, ShieldAlert, Key, Edit, LogIn, UserPlus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityAction } from "@/lib/actions/logs";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch the user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  // Fetch the user's activity logs
  const { data: logs } = await supabase
    .from("user_activity_logs")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionDetails = (action: ActivityAction) => {
    switch (action) {
      case "SIGNUP":
        return { label: "ثبت‌نام", icon: UserPlus, color: "text-blue-500", bg: "bg-blue-50" };
      case "LOGIN":
        return { label: "ورود به سیستم", icon: LogIn, color: "text-green-600", bg: "bg-green-50" };
      case "LOGOUT":
        return { label: "خروج", icon: ArrowRight, color: "text-gray-500", bg: "bg-gray-50" };
      case "ROLE_UPDATE":
        return { label: "تغییر نقش دسترسی", icon: Key, color: "text-purple-600", bg: "bg-purple-50" };
      case "PROFILE_UPDATE":
        return { label: "ویرایش پروفایل", icon: Edit, color: "text-amber-600", bg: "bg-amber-50" };
      case "SECURITY_ALERT":
        return { label: "هشدار امنیتی", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" };
      default:
        return { label: action, icon: User, color: "text-gray-600", bg: "bg-gray-50" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="p-2 rounded-lg bg-white border border-[color:var(--line)] text-[color:var(--muted-text)] hover:bg-gray-50 transition"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text)]">
            تاریخچه فعالیت کاربر
          </h1>
          <p className="text-sm text-[color:var(--muted-text)] mt-1">
            مشاهده سوابق، ورودها و تغییرات مربوط به این حساب کاربری
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Info Sidebar */}
        <div className="md:col-span-1">
          <Card className="admin-panel-card sticky top-32">
            <div className="panel-header px-6 pt-6">
              <h2 className="text-lg font-bold">مشخصات کاربر</h2>
            </div>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div>
                <span className="block text-[color:var(--muted-text)] text-xs mb-1">نام کامل</span>
                <strong className="text-[color:var(--text)]">{profile.full_name || "نامشخص"}</strong>
              </div>
              <div>
                <span className="block text-[color:var(--muted-text)] text-xs mb-1">ایمیل</span>
                <strong className="text-[color:var(--text)]">{profile.email}</strong>
              </div>
              <div>
                <span className="block text-[color:var(--muted-text)] text-xs mb-1">سطح دسترسی</span>
                <span className="inline-block bg-[color:var(--bg)] border border-[color:var(--line)] px-3 py-1 rounded-full font-bold">
                  {profile.role}
                </span>
              </div>
              <div>
                <span className="block text-[color:var(--muted-text)] text-xs mb-1">تاریخ عضویت</span>
                <span className="text-[color:var(--text)]" dir="ltr">{formatDate(profile.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="md:col-span-2">
          <Card className="admin-panel-card">
            <div className="panel-header px-6 pt-6">
              <h2 className="text-lg font-bold">تایم‌لاین رویدادها</h2>
            </div>
            <CardContent className="pt-6">
              {logs && logs.length > 0 ? (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                  {logs.map((log) => {
                    const details = getActionDetails(log.action as ActivityAction);
                    const Icon = details.icon;
                    return (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${details.bg} ${details.color} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2`}>
                          <Icon size={16} />
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[color:var(--line)] bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-bold text-sm ${details.color}`}>{details.label}</h3>
                            <time className="text-xs text-[color:var(--muted-text)]" dir="ltr">
                              {formatDate(log.created_at)}
                            </time>
                          </div>
                          <div className="text-xs text-[color:var(--text)] space-y-2 mt-2">
                            <p>
                              <span className="text-[color:var(--muted-text)] ml-1">آدرس IP:</span>
                              <span className="font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{log.ip_address || "نامشخص"}</span>
                            </p>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="bg-gray-50 p-2 rounded border border-gray-100 mt-2 font-mono text-[10px] text-left" dir="ltr">
                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-[color:var(--muted-text)]">
                  هیچ لاگی برای این کاربر یافت نشد.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
