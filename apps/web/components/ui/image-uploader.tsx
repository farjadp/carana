// ============================================================================
// Source: components/ui/image-uploader.tsx
// Version: 1.0.0 — 2026-08-13
// Why: Component to handle file selection and direct upload to Supabase Storage.
// Env / Identity: Client Component
// ============================================================================
"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  bucketName?: string;
  folderPath?: string;
  maxSizeMB?: number;
  label?: string;
}

export function ImageUploader({ 
  value, 
  onChange, 
  bucketName = "businesses", 
  folderPath = "uploads",
  maxSizeMB = 5,
  label = "آپلود تصویر"
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد.`);
      return;
    }
    
    if (!file.type.startsWith("image/")) {
      setError("لطفاً فقط فایل تصویری انتخاب کنید.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${folderPath}/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      
    } catch (err: any) {
      console.error("Upload Error:", err);
      if (err?.message?.includes("Bucket not found") || err?.error === "Bucket not found") {
        setError("باکت Supabase Storage یافت نشد. لطفاً اسکریپت 20260813_storage_buckets.sql را در Supabase اجرا کنید یا آدرس مستقیم (URL) را وارد نمایید.");
      } else {
        setError(err.message || "خطا در آپلود تصویر. لطفاً مجدداً تلاش کنید.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset input
      }
    }
  };

  const [showUrlInput, setShowUrlInput] = useState(false);

  return (
    <div className="w-full space-y-2">
      <div 
        className={`relative flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-xl overflow-hidden transition-colors ${
          isUploading ? "bg-gray-50 border-gray-200" : "bg-gray-50 hover:bg-gray-100 border-gray-300 cursor-pointer"
        }`}
        onClick={() => !isUploading && !showUrlInput && fileInputRef.current?.click()}
      >
        {isUploading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-[color:var(--lajvard)] animate-spin mb-2" />
            <span className="text-sm font-medium text-[color:var(--text)]">در حال آپلود...</span>
          </div>
        )}

        {value ? (
          <div className="relative w-full h-full group">
            <img src={value} alt="Uploaded" className="w-full h-full object-cover max-h-[250px]" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition transform hover:scale-110"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-bold text-[color:var(--text)] mb-1">{label}</p>
            <p className="text-xs text-[color:var(--muted-text)]">
              برای انتخاب عکس کلیک کنید. (حداکثر {maxSizeMB}MB)
            </p>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      {/* Alternative URL Input Field */}
      <div className="flex items-center justify-between text-xs pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-blue-600 hover:underline font-medium"
        >
          {showUrlInput ? "بستن فرم لینک" : "یا درج لینک مستقیم عکس (URL)"}
        </button>
      </div>

      {showUrlInput && (
        <div className="pt-1 flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs dir-ltr focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}
      
      {error && (
        <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
