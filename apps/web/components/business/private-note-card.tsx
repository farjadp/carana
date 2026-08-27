"use client";

import { useEffect, useState } from "react";
import { Lock, FileText, Mic, Video, Image as ImageIcon, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface PrivateNoteCardProps {
  note?: string;
  title?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

export function PrivateNoteCard({ note, title, mediaUrls = [], mediaTypes = [] }: PrivateNoteCardProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(mediaUrls.length > 0);

  useEffect(() => {
    if (mediaUrls.length === 0) return;

    const fetchSignedUrls = async () => {
      const supabase = createSupabaseBrowserClient();
      const urls: Record<string, string> = {};

      for (const url of mediaUrls) {
        // url is like 'user-media/userId/filename.ext'
        const parts = url.split("/");
        if (parts.length >= 3 && parts[0] === "user-media") {
          const path = parts.slice(1).join("/"); // userId/filename.ext
          const { data } = await supabase.storage.from("user-media").createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) {
            urls[url] = data.signedUrl;
          }
        }
      }
      setSignedUrls(urls);
      setIsLoading(false);
    };

    fetchSignedUrls();
  }, [mediaUrls]);

  if (!note && !title && mediaUrls.length === 0) return null;

  return (
    <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r-2xl" />
      
      <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3">
        <Lock size={16} />
        یادداشت خصوصی شما
      </div>

      {title && <h3 className="font-bold text-gray-800 mb-1">{title}</h3>}
      {note && <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note}</p>}

      {mediaUrls.length > 0 && (
        <div className="mt-4 border-t border-emerald-200/50 pt-4">
          <div className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-1">
            <FileText size={14} /> رسانه‌های پیوست شده:
          </div>
          
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 size={14} className="animate-spin" /> در حال بارگذاری رسانه‌ها...
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {mediaUrls.map((url, i) => {
                const type = mediaTypes[i];
                const signedUrl = signedUrls[url];

                if (!signedUrl) return null;

                if (type === "audio") {
                  return (
                    <div key={url} className="w-full sm:w-[300px] bg-white rounded-lg p-2 border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-2 font-bold"><Mic size={14} /> ویس ضبط شده</div>
                      <audio src={signedUrl} controls className="w-full h-8" />
                    </div>
                  );
                }

                if (type === "video") {
                  return (
                    <div key={url} className="w-full sm:w-[300px] bg-white rounded-lg p-2 border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-1 text-xs text-green-600 mb-2 font-bold"><Video size={14} /> ویدئو ضبط شده</div>
                      <video src={signedUrl} controls className="w-full rounded bg-black aspect-video object-cover" />
                    </div>
                  );
                }

                if (type === "image") {
                  return (
                    <div key={url} className="relative group bg-white rounded-lg p-1 border border-emerald-100 shadow-sm">
                      <img loading="lazy" decoding="async" src={signedUrl} alt="پیوست" className="w-24 h-24 object-cover rounded-md" />
                      <div className="absolute top-2 right-2 bg-white/80 rounded p-0.5 text-purple-600 shadow-sm backdrop-blur">
                        <ImageIcon size={12} />
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
