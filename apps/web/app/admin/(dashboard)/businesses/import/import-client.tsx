"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { CATEGORY_DETAILS } from "@/lib/data/category-details";

interface ParsedBusiness {
  name: string;
  description: string;
  category: string;
  sub_category?: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  logo_url: string;
  social_media: Record<string, string>;
  original_category: string;
}

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedBusiness[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");

  // Simple CSV parser for basic Excel CSVs
  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex to split by comma but ignore commas inside quotes
      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) => v.trim().replace(/^"|"$/g, ""));
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      data.push(obj);
    }
    return data;
  };

  const handleFileProcess = async () => {
    if (!file) return;
    setIsParsing(true);
    try {
      const text = await file.text();
      const rawData = parseCSV(text);
      
      if (rawData.length === 0) {
        toast.error("فایل خالی است یا فرمت آن صحیح نیست.");
        setIsParsing(false);
        return;
      }

      // Map raw data to our business format
      const businesses: ParsedBusiness[] = rawData.map((row) => ({
        name: row["عنوان"] || row["title"] || row["name"] || "",
        description: row["توضیحات"] || row["description"] || "",
        city: row["شهر"] || row["city"] || "",
        address: row["آدرس"] || row["address"] || "",
        phone: row["تلفن"] || row["phone"] || "",
        website: row["وب‌سایت"] || row["لینک"] || row["website"] || "",
        email: row["ایمیل"] || row["email"] || "",
        logo_url: row["لوگو"] || row["logo"] || "",
        social_media: (row["شبکه‌های اجتماعی"]
          ? { link: row["شبکه‌های اجتماعی"] }
          : {}) as Record<string, string>,
        original_category: row["دسته‌بندی"] || row["category"] || "",
        category: "", // to be filled by AI
        sub_category: "", // to be filled by AI
      })).filter((b) => b.name);

      setParsedData(businesses);
      setStep("preview");
      
      // Automatically trigger AI categorization
      handleAiCategorization(businesses);
    } catch (e) {
      toast.error("خطا در پردازش فایل");
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleAiCategorization = async (dataToCategorize: ParsedBusiness[]) => {
    setIsCategorizing(true);
    try {
      const response = await fetch("/api/admin/businesses/ai-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businesses: dataToCategorize }),
      });

      if (!response.ok) throw new Error("API failed");
      const { results } = await response.json();

      setParsedData((prev) => {
        const newData = [...prev];
        results.forEach((res: any) => {
          if (newData[res.rowId]) {
            newData[res.rowId].category = res.category;
            newData[res.rowId].sub_category = res.sub_category;
          }
        });
        return newData;
      });
      toast.success("دسته‌بندی توسط هوش مصنوعی انجام شد.");
    } catch (error) {
      toast.error("خطا در ارتباط با هوش مصنوعی برای دسته‌بندی.");
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/businesses/bulk-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businesses: parsedData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }

      toast.success("کسب‌وکارها با موفقیت ذخیره شدند.");
      setStep("done");
    } catch (error: any) {
      toast.error("خطا در ذخیره‌سازی: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (slug: string) => {
    return CATEGORY_DETAILS[slug]?.name || slug;
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/20">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">عملیات با موفقیت انجام شد</h2>
        <p className="text-muted-foreground mb-6">تمام کسب‌وکارها در سیستم ثبت شدند.</p>
        <Button onClick={() => { setFile(null); setStep("upload"); setParsedData([]); }}>
          وارد کردن فایل جدید
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/20">
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">آپلود فایل اکسل (CSV)</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            لطفاً فایل خود را با فرمت CSV انتخاب کنید. سیستم به صورت خودکار ستون‌ها را می‌خواند.
          </p>
          <div className="flex items-center gap-4">
            <Input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="max-w-xs"
            />
            <Button onClick={handleFileProcess} disabled={!file || isParsing}>
              {isParsing && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              پردازش فایل
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">پیش‌نمایش داده‌ها ({parsedData.length} مورد)</h3>
            <div className="flex items-center gap-2">
              <Button variant="muted" onClick={() => setStep("upload")}>بازگشت</Button>
              <Button onClick={handleSave} disabled={isSaving || isCategorizing}>
                {isSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                ذخیره در دیتابیس
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3">عنوان</th>
                  <th className="p-3">شهر</th>
                  <th className="p-3">توضیحات</th>
                  <th className="p-3">دسته بندی (اصلی فایل)</th>
                  <th className="p-3">تشخیص هوش مصنوعی</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parsedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3">{row.city}</td>
                    <td className="p-3 max-w-xs truncate" title={row.description}>{row.description}</td>
                    <td className="p-3 text-muted-foreground">{row.original_category}</td>
                    <td className="p-3">
                      {isCategorizing ? (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="w-3 h-3 ml-2 animate-spin" />
                          در حال بررسی...
                        </div>
                      ) : (
                        <div>
                          {row.category ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {getCategoryName(row.category)} {row.sub_category && ` > ${row.sub_category}`}
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs">یافت نشد</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
