"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Star, FileText, Send, Lock, Globe, X, Loader2, ShieldCheck, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { upsertUserInteraction, submitPublicReview } from "@/lib/actions/interactions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { MediaUploadSection } from "./media-upload-section";

interface InteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  initialInteraction?: any;
}

const RATING_LABELS: Record<number, string> = {
  1: "خیلی ضعیف 😞",
  2: "ضعیف 😐",
  3: "متوسط 🙂",
  4: "خوب 😃",
  5: "فوق‌العاده ⭐",
};

const EMOJIS = ["👍", "❤️", "😊", "🔥", "🎉", "💯", "✅", "🙌", "💡", "✨", "🤔", "👎", "❌"];

export default function InteractionModal({ isOpen, onClose, businessId, initialInteraction }: InteractionModalProps) {
  const [activeTab, setActiveTab] = useState<"private" | "public">("private");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Private State
  const [personalRating, setPersonalRating] = useState<number>(initialInteraction?.personal_rating || 0);
  const [privateTitle, setPrivateTitle] = useState(initialInteraction?.private_title || "");
  const [privateNote, setPrivateNote] = useState(initialInteraction?.private_note || "");
  const [uploadedMedia, setUploadedMedia] = useState<{url: string, type: string}[]>(() => {
    if (initialInteraction?.private_media_urls && initialInteraction?.private_media_types) {
      return initialInteraction.private_media_urls.map((url: string, i: number) => ({
        url,
        type: initialInteraction.private_media_types[i]
      }));
    }
    return [];
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Public State
  const [publicRating, setPublicRating] = useState<number>(0);
  const [publicTitle, setPublicTitle] = useState("");
  const [publicBody, setPublicBody] = useState("");
  const [displayIdentity, setDisplayIdentity] = useState("display_name");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    };
    if (isOpen) fetchUser();
  }, [isOpen]);

  const handleSavePrivate = async () => {
    setIsLoading(true);
    const res = await upsertUserInteraction(businessId, {
      personal_rating: personalRating || null,
      private_title: privateTitle,
      private_note: privateNote,
      private_media_urls: uploadedMedia.map(m => m.url),
      private_media_types: uploadedMedia.map(m => m.type)
    });
    setIsLoading(false);
    if (res.success) {
      toast.success("یادداشت خصوصی با موفقیت ذخیره شد.");
      onClose();
    } else {
      toast.error(res.error || "خطایی رخ داد.");
    }
  };

  const handleSubmitPublic = async () => {
    if (!publicRating) {
      toast.error("لطفاً امتیاز عمومی خود را مشخص کنید.");
      return;
    }
    if (!publicBody || publicBody.length < 10) {
      toast.error("متن نظر عمومی باید حداقل ۱۰ کاراکتر باشد.");
      return;
    }
    setIsLoading(true);
    const res = await submitPublicReview(businessId, {
      public_title: publicTitle,
      public_body: publicBody,
      public_rating: publicRating,
      display_identity: displayIdentity as any,
    });
    setIsLoading(false);
    if (res.success) {
      toast.success("نظر شما ثبت شد و پس از بررسی تیم انتشار می‌یابد.");
      onClose();
    } else {
      toast.error(res.error || "خطایی رخ داد.");
    }
  };

  const handleMediaUploaded = (url: string, type: string) => {
    setUploadedMedia((prev: {url: string, type: string}[]) => [...prev, { url, type }]);
  };

  const handleMediaRemoved = (url: string) => {
    setUploadedMedia((prev: {url: string, type: string}[]) => prev.filter(m => m.url !== url));
  };

  const addEmoji = (emoji: string) => {
    setPrivateNote((prev: string) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const renderStars = (rating: number, setRating: (val: number) => void) => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
          >
            <Star
              size={30}
              style={{
                fill: star <= rating ? "#F59E0B" : "none",
                color: star <= rating ? "#F59E0B" : "#D1D5DB",
                transition: "color 0.15s",
              }}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#92400E",
          background: "#FEF3C7",
          border: "1px solid #FDE68A",
          borderRadius: 99,
          padding: "2px 14px",
        }}>
          {RATING_LABELS[rating]}
        </span>
      )}
    </div>
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal Card */}
      <div
        dir="rtl"
        style={{
          position: "relative",
          zIndex: 10000,
          background: "#FFFFFF",
          color: "#111827",
          borderRadius: 24,
          boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: 520,
          padding: 28,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color="var(--lajvard, #3B5BDB)" />
              ثبت تجربه و یادداشت من
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              تجربه خود را محرمانه ذخیره کنید یا نظر عمومی برای دیگران ارسال کنید.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: 99,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginRight: 8,
            }}
          >
            <X size={16} color="#374151" />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#E5E7EB", marginBottom: 16 }} />

        {/* Tab Switcher */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          background: "#F3F4F6",
          borderRadius: 16,
          padding: 4,
          marginBottom: 20,
        }}>
          <button
            onClick={() => setActiveTab("private")}
            style={{
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: activeTab === "private" ? "#FFFFFF" : "transparent",
              color: activeTab === "private" ? "#065F46" : "#6B7280",
              boxShadow: activeTab === "private" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <Lock size={15} /> یادداشت خصوصی
          </button>
          <button
            onClick={() => setActiveTab("public")}
            style={{
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              background: activeTab === "public" ? "#FFFFFF" : "transparent",
              color: activeTab === "public" ? "#1E3A8A" : "#6B7280",
              boxShadow: activeTab === "public" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <Globe size={15} /> نظر عمومی
          </button>
        </div>

        {/* Private Tab */}
        {activeTab === "private" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: 16,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              fontSize: 12,
              color: "#065F46",
              lineHeight: 1.7,
            }}>
              <ShieldCheck size={18} style={{ color: "#059669", flexShrink: 0, marginTop: 1 }} />
              این یادداشت‌ها <strong>کاملاً شخصی</strong> هستند و هیچ‌کس جز شما نخواهد دید.
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>امتیاز شخصی شما:</div>
              {renderStars(personalRating, setPersonalRating)}
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                عنوان یادداشت (اختیاری)
              </label>
              <Input
                placeholder="مثلاً: نکات جلسه اول"
                value={privateTitle}
                onChange={(e) => setPrivateTitle(e.target.value)}
                style={{ borderRadius: 12, background: "#F9FAFB" }}
              />
            </div>

            <div className="relative">
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                متن یادداشت خصوصی
              </label>
              <Textarea
                placeholder="تجربیات، نکات یا مواردی که می‌خواهید به خاطر بسپارید..."
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                style={{ borderRadius: 12, background: "#F9FAFB", minHeight: 100, resize: "none" }}
              />
              <button 
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-3 bottom-3 text-gray-400 hover:text-gray-600"
              >
                <Smile size={20} />
              </button>
              {showEmojiPicker && (
                <div className="absolute left-0 bottom-10 bg-white border border-gray-200 rounded-lg p-2 shadow-lg flex flex-wrap gap-2 w-48 z-10">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => addEmoji(e)} className="text-xl hover:bg-gray-100 rounded p-1">
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {userId && (
              <MediaUploadSection 
                userId={userId} 
                onMediaUploaded={handleMediaUploaded} 
                onMediaRemoved={handleMediaRemoved} 
                uploadedMedia={uploadedMedia} 
              />
            )}

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Button
                onClick={handleSavePrivate}
                disabled={isLoading}
                style={{ background: "#059669", color: "#fff", borderRadius: 12, padding: "0 20px", height: 44 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" style={{ marginLeft: 8 }} /> : <FileText size={16} style={{ marginLeft: 8 }} />}
                ذخیره یادداشت خصوصی
              </Button>
            </div>
          </div>
        )}

        {/* Public Tab */}
        {activeTab === "public" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 16,
              padding: "12px 14px",
              display: "flex",
              gap: 10,
              fontSize: 12,
              color: "#1E3A8A",
              lineHeight: 1.7,
            }}>
              <Globe size={18} style={{ color: "#2563EB", flexShrink: 0, marginTop: 1 }} />
              نظر شما پس از بررسی توسط تیم پلازا برای عموم منتشر خواهد شد.
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>
                امتیاز عمومی شما <span style={{ color: "#EF4444" }}>*</span>
              </div>
              {renderStars(publicRating, setPublicRating)}
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                عنوان نظر (اختیاری)
              </label>
              <Input
                placeholder="خلاصه تجربه شما در یک جمله"
                value={publicTitle}
                onChange={(e) => setPublicTitle(e.target.value)}
                style={{ borderRadius: 12, background: "#F9FAFB" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                متن نظر <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <Textarea
                placeholder="تجربه واقعی خود را بنویسید تا به دیگران کمک کنید..."
                value={publicBody}
                onChange={(e) => setPublicBody(e.target.value)}
                style={{ borderRadius: 12, background: "#F9FAFB", minHeight: 100, resize: "none" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                نمایش هویت شما
              </label>
              <select
                value={displayIdentity}
                onChange={(e) => setDisplayIdentity(e.target.value)}
                style={{
                  width: "100%",
                  background: "#F9FAFB",
                  border: "1px solid #D1D5DB",
                  borderRadius: 12,
                  height: 44,
                  padding: "0 12px",
                  fontSize: 13,
                  color: "#111827",
                }}
              >
                <option value="display_name">نام کاربری من نمایش داده شود</option>
                <option value="real_name">نام واقعی من نمایش داده شود</option>
                <option value="anonymous">به صورت ناشناس ارسال شود</option>
              </select>
            </div>

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Button
                onClick={handleSubmitPublic}
                disabled={isLoading}
                style={{ background: "var(--lajvard, #3B5BDB)", color: "#fff", borderRadius: 12, padding: "0 20px", height: 44 }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" style={{ marginLeft: 8 }} /> : <Send size={16} style={{ marginLeft: 8 }} />}
                ارسال جهت بررسی و انتشار
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Use portal to render outside DOM tree to avoid z-index/overflow issues
  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
