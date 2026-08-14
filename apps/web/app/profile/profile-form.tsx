// ============================================================================
// Source: app/profile/profile-form.tsx
// Version: 1.0.0 — 2026-08-12
// Why: Client side form to allow users to update their profile and view progress.
// ============================================================================
"use client";

import { useState } from "react";
import { Loader2, Save, Key, Upload, User, Calendar, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ImageUploader } from "@/components/ui/image-uploader";
import { updateUserProfile, sendPasswordResetEmail } from "./actions";
import { calculateUserProfileProgress } from "@/lib/utils/progress";

interface ProfileFormProps {
  profile: any;
  email: string;
}

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Local state for optimistic progress bar updates
  const [localProfile, setLocalProfile] = useState({
    full_name: profile?.full_name || "",
    avatar_url: profile?.avatar_url || "",
    mobile_number: profile?.mobile_number || "",
    birth_date: profile?.birth_date || "",
  });

  const progress = calculateUserProfileProgress(localProfile);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    // Append the current avatar URL since ImageUploader doesn't use a native input by default unless configured
    formData.set("avatar_url", localProfile.avatar_url);
    
    const res = await updateUserProfile(formData);
    if (!res.success) {
      alert(res.error);
    } else {
      alert("تغییرات با موفقیت ذخیره شد!");
    }
    setIsSaving(false);
  };

  const handlePasswordReset = async () => {
    if (!confirm("آیا مطمئن هستید که می‌خواهید لینک تغییر رمز عبور برای شما ایمیل شود؟")) return;
    setIsResetting(true);
    const res = await sendPasswordResetEmail();
    if (res.success) {
      alert("لینک بازنشانی رمز عبور به ایمیل شما ارسال شد.");
    } else {
      alert(res.error);
    }
    setIsResetting(false);
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Progress Bar Section */}
      <div className="bg-white border border-[color:var(--line)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800">میزان تکمیل پروفایل شما</h3>
          <span className="text-sm font-bold text-[color:var(--lajvard)]">{progress}٪</span>
        </div>
        <Progress value={progress} className="h-2 w-full" />
        <p className="text-xs text-gray-500 mt-2">
          با تکمیل پروفایل خود، تجربه بهتری از پلتفرم خواهید داشت و کسب‌وکارها می‌توانند ارتباط موثرتری با شما بگیرند.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-[color:var(--line)] rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-lg border-b pb-3 border-gray-100">اطلاعات شخصی</h3>
        
        {/* Avatar Upload */}
        <div className="flex flex-col items-center sm:items-start sm:flex-row gap-6 mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
            {localProfile.avatar_url ? (
              <img src={localProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={32} className="text-gray-300" />
            )}
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-right">
            <Label className="font-semibold block">تصویر پروفایل</Label>
            <ImageUploader
              bucketName="avatars"
              onChange={(url) => setLocalProfile({ ...localProfile, avatar_url: url })}
              label="آپلود تصویر جدید"
              value={localProfile.avatar_url}
            />
            <p className="text-xs text-gray-400">حداکثر حجم ۲ مگابایت. فرمت‌های PNG و JPG.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 font-medium"><User size={15}/> نام و نام خانوادگی</Label>
            <Input 
              name="full_name" 
              value={localProfile.full_name}
              onChange={(e) => setLocalProfile({...localProfile, full_name: e.target.value})}
              placeholder="مثال: علی رضایی" 
              className="h-11 rounded-xl"
            />
          </div>

          {/* Email (Readonly for now) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 font-medium text-gray-600"><Mail size={15}/> آدرس ایمیل (غیرقابل تغییر)</Label>
            <Input 
              value={email}
              readOnly
              className="h-11 rounded-xl bg-gray-50 text-left text-gray-500 cursor-not-allowed"
              dir="ltr"
            />
          </div>

          {/* Mobile */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 font-medium"><Phone size={15}/> شماره موبایل</Label>
            <Input 
              name="mobile_number" 
              value={localProfile.mobile_number}
              onChange={(e) => setLocalProfile({...localProfile, mobile_number: e.target.value})}
              placeholder="مثال: 0014161234567" 
              dir="ltr"
              className="h-11 rounded-xl"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 font-medium"><Calendar size={15}/> تاریخ تولد</Label>
            <Input 
              type="date"
              name="birth_date" 
              value={localProfile.birth_date}
              onChange={(e) => setLocalProfile({...localProfile, birth_date: e.target.value})}
              className="h-11 rounded-xl block w-full"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <Button 
            type="button" 
            variant="ghost" 
            className="text-red-600 hover:bg-red-50 hover:text-red-700 text-sm gap-1.5"
            onClick={handlePasswordReset}
            disabled={isResetting}
          >
            {isResetting ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
            تغییر رمز عبور
          </Button>

          <Button 
            type="submit" 
            className="bg-[color:var(--lajvard)] hover:bg-[color:var(--primary)] text-white px-8 h-11 rounded-xl gap-2"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            ذخیره اطلاعات
          </Button>
        </div>
      </form>
    </div>
  );
}
