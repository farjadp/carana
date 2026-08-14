import { Metadata } from "next";
import { ImportClient } from "./import-client";

export const metadata: Metadata = {
  title: "ایمپورت گروهی کسب‌وکارها | داشبورد ادمین",
  description: "آپلود فایل اکسل/CSV و دسته‌بندی هوشمند کسب‌وکارها",
};

export default function ImportListingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[color:var(--text)]">ایمپورت گروهی کسب‌وکارها (AI)</h1>
        <p className="text-[color:var(--muted-text)] mt-2">
          فایل اکسل (CSV) خود را آپلود کنید تا هوش مصنوعی اطلاعات و دسته‌بندی هر کسب‌وکار را بهینه‌سازی کند.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
