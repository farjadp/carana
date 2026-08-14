"use client";

import { useState } from "react";
import { Star, CheckCircle, XCircle, Edit3, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { moderateReview } from "@/lib/actions/interactions";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AdminReviewsClientProps {
  pendingReviews: any[];
  recentReviews: any[];
}

export default function AdminReviewsClient({ pendingReviews, recentReviews }: AdminReviewsClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "recent">("pending");
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [actionType, setActionType] = useState<"reject" | "needs_changes" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async (reviewId: string) => {
    setIsLoading(true);
    const res = await moderateReview(reviewId, "published");
    setIsLoading(false);

    if (res.success) {
      toast.success("نظر منتشر شد.");
    } else {
      toast.error(res.error || "خطایی رخ داد.");
    }
  };

  const handleRejectOrChange = async () => {
    if (!actionType || !selectedReview) return;
    
    if (!moderationReason) {
      toast.error("لطفاً دلیل رد یا درخواست اصلاح را بنویسید.");
      return;
    }

    setIsLoading(true);
    const status = actionType === "reject" ? "rejected" : "needs_changes";
    const res = await moderateReview(selectedReview.id, status, moderationReason);
    setIsLoading(false);

    if (res.success) {
      toast.success(status === "rejected" ? "نظر رد شد." : "درخواست اصلاح ارسال شد.");
      setSelectedReview(null);
      setModerationReason("");
      setActionType(null);
    } else {
      toast.error(res.error || "خطایی رخ داد.");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div dir="rtl">
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          className={`pb-3 px-2 font-bold transition ${activeTab === "pending" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
          onClick={() => setActiveTab("pending")}
        >
          در انتظار بررسی ({pendingReviews.length})
        </button>
        <button
          className={`pb-3 px-2 font-bold transition ${activeTab === "recent" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
          onClick={() => setActiveTab("recent")}
        >
          بررسی‌های اخیر
        </button>
      </div>

      <div className="space-y-4">
        {(activeTab === "pending" ? pendingReviews : recentReviews).map((review) => (
          <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  {review.business?.name}
                  {review.status === "published" && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">منتشر شده</span>}
                  {review.status === "rejected" && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">رد شده</span>}
                  {review.status === "needs_changes" && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">نیاز به اصلاح</span>}
                </h4>
                <div className="text-xs text-gray-500 mt-1 flex gap-3">
                  <span>کاربر: {review.author?.email || review.user_id}</span>
                  <span>نام نمایشی: {review.display_identity}</span>
                  <span>تاریخ ارسال: {new Date(review.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {renderStars(review.public_rating)}
                <span className="font-bold text-lg">{review.public_rating}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mt-3">
              {review.public_title && <h5 className="font-bold mb-2">{review.public_title}</h5>}
              <p className="text-gray-800 whitespace-pre-wrap text-sm leading-loose">{review.public_body}</p>
            </div>

            {review.moderation_reason && (
              <div className="mt-3 bg-red-50 text-red-800 text-sm p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">دلیل رد / اصلاح: </span>
                  {review.moderation_reason}
                </div>
              </div>
            )}

            {activeTab === "pending" && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 justify-end">
                <Button 
                  variant="muted" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setSelectedReview(review);
                    setActionType("reject");
                  }}
                  disabled={isLoading}
                >
                  <XCircle size={16} className="ml-1.5" />
                  رد نظر
                </Button>
                <Button 
                  variant="muted" 
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => {
                    setSelectedReview(review);
                    setActionType("needs_changes");
                  }}
                  disabled={isLoading}
                >
                  <Edit3 size={16} className="ml-1.5" />
                  درخواست اصلاح
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(review.id)}
                  disabled={isLoading}
                >
                  <CheckCircle size={16} className="ml-1.5" />
                  تایید و انتشار
                </Button>
              </div>
            )}
          </div>
        ))}

        {(activeTab === "pending" ? pendingReviews : recentReviews).length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            موردی یافت نشد.
          </div>
        )}
      </div>

      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {actionType === "reject" ? "رد کردن نظر" : "درخواست اصلاح نظر"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-bold mb-2">
              دلیل {actionType === "reject" ? "رد نظر" : "نیاز به اصلاح"} (به کاربر نمایش داده می‌شود)
            </label>
            <Textarea 
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="لطفاً دلیل خود را بنویسید..."
              className="h-24"
            />
          </div>
          <DialogFooter>
            <Button variant="muted" onClick={() => setSelectedReview(null)}>انصراف</Button>
            <Button onClick={handleRejectOrChange} disabled={isLoading} className={actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}>
              ثبت {actionType === "reject" ? "رد" : "اصلاح"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
