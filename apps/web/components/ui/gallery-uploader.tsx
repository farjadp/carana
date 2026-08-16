// ============================================================================
// Source: components/ui/gallery-uploader.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Multi-photo (+ one video) upload for a business's gallery — the
//      plan-tiered feature (see lib/billing/plans.ts GALLERY_LIMITS): free
//      gets 3 photos, Starter 5 photos + a video, Premium unlimited photos.
//      The limit is passed in and enforced here (upload button disables past
//      it, with an upsell line, never a silent drop) — the caller has
//      already computed it from entitlementsFor, this component doesn't
//      re-derive the plan itself.
// Env / Identity: Client Component.
// ============================================================================
"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud, Video, X } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

async function uploadToStorage(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  file: File,
  folderPath: string
) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  const { error } = await supabase.storage.from("businesses").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("businesses").getPublicUrl(filePath).data.publicUrl;
}

export function GalleryUploader({
  photos,
  onPhotosChange,
  video,
  onVideoChange,
  photoLimit,
  videoAllowed,
  folderPath = "uploads",
  upsellPlanName,
}: {
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  video: string | null;
  onVideoChange: (url: string | null) => void;
  /** `null` = unlimited. */
  photoLimit: number | null;
  videoAllowed: boolean;
  folderPath?: string;
  /** Name of the next plan up, shown in the upsell line once the limit is hit. */
  upsellPlanName?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();

  const atPhotoLimit = photoLimit !== null && photos.length >= photoLimit;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (atPhotoLimit) return; // guarded by disabled input too; belt and suspenders
    if (file.size > 8 * 1024 * 1024) {
      setError("حجم عکس نباید بیشتر از ۸ مگابایت باشد.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("لطفاً فقط فایل تصویری انتخاب کنید.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const url = await uploadToStorage(supabase, file, folderPath);
      onPhotosChange([...photos, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در آپلود عکس.");
    } finally {
      setIsUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("حجم ویدئو نباید بیشتر از ۵۰ مگابایت باشد.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setError("لطفاً فقط فایل ویدئویی انتخاب کنید.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const url = await uploadToStorage(supabase, file, folderPath);
      onVideoChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در آپلود ویدئو.");
    } finally {
      setIsUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-[color:var(--text)]">
            گالری عکس {photoLimit !== null ? `(${photos.length} از ${photoLimit})` : `(${photos.length}، نامحدود)`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onPhotosChange(photos.filter((_, j) => j !== i))}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 size={18} className="text-white" />
              </button>
            </div>
          ))}

          {!atPhotoLimit && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => photoInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:bg-gray-100 disabled:opacity-60"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
              <span className="text-[10px] font-bold">افزودن عکس</span>
            </button>
          )}
        </div>

        {atPhotoLimit && upsellPlanName && (
          <p className="mt-2 text-xs text-[color:var(--muted-text)]">
            به سقف {photoLimit} عکس رسیدی — برای عکس بیشتر به {upsellPlanName} ارتقا بده.
          </p>
        )}

        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      {videoAllowed && (
        <div>
          <p className="mb-2 text-sm font-bold text-[color:var(--text)]">ویدئوی معرفی (یک فایل)</p>
          {video ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <Video size={18} className="shrink-0 text-[color:var(--lajvard)]" />
              <a href={video} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-xs text-[color:var(--lajvard)] underline" dir="ltr">
                {video}
              </a>
              <button type="button" onClick={() => onVideoChange(null)} className="shrink-0 text-gray-400 hover:text-red-600">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => videoInputRef.current?.click()}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:bg-gray-100 disabled:opacity-60"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
              <span className="text-xs font-bold">افزودن ویدئو (حداکثر ۵۰ مگابایت)</span>
            </button>
          )}
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
        </div>
      )}

      {error && <p className="text-xs font-medium leading-relaxed text-red-500">{error}</p>}
    </div>
  );
}
