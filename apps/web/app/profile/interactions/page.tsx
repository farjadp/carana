import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import InteractionsClient from "./interactions-client";
import { NotebookPen } from "lucide-react";

export const metadata = {
  title: "تعاملات من",
  description: "مدیریت ذخیره‌شده‌ها، یادداشت‌ها و نظرات شما در پلتفرم چارانا",
};

export default async function InteractionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/profile/interactions");
  }

  // گرفتن تمام Interaction ها به همراه مشخصات کسب‌وکار
  const { data: interactions, error: interactionsError } = await supabase
    .from("user_business_interactions")
    .select(`
      *,
      business:businesses(id, name, name_en, category, city, logo_url, slug)
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // گرفتن تمام Review های عمومی کاربر
  const { data: publicReviews, error: reviewsError } = await supabase
    .from("public_reviews")
    .select(`
      *,
      business:businesses(id, name, name_en, category, city, logo_url, slug)
    `)
    .eq("user_id", user.id)
    .neq("status", "deleted_by_user")
    .order("updated_at", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 md:p-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-[color:var(--text)] mb-3 flex items-center justify-center gap-3">
            <span className="bg-[color:var(--lajvard)]/10 text-[color:var(--lajvard)] p-3 rounded-2xl">
              <NotebookPen size={28} />
            </span>
            دفترچه تعاملات من
          </h1>
          <p className="text-[color:var(--muted-text)] text-sm md:text-base max-w-2xl mx-auto">
            کسب‌وکارهای ذخیره‌شده، مکان‌هایی که قصد دارید بروید، یادداشت‌های خصوصی و نظرات عمومی شما.
          </p>
        </div>

        <InteractionsClient 
          interactions={interactions || []} 
          publicReviews={publicReviews || []} 
        />
      </div>
    </div>
  );
}
