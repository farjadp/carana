"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, MapPin, Phone, Globe, ShieldCheck, Filter,
  CheckCircle2, Sparkles, Map, List, ChevronDown, MessageCircle,
  HelpCircle, ArrowLeft, Star, Heart, Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { getVerificationStatus } from "@/lib/verification/status";
import { CategoryDetailConfig } from "@/lib/data/category-details";

interface BusinessItem {
  id: string;
  slug: string;
  name: string;
  name_en?: string;
  category: string;
  sub_category?: string;
  short_description?: string;
  description?: string;
  city?: string;
  province?: string;
  address?: string;
  phone?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  is_verified?: boolean;
  is_claimed?: boolean;
  is_iranian_owned?: boolean;
  languages?: string[];
  service_type?: string;
  logo_url?: string;
  cover_url?: string;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
}

const PROVINCES = [
  { value: "ALL", label: "همه استان‌ها" },
  { value: "ON", label: "انتاریو (ON)" },
  { value: "BC", label: "بریتیش کلمبیا (BC)" },
  { value: "QC", label: "کبک (QC)" },
  { value: "AB", label: "آلبرتا (AB)" },
];

export default function CategoryClientPage({
  categoryConfig,
  initialBusinesses,
  cityLinks = [],
}: {
  categoryConfig: CategoryDetailConfig;
  initialBusinesses: BusinessItem[];
  /** City × category pages that actually have listings — the interlink hub. */
  cityLinks?: { slug: string; nameFa: string; count: number }[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  // Client-side paging: the list is already in memory (filters are local),
  // so a "show more" step of 24 keeps first paint light without a round trip.
  const PAGE = 24;
  const [visible, setVisible] = useState(PAGE);
  const [selectedProvince, setSelectedProvince] = useState("ALL");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("relevant");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Trust Filters
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyClaimed, setOnlyClaimed] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);

  // Saved / Bookmarked Businesses (Local state demo)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const toggleSave = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavedIds(next);
  };

  // Filter & Sort Logic
  const filteredBusinesses = useMemo(() => {
    return initialBusinesses.filter((b) => {
      // Search Text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.name.toLowerCase().includes(q) || (b.name_en && b.name_en.toLowerCase().includes(q));
        const matchDesc = b.short_description?.toLowerCase().includes(q);
        const matchCity = b.city?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCity) return false;
      }

      // Province Filter
      if (selectedProvince !== "ALL" && b.province !== selectedProvince) return false;

      // Subcategory Filter
      if (selectedSubcategory && b.sub_category !== selectedSubcategory) return false;

      // Service Type Filter (in_person, online, both)
      if (serviceTypeFilter !== "ALL" && b.service_type && b.service_type !== "both" && b.service_type !== serviceTypeFilter) {
        return false;
      }

      // Language Filter
      if (languageFilter !== "ALL" && b.languages && !b.languages.includes(languageFilter)) return false;

      // Trust Filters
      if (onlyVerified && !b.is_verified) return false;
      if (onlyClaimed && !b.is_claimed) return false;
      if (hasWebsite && !b.website) return false;
      if (hasPhone && !b.phone) return false;
      if (hasWhatsApp && !b.whatsapp) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        return b.id.localeCompare(a.id);
      }
      if (sortBy === "verified") {
        return (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0);
      }
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "featured") {
        return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
      }
      return 0; // Relevant default
    });
  }, [
    initialBusinesses, searchQuery, selectedProvince, selectedSubcategory,
    serviceTypeFilter, languageFilter, onlyVerified, onlyClaimed,
    hasWebsite, hasPhone, hasWhatsApp, sortBy
  ]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20" dir="rtl">
      {/* 1. Header / Hero Section */}
      <section className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white overflow-hidden py-12 md:py-16 px-4">
        {categoryConfig.imageUrl && (
          <img
            src={categoryConfig.imageUrl}
            alt={categoryConfig.name}
            className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs md:text-sm text-gray-300 mb-6">
            <Link href="/" className="hover:text-white transition">خانه</Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-white transition">دسته‌بندی‌ها</Link>
            <span>/</span>
            <span className="text-white font-medium">{categoryConfig.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-medium mb-3 border border-white/10">
                <span className="text-xl">{categoryConfig.icon}</span>
                <span>دایرکتوری تخصصی گوپلازا</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
                {categoryConfig.name}
              </h1>
              <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed">
                {categoryConfig.description}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-center min-w-[140px]">
                <div className="text-2xl font-bold text-emerald-400">{filteredBusinesses.length}</div>
                <div className="text-xs text-gray-300">کسب‌وکار فعال</div>
              </div>
              <Button asChild className="bg-[color:var(--lajvard)] hover:bg-[color:var(--lajvard)]/90 text-white rounded-2xl h-full py-3">
                <Link href={`/dashboard/business/new?category=${categoryConfig.slug}`}>
                  ثبت کسب‌وکار در این دسته
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Search & Filter Bar Container */}
      <div className="max-w-7xl mx-auto px-4 -mt-6 relative z-20">
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-md rounded-2xl p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`جستجو در ${categoryConfig.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-sm"
              />
            </div>

            {/* Province Select */}
            <div className="w-full lg:w-48">
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:bg-white"
              >
                {PROVINCES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Service Type Filter */}
            <div className="w-full lg:w-44">
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:bg-white"
              >
                <option value="ALL">نحوه ارائه (همه)</option>
                <option value="in_person">حضوری</option>
                <option value="online">آنلاین / از از راه دور</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="w-full lg:w-40">
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:bg-white"
              >
                <option value="ALL">زبان (همه)</option>
                <option value="فارسی">فارسی</option>
                <option value="انگلیسی">انگلیسی</option>
                <option value="فرانسوی">فرانسوی</option>
              </select>
            </div>
          </div>

          {/* Trust Checkboxes Bar */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-gray-700">
              <span className="font-semibold text-gray-900 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> فیلترهای اعتماد:
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={onlyVerified}
                  onChange={(e) => setOnlyVerified(e.target.checked)}
                  className="rounded text-[color:var(--lajvard)] focus:ring-0"
                />
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>تاییدشده توسط گوپلازا</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={onlyClaimed}
                  onChange={(e) => setOnlyClaimed(e.target.checked)}
                  className="rounded text-[color:var(--lajvard)] focus:ring-0"
                />
                <span>مالکیت Claim شده</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={hasWebsite}
                  onChange={(e) => setHasWebsite(e.target.checked)}
                  className="rounded text-[color:var(--lajvard)] focus:ring-0"
                />
                <span>دارای وب‌سایت</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900">
                <input
                  type="checkbox"
                  checked={hasWhatsApp}
                  onChange={(e) => setHasWhatsApp(e.target.checked)}
                  className="rounded text-[color:var(--lajvard)] focus:ring-0"
                />
                <span>پاسخگو در واتساپ</span>
              </label>
            </div>

            {/* List / Map Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition text-xs ${
                  viewMode === "list" ? "bg-white text-gray-900 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <List className="h-3.5 w-3.5" /> لیست
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition text-xs ${
                  viewMode === "map" ? "bg-white text-gray-900 shadow-sm font-semibold" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Map className="h-3.5 w-3.5" /> نقشه
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Subcategories Pills */}
      {categoryConfig.subcategories && categoryConfig.subcategories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedSubcategory(null)}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition ${
                selectedSubcategory === null
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              همه زیردسته‌ها
            </button>
            {categoryConfig.subcategories.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => setSelectedSubcategory(sub.slug === selectedSubcategory ? null : sub.slug)}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-medium whitespace-nowrap transition ${
                  selectedSubcategory === sub.slug
                    ? "bg-[color:var(--lajvard)] text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        {/* Sorting Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-500">
            نمایش <span className="font-bold text-gray-900">{filteredBusinesses.length}</span> کسب‌وکار
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">مرتب‌سازی:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
            >
              <option value="relevant">مرتبط‌ترین</option>
              <option value="newest">جدیدترین</option>
              <option value="verified">تاییدشده‌ها اول</option>
              <option value="rating">بیشترین امتیاز</option>
              <option value="featured">کسب‌وکارهای ویژه</option>
            </select>
          </div>
        </div>

        {/* View Mode: Map View */}
        {viewMode === "map" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center mb-8 shadow-sm">
            <div className="max-w-md mx-auto py-8">
              <div className="p-4 bg-blue-50 text-[color:var(--lajvard)] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Map className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">نمای نقشه تعاملی</h3>
              <p className="text-gray-500 text-sm mb-6">
                موقعیت مکانی {filteredBusinesses.length} کسب‌وکار در شهرها و استان‌های کانادا بر روی نقشه.
              </p>
              <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-300">
                نقشه آنلاین گوگل مپ پس از دریافت کواوردینات بارگذاری می‌شود
              </div>
            </div>
          </div>
        )}

        {/* 4. Business List Cards Grid */}
        {filteredBusinesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center my-8 shadow-sm">
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">کسب‌وکاری با این فیلترها یافت نشد</h3>
              <p className="text-gray-500 text-sm mb-6">
                می‌توانید فیلترها را پاک کنید یا کسب‌وکار جدیدی در این دسته‌بندی ثبت کنید.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedProvince("ALL");
                  setSelectedSubcategory(null);
                  setServiceTypeFilter("ALL");
                  setLanguageFilter("ALL");
                  setOnlyVerified(false);
                  setOnlyClaimed(false);
                }}
                variant="muted"
                className="rounded-xl"
              >
                پاک کردن همه فیلترها
              </Button>
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {filteredBusinesses.slice(0, visible).map((b) => (
              <Card key={b.id} className="group hover:shadow-md transition-all duration-300 border-gray-200/80 bg-white overflow-hidden rounded-2xl flex flex-col">
                {/* Card Banner / Header Image */}
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  {b.cover_url || categoryConfig.imageUrl ? (
                    <img
                      src={b.cover_url || categoryConfig.imageUrl}
                      alt={b.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Right Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* is_verified exists in no migration, so this chip could
                        never render. Real state comes from verified_until. */}
                    <VerificationBadge status={getVerificationStatus(b)} audience="public" />
                    {b.is_featured && (
                      <span className="bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <Sparkles className="h-3 w-3" /> ویژه
                      </span>
                    )}
                  </div>

                  {/* Save Bookmark Button */}
                  <button
                    onClick={() => toggleSave(b.id)}
                    className="absolute top-3 left-3 bg-white/80 backdrop-blur-md hover:bg-white text-gray-700 p-2 rounded-full transition shadow-sm"
                    aria-label="ذخیره کسب‌وکار"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${savedIds.has(b.id) ? "fill-[color:var(--lajvard)] text-[color:var(--lajvard)]" : ""}`}
                    />
                  </button>

                  {/* Location Badge Bottom Right */}
                  <div className="absolute bottom-3 right-3 text-white text-xs font-medium flex items-center gap-1 drop-shadow-md">
                    <MapPin className="h-3.5 w-3.5 text-red-400" />
                    <span>{b.city || "شهر مشخص نشده"}، {b.province || "کانادا"}</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-lg group-hover:text-[color:var(--lajvard)] transition-colors line-clamp-1">
                        {b.name}
                      </h3>
                      {b.name_en && (
                        <span className="text-xs text-gray-400 font-sans">{b.name_en}</span>
                      )}
                    </div>

                    <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4">
                      {b.short_description || b.description || "اطلاعات تکمیلی این کسب‌وکار در پروفایل موجود است."}
                    </p>
                  </div>

                  {/* Footer & Quick Actions */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {b.phone && (
                        <a
                          href={`tel:${b.phone}`}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          title="تماس تلفنی"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {b.whatsapp && (
                        <a
                          href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition"
                          title="واتساپ"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      )}
                      {b.website && (
                        <a
                          href={b.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="وب‌سایت"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    <Button asChild size="sm" className="rounded-xl text-xs bg-gray-900 hover:bg-[color:var(--lajvard)] transition">
                      <Link href={`/businesses/${b.slug || b.id}`}>
                        مشاهده پروفایل
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredBusinesses.length > visible ? (
            <div className="mb-12 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-6 font-bold text-gray-800 shadow-sm transition hover:border-[color:var(--lajvard)] hover:text-[color:var(--lajvard)]"
              >
                نمایش {Math.min(PAGE, filteredBusinesses.length - visible).toLocaleString("fa-IR")} مورد بیشتر
                <span className="text-xs text-gray-400">({visible.toLocaleString("fa-IR")} از {filteredBusinesses.length.toLocaleString("fa-IR")})</span>
              </button>
            </div>
          ) : <div className="mb-6" />}
          </>
        )}

        {/* 7b. By city — links into the city × category pages */}
        {cityLinks.length > 0 && (
          <section className="mb-12" aria-labelledby="bycity-h">
            <h2 id="bycity-h" className="text-xl font-black text-gray-900 mb-4">{categoryConfig.name} به تفکیک شهر</h2>
            <div className="flex flex-wrap gap-2">
              {cityLinks.map((c) => (
                <Link
                  key={c.slug}
                  href={`/cities/${c.slug}/${categoryConfig.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:border-[color:var(--lajvard)] hover:text-[color:var(--lajvard)] transition"
                >
                  {c.nameFa}
                  <span className="text-xs text-gray-400">{c.count.toLocaleString("fa-IR")}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 8. Decision Guide Section */}
        {categoryConfig.decisionGuide && (
          <section className="bg-white rounded-3xl p-6 md:p-10 border border-gray-200 mb-12 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                  {categoryConfig.decisionGuide.title}
                </h2>
                <p className="text-gray-500 text-xs md:text-sm mt-1">نکات کلیدی و راهنمای تصمیم‌گیری هوشمندانه قبل از انتخاب</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryConfig.decisionGuide.tips.map((tip, idx) => (
                <div key={idx} className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                  <h3 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[color:var(--lajvard)] text-white text-xs flex items-center justify-center font-sans">
                      {idx + 1}
                    </span>
                    {tip.title}
                  </h3>
                  <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                    {tip.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 9. Category FAQs Section */}
        {categoryConfig.faqs && categoryConfig.faqs.length > 0 && (
          <section className="bg-white rounded-3xl p-6 md:p-10 border border-gray-200 mb-12 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 text-center">
              سوالات پرتکرار در دسته‌بندی {categoryConfig.name}
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              {categoryConfig.faqs.map((faq, idx) => (
                <div key={idx} className="border border-gray-100 rounded-2xl p-5 bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-sm md:text-base mb-2 flex items-center gap-2">
                    <span className="text-[color:var(--lajvard)] font-bold">؟</span> {faq.question}
                  </h3>
                  <p className="text-gray-600 text-xs md:text-sm leading-relaxed pr-5">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 10. Owner CTA Banner */}
        <section className="bg-gradient-to-r from-gray-900 to-indigo-950 text-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black mb-3">
              کسب‌وکار شما در این دسته‌بندی نیست؟
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mb-6 leading-relaxed">
              اگر صاحب کسب‌وکار ایرانی در کانادا هستید، همین الان پروفایل خود را ثبت کنید تا توسط هزاران هم‌وطن در سراسر استان‌های کانادا دیده شوید.
            </p>
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-2xl h-auto text-sm shadow-lg">
              <Link href={`/dashboard/business/new?category=${categoryConfig.slug}`}>
                ثبت مجانی کسب‌وکار در {categoryConfig.name}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
