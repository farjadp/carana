// ============================================================================
// Source: components/business/view-counter.tsx
// Version: 1.0.0 — 2026-08-27
// Why: Count profile views so "most visited" means something. Renders nothing.
// Env / Identity: Client. Calls a SECURITY DEFINER function that can only
//      increment a counter — anon has no UPDATE on businesses.
//
// Counted in the browser rather than during the server render, because the
// page is ISR-cached for 60 seconds: a server-side increment would count once
// per cache regeneration instead of once per visitor.
// ============================================================================
"use client";

import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ViewCounter({ businessId }: { businessId: string }) {
  // React runs effects twice in development. Without this guard every local
  // page load counts as two.
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;

    // Fire and forget. A failed count must never surface to the visitor or
    // block anything on the page — it is a metric, not a feature.
    createSupabaseBrowserClient()
      .rpc("increment_business_view", { target_id: businessId })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("view count failed:", error.message);
      });
  }, [businessId]);

  return null;
}
