import { Metadata } from "next";
import { ImportClient } from "./import-client";

export const metadata: Metadata = {
  title: "Import Businesses",
  description: "Bulk import and categorize businesses via CSV",
};

export default function ImportBusinessesPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">وارد کردن کسب‌وکارها (Import)</h1>
        <p className="text-muted-foreground mt-2">
          فایل اکسل (CSV) خود را آپلود کنید تا با کمک هوش مصنوعی دسته‌بندی شوند.
        </p>
      </div>
      <ImportClient />
    </div>
  );
}
