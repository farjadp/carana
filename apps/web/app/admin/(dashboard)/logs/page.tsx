// ============================================================================
// Source: app/admin/(dashboard)/logs/page.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Admin panel for viewing user activity logs.
// Env / Identity: Server component, reads user_activity_logs. Requires ADMIN role.
// ============================================================================
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ADMIN_PAGE_SIZE, AdminPagination } from "@/components/admin/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "گزارش فعالیت‌ها | پنل ادمین",
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "ADMIN") {
    redirect("/profile");
  }

  // Paged, 50 at a time. It used to take the newest 100 and stop — which is
  // fine for a glance and useless for an investigation, because there was no
  // way to reach log 101.
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data: logs, error, count } = await supabase
    .from("user_activity_logs")
    .select(`
      id,
      action,
      ip_address,
      metadata,
      created_at,
      profiles (
        email,
        full_name
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);

  if (error) {
    console.error("Error fetching logs:", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">گزارش فعالیت‌ها</h1>
        <p className="text-gray-500">مشاهده لاگ‌های سیستم و فعالیت‌های کاربران (ورود، ثبت‌نام، ویرایش پروفایل)</p>
      </div>

      <Card>
        <div className="p-6 pb-0">
          <h3 className="text-xl font-bold leading-none tracking-tight">لاگ‌های اخیر</h3>
          <p className="text-sm text-gray-500 mt-1">۱۰۰ فعالیت اخیر ثبت شده در سیستم</p>
        </div>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">تاریخ و زمان</TableHead>
                  <TableHead className="text-right">کاربر</TableHead>
                  <TableHead className="text-right">فعالیت</TableHead>
                  <TableHead className="text-right">IP Address</TableHead>
                  <TableHead className="text-right">جزئیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs && logs.length > 0 ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium whitespace-nowrap" dir="ltr" style={{ textAlign: "right" }}>
                        {new Date(log.created_at).toLocaleString("fa-IR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{(log.profiles as any)?.full_name || "کاربر ناشناس"}</span>
                          <span className="text-xs text-gray-500">{(log.profiles as any)?.email || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            log.action === "SIGNUP" ? "outline" :
                            log.action === "LOGIN" ? "secondary" : 
                            log.action === "LOGOUT" ? "outline" : "default"
                          }
                          className={log.action === "SECURITY_ALERT" ? "bg-red-500 text-white" : ""}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right text-gray-500 font-mono text-sm">
                        {log.ip_address}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-gray-500" title={JSON.stringify(log.metadata)}>
                        {JSON.stringify(log.metadata)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      هیچ فعالیتی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <AdminPagination page={page} total={count ?? 0} basePath="/admin/logs" itemLabel="فعالیت" />
        </CardContent>
      </Card>
    </div>
  );
}
