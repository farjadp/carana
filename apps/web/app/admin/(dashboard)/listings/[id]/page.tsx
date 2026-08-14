// ============================================================================
// Source: app/admin/(dashboard)/listings/[id]/page.tsx
// Version: 1.0.0 — 2026-08-13
// Why: Detailed view for admins to review business applications before approving.
// Env / Identity: Server Component.
// ============================================================================
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Phone, Mail, Globe, CheckCircle2, XCircle, Clock, Info, User, ShieldAlert } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateBusinessStatus } from "../actions";

interface ReviewBusinessPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewBusinessPage({ params }: ReviewBusinessPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(`
      *,
      profiles:created_by ( full_name, email, role )
    `)
    .eq("id", id)
    .single();

  if (!business) {
    notFound();
  }

  const profile = Array.isArray(business.profiles) ? business.profiles[0] : business.profiles;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("fa-IR", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "SUBMITTED": return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">در انتظار تایید</span>;
      case "APPROVED": return <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">تایید شده</span>;
      case "PUBLISHED": return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">منتشر شده</span>;
      case "NEEDS_CHANGES": return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">نیازمند اصلاح</span>;
      case "REJECTED": return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">رد شده</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">پیش‌نویس</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/listings"
            className="p-2 rounded-lg bg-white border border-[color:var(--line)] text-[color:var(--muted-text)] hover:bg-gray-50 transition"
          >
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-[color:var(--text)] flex items-center gap-3">
              بررسی پرونده کسب‌وکار
              {getStatusBadge(business.status)}
            </h1>
            <p className="text-sm text-[color:var(--muted-text)] mt-1">
              ثبت شده در: <span dir="ltr">{formatDate(business.created_at)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="admin-panel-card">
            <div className="panel-header px-6 pt-6 flex items-center gap-2 border-b border-[color:var(--line)] pb-4">
              <Info size={18} className="text-[color:var(--lajvard)]" />
              <h2 className="text-lg font-bold">اطلاعات پایه</h2>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">نام فارسی</span>
                  <strong className="text-[color:var(--text)]">{business.name}</strong>
                </div>
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">نام لاتین</span>
                  <strong className="text-[color:var(--text)]" dir="ltr">{business.name_en || "-"}</strong>
                </div>
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">دسته‌بندی</span>
                  <span className="text-[color:var(--text)]">{business.category} {business.sub_category ? `> ${business.sub_category}` : ''}</span>
                </div>
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">سال تاسیس</span>
                  <span className="text-[color:var(--text)]" dir="ltr">{business.established_year || "-"}</span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-dashed border-[color:var(--line)]">
                <span className="block text-xs text-[color:var(--muted-text)] mb-2">توضیح کوتاه (Slogan)</span>
                <p className="text-sm text-[color:var(--text)] bg-gray-50 p-3 rounded-lg border border-gray-100">{business.short_description || "-"}</p>
              </div>

              <div className="pt-4">
                <span className="block text-xs text-[color:var(--muted-text)] mb-2">توضیح کامل</span>
                <p className="text-sm text-[color:var(--text)] leading-relaxed whitespace-pre-wrap">{business.description || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-panel-card">
            <div className="panel-header px-6 pt-6 flex items-center gap-2 border-b border-[color:var(--line)] pb-4">
              <MapPin size={18} className="text-[color:var(--lajvard)]" />
              <h2 className="text-lg font-bold">موقعیت و سرویس‌دهی</h2>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">استان / شهر</span>
                  <strong className="text-[color:var(--text)]">{business.province}, {business.city}</strong>
                </div>
                <div>
                  <span className="block text-xs text-[color:var(--muted-text)] mb-1">محدوده خدمات</span>
                  <span className="text-[color:var(--text)]">{business.service_area || "-"}</span>
                </div>
              </div>
              <div className="pt-2 text-sm">
                <span className="block text-xs text-[color:var(--muted-text)] mb-1">آدرس پستی</span>
                <p className="text-[color:var(--text)]" dir="ltr">{business.address} {business.postal_code}</p>
                {business.is_address_public && <span className="inline-block mt-2 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">قابل نمایش عمومی</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="admin-panel-card border-amber-200 bg-amber-50/20">
            <div className="panel-header px-6 pt-6 flex items-center gap-2 border-b border-amber-100 pb-4">
              <ShieldAlert size={18} className="text-amber-600" />
              <h2 className="text-lg font-bold text-amber-900">جزئیات محرمانه (برای تایید اعتبار)</h2>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-xs text-amber-700/70 mb-1">کد ثبت شرکت (Business Number)</span>
                  <strong className="text-amber-900 font-mono" dir="ltr">{business.business_number || "-"}</strong>
                </div>
                <div>
                  <span className="block text-xs text-amber-700/70 mb-1">لایسنس حرفه‌ای</span>
                  <strong className="text-amber-900">{business.license_info || "-"}</strong>
                </div>
                <div>
                  <span className="block text-xs text-amber-700/70 mb-1">سمت شخص ثبت‌کننده</span>
                  <span className="text-amber-900">{business.ownership_status === "owner" ? "صاحب کسب‌وکار" : "نماینده رسمی"}</span>
                </div>
                <div>
                  <span className="block text-xs text-amber-700/70 mb-1">زبان‌های خدمات</span>
                  <span className="text-amber-900">{(business.languages || []).join("، ")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card className="admin-panel-card">
            <div className="panel-header px-6 pt-6 flex items-center gap-2 border-b border-[color:var(--line)] pb-4">
              <User size={18} className="text-[color:var(--lajvard)]" />
              <h2 className="text-lg font-bold">اطلاعات سازنده</h2>
            </div>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div>
                <span className="block text-xs text-[color:var(--muted-text)] mb-1">نام کامل</span>
                <strong className="text-[color:var(--text)]">{profile?.full_name || "نامشخص"}</strong>
              </div>
              <div>
                <span className="block text-xs text-[color:var(--muted-text)] mb-1">ایمیل</span>
                <strong className="text-[color:var(--text)]">{profile?.email}</strong>
              </div>
              <div className="pt-4 mt-2 border-t border-[color:var(--line)] text-center">
                <Link href={`/admin/users/${business.created_by}`} className="text-xs text-[color:var(--lajvard)] hover:underline font-bold">
                  مشاهده لاگ‌های این کاربر
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="admin-panel-card">
            <div className="panel-header px-6 pt-6 flex items-center gap-2 border-b border-[color:var(--line)] pb-4">
              <Globe size={18} className="text-[color:var(--lajvard)]" />
              <h2 className="text-lg font-bold">ارتباطات</h2>
            </div>
            <CardContent className="pt-6 space-y-3 text-sm">
              {business.phone && (
                <div className="flex items-center gap-3 text-[color:var(--text)]">
                  <Phone size={16} className="text-[color:var(--muted-text)]" />
                  <span dir="ltr">{business.phone}</span>
                </div>
              )}
              {business.contact_email && (
                <div className="flex items-center gap-3 text-[color:var(--text)]">
                  <Mail size={16} className="text-[color:var(--muted-text)]" />
                  <span>{business.contact_email}</span>
                </div>
              )}
              {business.website && (
                <div className="flex items-center gap-3 text-[color:var(--text)]">
                  <Globe size={16} className="text-[color:var(--muted-text)]" />
                  <a href={business.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">{business.website}</a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Bar (Fixed at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[color:var(--line)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="hidden md:block text-sm text-[color:var(--muted-text)]">
            وضعیت فعلی: {getStatusBadge(business.status)}
          </p>
          <div className="flex w-full md:w-auto items-center gap-3">
            <form action={async () => { "use server"; await updateBusinessStatus(business.id, "REJECTED"); }} className="flex-1 md:flex-none">
              <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50 border border-red-200">رد درخواست</Button>
            </form>
            <form action={async () => { "use server"; await updateBusinessStatus(business.id, "NEEDS_CHANGES"); }} className="flex-1 md:flex-none">
              <Button variant="ghost" className="w-full text-amber-700 hover:bg-amber-50 border border-amber-200">درخواست اصلاح</Button>
            </form>
            <form action={async () => { "use server"; await updateBusinessStatus(business.id, "PUBLISHED"); }} className="flex-1 md:flex-none">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                <CheckCircle2 size={16} />
                تایید و انتشار
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
