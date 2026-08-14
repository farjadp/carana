"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
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

  // Robust CSV parser supporting quotes with commas & newlines
  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        currentRow.push(currentVal.trim());
        if (currentRow.some((field) => field !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }

    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((field) => field !== "")) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) return [];

    const headers = rows[0].map((h) => h.replace(/^"|"$/g, "").trim());
    const data: Array<Record<string, string>> = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = (row[index] || "").replace(/^"|"$/g, "").trim();
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

      // Map raw data to business format
      const businesses: ParsedBusiness[] = rawData
        .map((row) => ({
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
        }))
        .filter((b) => b.name);

      setParsedData(businesses);
      setStep("preview");

      // Trigger AI categorization
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
      toast.success("دسته‌بندی هوشمند با موفقیت انجام شد.");
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

      const res = await response.json();
      toast.success(`${res.count || parsedData.length} کسب‌وکار با موفقیت در دیتابیس ثبت شدند.`);
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
      <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card text-card-foreground shadow-sm">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">ثبت گروهی با موفقیت انجام شد</h2>
        <p className="text-muted-foreground mb-6">تمامی کسب‌وکارها در سیستم ذخیره و منتشر شدند.</p>
        <div className="flex gap-4">
          <Link href="/admin/listings">
            <Button variant="muted">مشاهده لیست کسب‌وکارها</Button>
          </Link>
          <Button onClick={() => { setFile(null); setStep("upload"); setParsedData([]); }}>
            وارد کردن فایل جدید
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step === "upload" && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-card hover:bg-accent/50 transition-colors">
          <FileSpreadsheet className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold mb-2">انتخاب یا درپ فایل اکسل (CSV)</h3>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            فایل متنی CSV حاوی عنوان، شهر، تلفن، آدرس و توضیحات کسب‌وکارها را انتخاب کنید.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="max-w-xs cursor-pointer"
            />
            <Button onClick={handleFileProcess} disabled={!file || isParsing} className="w-full sm:w-auto">
              {isParsing && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              پردازش و استخراج داده‌ها
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-xl bg-card">
            <div>
              <h3 className="text-lg font-bold">پیش‌نمایش داده‌ها ({parsedData.length} کسب‌وکار)</h3>
              <p className="text-sm text-muted-foreground">دسته‌بندی‌ها به طور هوشمند توسط AI تعیین شده‌اند.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="muted" onClick={() => setStep("upload")}>انتخاب فایل دیگر</Button>
              <Button onClick={handleSave} disabled={isSaving || isCategorizing} className="gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                ذخیره در دیتابیس ({parsedData.length})
              </Button>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-muted/80 text-muted-foreground font-medium sticky top-0 bg-background z-10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">عنوان</th>
                    <th className="p-3">شهر</th>
                    <th className="p-3">توضیحات</th>
                    <th className="p-3">دسته فایل اصلی</th>
                    <th className="p-3">دسته‌بندی هوش مصنوعی</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-accent/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{idx + 1}</td>
                      <td className="p-3 font-semibold text-foreground">{row.name}</td>
                      <td className="p-3">{row.city || "—"}</td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground" title={row.description}>{row.description || "—"}</td>
                      <td className="p-3 text-muted-foreground">{row.original_category || "—"}</td>
                      <td className="p-3">
                        {isCategorizing ? (
                          <div className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                            <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                            در حال آنالیز...
                          </div>
                        ) : (
                          <div>
                            {row.category ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {getCategoryName(row.category)} {row.sub_category && ` › ${row.sub_category}`}
                              </span>
                            ) : (
                              <span className="text-rose-500 text-xs font-medium">دسته‌بندی نشد</span>
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
        </div>
      )}
    </div>
  );
}
