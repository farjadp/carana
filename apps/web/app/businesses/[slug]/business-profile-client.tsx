"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin, Globe, Phone, Mail, Clock, ShieldCheck, CheckCircle2,
  Sparkles, MessageCircle, AlertTriangle, ExternalLink, Calendar,
  Building2, ChevronLeft, Star, Heart, Share2, Layers, Award,
  Check, Info, UserCheck, Edit3, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import InteractionBar from "@/components/business/interaction-bar";
import { PrivateNoteCard } from "@/components/business/private-note-card";
import { VerificationBadge, VerificationDetail } from "@/components/verification-badge";
import { getVerificationStatus } from "@/lib/verification/status";
import { toast } from "sonner";

interface BusinessProfileClientProps {
  business: any;
  user: any;
  initialInteraction: any;
  approvedReviews: any[];
  similarBusinesses: any[];
  isOwnerOrAdmin: boolean;
}

export default function BusinessProfileClient({
  business,
  user,
  initialInteraction,
  approvedReviews,
  similarBusinesses,
  isOwnerOrAdmin,
}: BusinessProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"about" | "services" | "gallery" | "reviews">("about");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Computed, never stored: a boolean column cannot express "verified, but it
  // expires in nine days" or "the phone number changed after we proved it".
  const verification = getVerificationStatus(business);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: business.name,
        text: business.short_description || business.name,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("لینک پروفایل در حافظه کپی شد");
    }
  };

  const handleReport = () => {
    toast.info("گزارش شما برای پشتیبانی ارسال شد. متشکریم!");
  };

  // Determine working hours text for today
  const getWorkingHoursText = () => {
    if (!business.working_hours) return "ساعات کاری ثبت نشده است";
    const daysMap: Record<number, string> = {
      0: "sunday", 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday", 6: "saturday"
    };
    const todayKey = daysMap[new Date().getDay()];
    const todayHours = business.working_hours[todayKey];
    if (!todayHours || todayHours.closed) return "امروز: تعطیل";
    return `امروز: ${todayHours.open || "09:00"} تا ${todayHours.close || "17:00"}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20" dir="rtl">
      {/* 1. Header Cover & Hero Section */}
      <div className="relative bg-gray-900 text-white">
        {/* Cover Photo */}
        <div className="h-64 md:h-80 w-full relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950">
          {business.cover_url ? (
            <img
              src={business.cover_url}
              alt={business.name}
              className="w-full h-full object-cover opacity-60 filter blur-[1px]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />

          {/* Action buttons on Cover (Share / Report) */}
          <div className="absolute top-6 left-4 md:left-8 z-10 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full transition shadow-md"
              title="اشتراک‌گذاری"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={handleReport}
              className="p-2.5 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full transition shadow-md"
              title="گزارش خطای اطلاعات"
            >
              <AlertTriangle size={18} />
            </button>
          </div>
        </div>

        {/* Profile Main Header Content (Overlapping) */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 -mt-20 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo / Avatar */}
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-white p-2 shadow-xl border-4 border-white overflow-hidden shrink-0 flex items-center justify-center text-gray-800 font-bold text-3xl">
                {business.logo_url ? (
                  <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <Building2 size={48} className="text-gray-400" />
                )}
              </div>

              {/* Title & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {/* One badge, computed from verified_at / verified_until.
                      The three booleans that used to sit here — is_verified,
                      is_claimed, is_featured — exist in no migration, so these
                      chips could never render. */}
                  <VerificationBadge status={verification} size="lg" audience="public" />
                  {business.is_featured && (
                    <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <Sparkles size={14} /> ویژه
                    </span>
                  )}
                  {business.is_iranian_owned && (
                    <span className="bg-gray-800 text-gray-200 border border-gray-700 text-xs px-2.5 py-1 rounded-lg">
                      کسب‌وکار ایرانیان کانادا
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl font-black text-white mb-1">
                  {business.name}
                </h1>

                {business.name_en && (
                  <p className="text-gray-300 font-sans text-sm md:text-base mb-3" dir="ltr" style={{ textAlign: "right" }}>
                    {business.name_en}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-red-400" />
                    <span>{business.city || "شهر مشخص نشده"}، {business.province || "کانادا"}</span>
                  </div>
                  <span>•</span>
                  <Link href={`/categories/${business.category}`} className="flex items-center gap-1.5 hover:text-white transition underline">
                    <Layers size={16} className="text-blue-400" />
                    <span>{business.category}</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Action CTAs & Owner Button */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {isOwnerOrAdmin ? (
                <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold w-full sm:w-auto">
                  <Link href={`/dashboard/business/${business.id}/edit`}>
                    <Edit3 size={16} className="ml-2" /> ویرایش پروفایل من
                  </Link>
                </Button>
              ) : !business.is_claimed ? (
                <Button asChild variant="solid" className="rounded-xl font-bold w-full sm:w-auto">
                  <Link href={`/claim?businessId=${business.id}`}>
                    صاحب این کسب‌وکار هستید؟ (ادعای مالکیت)
                  </Link>
                </Button>
              ) : null}

              {business.phone && (
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex-1 sm:flex-initial">
                  <a href={`tel:${business.phone}`}>
                    <Phone size={16} className="ml-2" /> تماس تلفنی
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        {/* 2. Quick Scannable Info Bar */}
        <Card className="border-0 shadow-md bg-white rounded-3xl p-5 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            {business.phone && (
              <div className="p-3 bg-gray-50 rounded-2xl flex flex-col gap-1">
                <span className="text-gray-400 font-medium">شماره تماس</span>
                <a href={`tel:${business.phone}`} className="font-bold text-gray-900 hover:text-blue-600 font-sans" dir="ltr">
                  {business.phone}
                </a>
              </div>
            )}

            {business.whatsapp && (
              <div className="p-3 bg-green-50/60 text-green-900 rounded-2xl flex flex-col gap-1">
                <span className="text-green-600 font-medium">واتساپ مستقیم</span>
                <a
                  href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline font-sans"
                  dir="ltr"
                >
                  پاسخگویی سریع
                </a>
              </div>
            )}

            {business.website && (
              <div className="p-3 bg-blue-50/60 text-blue-900 rounded-2xl flex flex-col gap-1">
                <span className="text-blue-600 font-medium">وب‌سایت رسمی</span>
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold hover:underline font-sans truncate"
                  dir="ltr"
                >
                  {business.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-2xl flex flex-col gap-1">
              <span className="text-gray-400 font-medium">ساعات کاری</span>
              <span className="font-bold text-gray-900 truncate">{getWorkingHoursText()}</span>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl flex flex-col gap-1">
              <span className="text-gray-400 font-medium">نحوه ارائه خدمت</span>
              <span className="font-bold text-gray-900">
                {business.service_type === "online" ? "آنلاین / غیرحضوری" : business.service_type === "both" ? "حضوری و آنلاین" : "حضوری"}
              </span>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl flex flex-col gap-1">
              <span className="text-gray-400 font-medium">زبان‌های پاسخگویی</span>
              <span className="font-bold text-gray-900 truncate">
                {business.languages ? business.languages.join("، ") : "فارسی، انگلیسی"}
              </span>
            </div>
          </div>
        </Card>

        {/* 9. Personal User Engagement Interaction Bar */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Heart size={16} className="text-red-500" /> ذخیره و یادداشت شخصی شما:
          </h2>
          {user ? (
            <>
              <InteractionBar businessId={business.id} initialInteraction={initialInteraction} />
              <PrivateNoteCard 
                note={initialInteraction?.private_note}
                title={initialInteraction?.private_title}
                mediaUrls={initialInteraction?.private_media_urls}
                mediaTypes={initialInteraction?.private_media_types}
              />
            </>
          ) : (
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-blue-900 text-xs">
              <span>برای ذخیره‌سازی، یادداشت خصوصی و ثبت نظر روی این کسب‌وکار، وارد حساب کاربری شوید.</span>
              <Button asChild size="sm" className="bg-[color:var(--lajvard)] hover:bg-[color:var(--lajvard)]/90 text-white rounded-xl">
                <Link href="/auth/login">ورود / ثبت‌نام</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 gap-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("about")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "about" ? "border-[color:var(--lajvard)] text-[color:var(--lajvard)]" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            درباره کسب‌وکار
          </button>
          {business.services && business.services.length > 0 && (
            <button
              onClick={() => setActiveTab("services")}
              className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "services" ? "border-[color:var(--lajvard)] text-[color:var(--lajvard)]" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              خدمات و قیمت‌ها ({business.services.length})
            </button>
          )}
          {business.gallery && business.gallery.length > 0 && (
            <button
              onClick={() => setActiveTab("gallery")}
              className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
                activeTab === "gallery" ? "border-[color:var(--lajvard)] text-[color:var(--lajvard)]" : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              تصاویر و گالری ({business.gallery.length})
            </button>
          )}
          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 text-sm font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === "reviews" ? "border-[color:var(--lajvard)] text-[color:var(--lajvard)]" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            نظرات و تجربه کاربران ({approvedReviews.length})
          </button>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tab 1: About */}
            {activeTab === "about" && (
              <>
                <Card className="border-0 shadow-sm bg-white rounded-3xl p-6 md:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">توضیحات و مشخصات</h2>
                  {business.short_description && (
                    <p className="text-base font-semibold text-gray-800 leading-relaxed mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {business.short_description}
                    </p>
                  )}
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line">
                    {business.description || business.desc || "توضیح بیشتری برای این کسب‌وکار وارد نشده است."}
                  </p>

                  {/* Highlights / Established */}
                  <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
                    {business.established_year && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-500">سال شروع فعالیت:</span>
                        <span className="font-bold text-gray-900">{business.established_year}</span>
                      </div>
                    )}
                    {business.license_info && (
                      <div className="flex items-center gap-2">
                        <Award size={16} className="text-amber-500" />
                        <span className="text-gray-500">مجوز / لایسنس:</span>
                        <span className="font-bold text-gray-900">{business.license_info}</span>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 4. Services Overview preview */}
                {business.services && business.services.length > 0 && (
                  <Card className="border-0 shadow-sm bg-white rounded-3xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900">لیست خدمات و قیمت‌ها</h2>
                      <button
                        onClick={() => setActiveTab("services")}
                        className="text-xs font-bold text-[color:var(--lajvard)] hover:underline flex items-center gap-1"
                      >
                        مشاهده همه <ChevronLeft size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {business.services.slice(0, 4).map((s: any, idx: number) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-gray-900 text-sm">{s.name}</h3>
                            {s.price && (
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                {s.price} {s.price_unit || "دلار"}
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <p className="text-xs text-gray-500 line-clamp-2">{s.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* Tab 2: Services Full List */}
            {activeTab === "services" && (
              <Card className="border-0 shadow-sm bg-white rounded-3xl p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">تعرفه‌ها و خدمات ارائه شده</h2>
                <div className="space-y-4">
                  {business.services?.map((s: any, idx: number) => (
                    <div key={idx} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base mb-1">{s.name}</h3>
                        {s.description && (
                          <p className="text-xs md:text-sm text-gray-600">{s.description}</p>
                        )}
                        {s.price_note && (
                          <span className="text-[11px] text-gray-400 mt-1 block">{s.price_note}</span>
                        )}
                      </div>
                      <div className="shrink-0 text-left">
                        {s.price ? (
                          <div className="text-base font-black text-emerald-600">
                            {s.price} <span className="text-xs font-normal text-gray-500">{s.price_unit || "دلار"}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">تماس برای استعلام</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tab 3: Gallery */}
            {activeTab === "gallery" && (
              <Card className="border-0 shadow-sm bg-white rounded-3xl p-6 md:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">گالری تصاویر</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {business.gallery?.map((imgUrl: string, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className="h-40 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer group relative"
                    >
                      <img src={imgUrl} alt={`تصویر ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <ImageIcon size={24} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tab 4: Public Reviews Section */}
            {activeTab === "reviews" && (
              <Card className="border-0 shadow-sm bg-white rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">نظرات و تجربه‌های عمومی</h2>
                    <p className="text-xs text-gray-500 mt-1">نظرات ثبت‌شده پس از بررسی مدیر نمایش داده می‌شوند.</p>
                  </div>
                </div>

                {approvedReviews.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center my-4 border border-dashed border-gray-200">
                    <Star className="h-10 w-10 text-amber-400 mx-auto mb-3 opacity-60" />
                    <h3 className="font-bold text-gray-800 text-sm mb-1">هنوز نظری ثبت نشده است</h3>
                    <p className="text-xs text-gray-500">نظرهای تاییدشده کاربران به‌زودی در این بخش نمایش داده می‌شوند.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedReviews.map((rev) => (
                      <div key={rev.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[color:var(--lajvard)] text-white text-xs font-bold flex items-center justify-center">
                              {rev.user_name?.[0] || "ک"}
                            </div>
                            <span className="font-bold text-xs text-gray-900">{rev.user_name || "کاربر چارانا"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 text-xs">
                            <Star size={14} className="fill-current" />
                            <span className="font-bold text-gray-800">{rev.rating || 5}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{rev.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Column: Location, Map & Trust Details */}
          <div className="space-y-6">
            {/* 6. Location & Map Box */}
            <Card className="border-0 shadow-sm bg-white rounded-3xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-red-500" /> موقعیت مکانی
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block mb-1">استان و شهر:</span>
                  <span className="font-bold text-gray-900">{business.city}، {business.province} (کانادا)</span>
                </div>

                {business.is_address_public && business.address && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block mb-1">آدرس کامل:</span>
                    <span className="font-bold text-gray-900 leading-relaxed">{business.address}</span>
                    {business.postal_code && <span className="block text-gray-400 mt-1" dir="ltr">{business.postal_code}</span>}
                  </div>
                )}

                {/* Embedded Google Map */}
                <div className="h-56 w-full rounded-xl overflow-hidden mt-3 border border-gray-100">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&q=${encodeURIComponent(`${business.name} ${business.address || ''}, ${business.city || ''}, ${business.province || ''}, Canada`)}`}
                  />
                </div>

                {/* External Directions Link */}
                {business.google_maps_url && (
                  <a
                    href={business.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition mt-2"
                  >
                    <ExternalLink size={14} /> مسیریابی در اپلیکیشن مپ
                  </a>
                )}
              </div>
            </Card>

            {/* 7. Trust & Verification Badge Details */}
            <Card className="border-0 shadow-sm bg-white rounded-3xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" /> سنجش اعتبار و شفافیت
              </h2>

              <div className="space-y-3 text-xs">
                <VerificationDetail status={verification} audience="public" />

                {verification.state === "unverified" && (
                  <Link
                    href={`/claim?businessId=${business.id}`}
                    className="block rounded-xl bg-[#800000]/5 p-2.5 text-center font-bold text-[#800000] hover:bg-[#800000]/10 transition"
                  >
                    صاحب این کسب‌وکار هستید؟ مالکیتش را احراز کنید
                  </Link>
                )}

                {business.license_info && (
                  <div className="p-2.5 bg-gray-50 rounded-xl text-gray-800">
                    <span className="text-gray-400 block mb-0.5">شماره ثبت / مجوز:</span>
                    <span className="font-bold">{business.license_info}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* 10. Similar Businesses Section */}
        {similarBusinesses && similarBusinesses.length > 0 && (
          <section className="mt-16 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">کسب‌وکارهای مشابه در {business.city || "این منطقه"}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarBusinesses.map((sim) => (
                <Card key={sim.id} className="hover:shadow-md transition border-gray-200 bg-white rounded-2xl overflow-hidden">
                  <div className="h-32 bg-gray-100 relative">
                    {sim.cover_url ? (
                      <img src={sim.cover_url} alt={sim.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-slate-800 to-indigo-900" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm truncate mb-1">{sim.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{sim.city || "کانادا"} • {sim.category}</p>
                    <Button asChild size="sm" variant="muted" className="w-full text-xs rounded-xl">
                      <Link href={`/businesses/${sim.slug || sim.id}`}>مشاهده</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox Modal for Gallery Images */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img src={selectedImage} alt="بزرگ‌نمایی" className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
