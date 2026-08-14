import { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "درخواست‌های مالکیت | داشبورد ادمین",
};

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: claims } = await supabase
    .from("business_claims")
    .select(`
      id,
      status,
      note,
      created_at,
      businesses ( id, name, slug ),
      profiles:user_id ( id, full_name, email )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">درخواست‌های مالکیت کسب‌وکار (Claims)</h1>
        <p className="text-[color:var(--muted-text)]">
          بررسی و تایید درخواست‌های ادعای مالکیت کسب‌وکارها توسط کاربران.
        </p>
      </div>

      {!claims || claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold">هیچ درخواستی ثبت نشده است</h3>
          <p className="text-sm text-muted-foreground mt-1">در حال حاضر هیچ درخواست مالکیتی در انتظار بررسی نیست.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted/80 text-muted-foreground font-medium">
                <tr>
                  <th className="p-3">کسب‌وکار</th>
                  <th className="p-3">متقاضی</th>
                  <th className="p-3">ایمیل</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.map((claim: any) => {
                  const biz = Array.isArray(claim.businesses) ? claim.businesses[0] : claim.businesses;
                  const profile = Array.isArray(claim.profiles) ? claim.profiles[0] : claim.profiles;

                  return (
                    <tr key={claim.id} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-semibold">{biz?.name || "—"}</td>
                      <td className="p-3">{profile?.full_name || "کاربر"}</td>
                      <td className="p-3 text-muted-foreground">{profile?.email || "—"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(claim.created_at).toLocaleDateString("fa-IR")}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          در انتظار بررسی
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
