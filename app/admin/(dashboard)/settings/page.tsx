import { Metadata } from "next";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "تنظیمات سیستم | داشبورد ادمین",
};

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">تنظیمات سیستم</h1>
        <p className="text-[color:var(--muted-text)]">
          پیکربندی عمومی پلتفرم، تنظیمات ایمیل، سئو و دیتابیس.
        </p>
      </div>

      <div className="p-6 border rounded-xl bg-card space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold">تنظیمات عمومی</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          تنظیمات اولیه سیستم فعال است. تمام پارامترها در حالت استاندارد قرار دارند.
        </p>
      </div>
    </div>
  );
}
