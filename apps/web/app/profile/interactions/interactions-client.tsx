"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, MapPin, CheckCircle, NotebookPen, MessageSquare, Star, Clock, AlertTriangle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InteractionsClientProps {
  interactions: any[];
  publicReviews: any[];
}

export default function InteractionsClient({ interactions, publicReviews }: InteractionsClientProps) {
  const [activeTab, setActiveTab] = useState<string>("want_to_go");

  const wantToGo = interactions.filter(i => i.personal_status === "want_to_go");
  const visited = interactions.filter(i => i.personal_status.startsWith("visited_") || i.personal_status === "customer");
  const saved = interactions.filter(i => i.personal_status === "saved");
  const withNotes = interactions.filter(i => i.private_note || i.private_title);
  
  const tabs = [
    { id: "want_to_go", label: "می‌خواهم بروم", count: wantToGo.length, icon: MapPin },
    { id: "saved", label: "علاقه‌مندی‌ها", count: saved.length, icon: Bookmark },
    { id: "visited", label: "رفتم", count: visited.length, icon: CheckCircle },
    { id: "notes", label: "یادداشت‌ها", count: withNotes.length, icon: NotebookPen },
    { id: "reviews", label: "نظرات عمومی", count: publicReviews.length, icon: MessageSquare },
  ];

  const getReviewStatusLabel = (status: string) => {
    switch(status) {
      case "pending_moderation": return { label: "در انتظار تایید", color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "published": return { label: "منتشر شده", color: "text-green-600 bg-green-50 border-green-200" };
      case "needs_changes": return { label: "نیاز به اصلاح", color: "text-orange-600 bg-orange-50 border-orange-200" };
      case "rejected": return { label: "رد شده", color: "text-red-600 bg-red-50 border-red-200" };
      default: return { label: status, color: "text-gray-600 bg-gray-50 border-gray-200" };
    }
  };

  const renderInteractions = (items: any[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <NotebookPen size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">موردی یافت نشد</h3>
          <p className="text-sm text-gray-500 text-center">هنوز هیچ کسب‌وکاری در این لیست ثبت نکرده‌اید.</p>
          <Button asChild className="mt-4 bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white">
            <Link href="/categories">جستجوی کسب‌وکارها</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 shadow-[0_2px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                  {item.business?.logo_url ? (
                    <img src={item.business.logo_url} alt={item.business.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={20} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[color:var(--text)] text-base">
                    <Link href={`/businesses/${item.business?.slug}`} className="hover:text-[color:var(--lajvard)] transition">
                      {item.business?.name}
                    </Link>
                  </h4>
                  <p className="text-xs text-[color:var(--muted-text)] mt-0.5">{item.business?.category}</p>
                </div>
              </div>
              {item.personal_rating && (
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-sm font-bold">
                  <Star size={14} className="fill-yellow-500 text-yellow-500" />
                  {item.personal_rating}
                </div>
              )}
            </div>

            {(item.private_title || item.private_note || (item.private_media_urls && item.private_media_urls.length > 0)) && (
              <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 border border-amber-200/50 p-4 rounded-xl mb-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-amber-400 rounded-r-xl" />
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 mb-2">
                  <NotebookPen size={14} />
                  یادداشت خصوصی شما
                </div>
                {item.private_title && <h5 className="text-sm font-bold text-gray-900 mb-1.5">{item.private_title}</h5>}
                {item.private_note && <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed whitespace-pre-wrap">{item.private_note}</p>}
                {item.private_media_urls && item.private_media_urls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200/50 flex flex-wrap gap-2 text-xs font-bold text-amber-700">
                    {item.private_media_urls.length} فایل ضمیمه شده
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} />
                {new Date(item.updated_at).toLocaleDateString('fa-IR')}
              </span>
              
              <Link href={`/businesses/${item.business?.slug}`}>
                <Button variant="muted" size="sm" className="text-xs h-8">
                  مشاهده و ویرایش
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReviews = () => {
    if (publicReviews.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">نظری ثبت نشده</h3>
          <p className="text-sm text-gray-500 text-center">شما هنوز هیچ نظر عمومی برای کسب‌وکارها ارسال نکرده‌اید.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {publicReviews.map((review) => {
          const statusStyle = getReviewStatusLabel(review.status);
          
          return (
            <div key={review.id} className="bg-white/80 backdrop-blur-sm border border-gray-100/80 rounded-2xl p-6 shadow-[0_2px_15px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {review.business?.logo_url ? (
                      <img src={review.business.logo_url} alt={review.business.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[color:var(--text)] text-base">
                      <Link href={`/businesses/${review.business?.slug}`} className="hover:text-[color:var(--lajvard)] transition">
                        {review.business?.name}
                      </Link>
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle.color}`}>
                      {statusStyle.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg text-sm font-black">
                  <Star size={16} className="fill-yellow-500 text-yellow-500" />
                  {review.public_rating}
                </div>
              </div>

              {review.public_title && <h5 className="font-bold text-gray-900 mt-3 mb-1">{review.public_title}</h5>}
              <p className="text-sm text-gray-700 leading-loose whitespace-pre-wrap">{review.public_body}</p>

              {review.moderation_reason && review.status !== 'approved' && review.status !== 'published' && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex gap-2">
                  <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-900">پیام مدیر:</p>
                    <p className="text-xs text-orange-800 mt-1">{review.moderation_reason}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                <div className="flex gap-4">
                  <span>ارسال: {new Date(review.created_at).toLocaleDateString('fa-IR')}</span>
                  <span>نام نمایش: {review.display_identity === 'anonymous' ? 'ناشناس' : 'نمایشی'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div dir="rtl">
      {/* Tabs */}
      <div className="flex overflow-x-auto p-1.5 bg-gray-100/50 border border-gray-200/60 rounded-2xl mb-8 gap-2 scrollbar-hide max-w-fit mx-auto shadow-inner">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all whitespace-nowrap min-w-[120px] ${
                isActive 
                  ? "bg-white text-[color:var(--lajvard)] shadow-sm border border-gray-100" 
                  : "bg-transparent border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-200/50"
              }`}
            >
              <Icon size={18} className={isActive ? "text-[color:var(--lajvard)]" : "text-gray-400"} />
              {tab.label}
              <span className={`text-[10px] py-0.5 px-2 rounded-full font-black ${isActive ? "bg-[color:var(--lajvard)]/10" : "bg-gray-200 text-gray-500"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "want_to_go" && renderInteractions(wantToGo)}
        {activeTab === "saved" && renderInteractions(saved)}
        {activeTab === "visited" && renderInteractions(visited)}
        {activeTab === "notes" && renderInteractions(withNotes)}
        {activeTab === "reviews" && renderReviews()}
      </div>
    </div>
  );
}
