// ============================================================================
// Source: lib/actions/logs.ts
// Version: 1.0.0 — 2026-08-12
// Why: Centralized Server Action to safely log user activities into user_activity_logs.
// Env / Identity: Server-side execution, captures headers for geolocation/IP.
// ============================================================================
"use server";

import { headers } from "next/headers";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export type ActivityAction =
  | "SIGNUP"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_UPDATE"
  | "PROFILE_UPDATE"
  | "SECURITY_ALERT";

export async function logUserActivity(
  actionType: ActivityAction,
  metadata: Record<string, any> = {},
  targetUserId?: string
) {
  try {
    const supabase = await createSupabaseActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If an admin is acting on a user, they provide targetUserId
    // Otherwise it defaults to the current session user
    const finalUserId = targetUserId || user?.id;

    if (!finalUserId) return { success: false, error: "No user context" };

    // Capture IP from Next.js headers
    const reqHeaders = await headers();
    const forwardedFor = reqHeaders.get("x-forwarded-for");
    const realIp = reqHeaders.get("x-real-ip");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : realIp || "unknown";

    const { error } = await supabase.from("user_activity_logs").insert({
      user_id: finalUserId,
      action: actionType,
      ip_address: ipAddress,
      metadata: metadata,
    });

    if (error) {
      console.error("DB Log Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Activity logging failed:", err);
    return { success: false, error: "Internal error" };
  }
}
