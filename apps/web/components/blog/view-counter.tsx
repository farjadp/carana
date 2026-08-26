// ============================================================================
// Source: components/blog/view-counter.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Count article views. Renders nothing.
// Env / Identity: Client. Calls a SECURITY DEFINER function that can only
//      increment a counter — anon has no UPDATE on blog_posts.
//
// Counted in the browser rather than during the server render, because the
// article page is ISR-cached for ten minutes: a server-side increment would
// count once per cache regeneration instead of once per reader. The app calls
// the same function, so the number is the total across both surfaces.
// ============================================================================
"use client";

import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function BlogViewCounter({ postId }: { postId: string }) {
  // React runs effects twice in development. Without this guard every local
  // page load counts as two.
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;

    // Fire and forget. A failed count must never surface to the reader or
    // block anything on the page — it is a metric, not a feature.
    createSupabaseBrowserClient()
      .rpc("increment_blog_post_view", { target_id: postId })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("blog view count failed:", error.message);
      });
  }, [postId]);

  return null;
}
