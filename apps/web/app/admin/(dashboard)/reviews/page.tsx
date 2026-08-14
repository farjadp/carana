import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminReviewsClient from "./reviews-client";

export const metadata = {
  title: "بررسی نظرات | پنل مدیریت",
};

export default async function AdminReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Basic admin check (Assuming is_admin check is done in layout, but double checking here)
  if (!user) {
    redirect("/admin/login");
  }

  // Fetch pending reviews
  const { data: pendingReviews } = await supabase
    .from("public_reviews")
    .select(`
      *,
      business:businesses(id, name),
      author:auth.users!public_reviews_user_id_fkey(email)
    `)
    .eq("status", "pending_moderation")
    .order("created_at", { ascending: false });

  // Fetch recently reviewed (last 50)
  const { data: recentReviews } = await supabase
    .from("public_reviews")
    .select(`
      *,
      business:businesses(id, name)
    `)
    .in("status", ["approved", "published", "rejected", "needs_changes"])
    .order("reviewed_at", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">مدیریت نظرات</h1>
        <p className="text-gray-500">نظرات ارسال شده کاربران را بررسی، تایید و یا رد کنید.</p>
      </div>

      <AdminReviewsClient 
        pendingReviews={pendingReviews || []} 
        recentReviews={recentReviews || []} 
      />
    </div>
  );
}
