import { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "گزارش تخلفات | داشبورد ادمین",
};

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">گزارش تخلفات</h1>
        <p className="text-[color:var(--muted-text)]">
          بررسی گزارش‌های ارسال شده توسط کاربران درباره کسب‌وکارها یا محتوای نامناسب.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-bold">هیچ گزارشی ثبت نشده است</h3>
        <p className="text-sm text-muted-foreground mt-1">در حال حاضر گزارش تخلفی برای بررسی وجود ندارد.</p>
      </div>
    </div>
  );
}
