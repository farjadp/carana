"use client";

import { useState } from "react";
import { Bookmark, MapPin, CheckCircle, Star, PenLine, Heart, MessageSquare, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { upsertUserInteraction } from "@/lib/actions/interactions";
import { toast } from "sonner";
import InteractionModal from "./interaction-modal";

interface InteractionBarProps {
  businessId: string;
  initialInteraction?: any;
}

export default function InteractionBar({ businessId, initialInteraction }: InteractionBarProps) {
  const [status, setStatus] = useState<string>(initialInteraction?.personal_status || "none");
  const [notify, setNotify] = useState<boolean>(!!initialInteraction?.notify_announcements);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleNotify = async () => {
    const next = !notify;
    setNotifyLoading(true);
    setNotify(next); // optimistic
    const res = await upsertUserInteraction(businessId, { notify_announcements: next });
    setNotifyLoading(false);
    if (res.success) {
      toast.success(next ? "با اعلان‌های تازه‌ی این کسب‌وکار ایمیل می‌گیری" : "اطلاع‌رسانی اعلان‌ها خاموش شد");
    } else {
      setNotify(!next);
      toast.error(res.error || "خطایی رخ داد");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Toggle logic: if clicking the same status, set it back to none
    const updatedStatus = status === newStatus ? "none" : newStatus;
    
    setIsLoading(true);
    setStatus(updatedStatus); // Optimistic UI

    const res = await upsertUserInteraction(businessId, { personal_status: updatedStatus as any });
    
    setIsLoading(false);
    
    if (res.success) {
      toast.success(updatedStatus === "none" ? "از لیست شما حذف شد" : "با موفقیت ذخیره شد");
      
      // If user marks as visited, suggest they write a note/review
      if (updatedStatus.startsWith("visited_") || updatedStatus === "customer") {
        setTimeout(() => setIsModalOpen(true), 500);
      }
    } else {
      setStatus(status); // Revert on error
      toast.error(res.error || "خطایی رخ داد");
    }
  };

  return (
    <>
      <div className="bg-white border border-[color:var(--line)] rounded-2xl p-4 shadow-sm flex flex-wrap gap-2 items-center justify-between" dir="rtl">
        
        <div className="flex gap-2">
          <Button 
            variant={status === "saved" ? "solid" : "muted"}
            onClick={() => handleStatusChange("saved")}
            disabled={isLoading}
          >
            <Bookmark size={16} className={`ml-1.5 ${status === "saved" ? "fill-current" : ""}`} />
            ذخیره
          </Button>

          <Button 
            variant={status === "want_to_go" ? "solid" : "muted"}
            onClick={() => handleStatusChange("want_to_go")}
            disabled={isLoading}
          >
            <MapPin size={16} className={`ml-1.5 ${status === "want_to_go" ? "fill-current" : ""}`} />
            می‌خوام برم
          </Button>
          
          <Button
            variant={status === "customer" || status.startsWith("visited_") ? "solid" : "muted"}
            onClick={() => handleStatusChange("customer")}
            disabled={isLoading}
          >
            <CheckCircle size={16} className="ml-1.5" />
            رفتم
          </Button>

          {/* Separate from "ذخیره" on purpose — bookmarking and asking for
              email about new announcements are different intents, and
              defaulting one to the other would be an email nobody asked
              for. */}
          <Button
            variant={notify ? "solid" : "muted"}
            onClick={toggleNotify}
            disabled={notifyLoading}
            title={notify ? "اطلاع‌رسانی اعلان‌ها روشن است" : "با اعلان‌های تازه باخبر شو"}
          >
            {notify ? <Bell size={16} className="ml-1.5 fill-current" /> : <BellOff size={16} className="ml-1.5" />}
            {notify ? "باخبرم" : "باخبرم کن"}
          </Button>
        </div>

        <div>
          <Button 
            variant="muted"
            onClick={() => setIsModalOpen(true)}
          >
            <MessageSquare className="h-4 w-4 ml-2" />
            <PenLine size={16} className="ml-1.5" />
            ثبت تجربه / یادداشت
          </Button>
        </div>

      </div>

      <InteractionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        businessId={businessId}
        initialInteraction={initialInteraction}
      />
    </>
  );
}
