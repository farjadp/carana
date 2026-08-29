// ============================================================================
// Source: app/auth/callback/callback-client.tsx
// Version: 1.0.0 — 2026-08-27
// Why: Finish an auth redirect from either shape Supabase can send back.
//
//      Until now this route was a server Route Handler that read `?code=` and
//      nothing else, and redirected to /auth/error whenever that was absent.
//      Supabase also answers with the session in the URL **fragment**
//      (`#access_token=…&refresh_token=…`) — proven against a real
//      confirmation link on 27 Aug — and a fragment never reaches a server, so
//      that shape could only ever produce the error page. Nothing in the app
//      read `location.hash`.
//
//      This component runs in the browser, where the fragment exists.
// Env / Identity: Client. The browser Supabase client is the @supabase/ssr
//      one, so setSession() writes the same cookies the server reads.
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completeCodeExchange, recordFragmentLogin } from "./actions";

type Props = { code: string | null; next: string };

export function CallbackClient({ code, next }: Props) {
  const [message, setMessage] = useState("در حال تکمیل ورود…");
  const ran = useRef(false);

  useEffect(() => {
    // React runs effects twice in development; a code may be exchanged once.
    if (ran.current) return;
    ran.current = true;

    const fail = (reasonCode: string, detail?: string) => {
      const params = new URLSearchParams({ code: reasonCode });
      if (detail) params.set("reason", detail);
      window.location.replace(`/auth/error?${params.toString()}`);
    };

    const go = () => {
      // replace, not assign: the tokens are in this URL and it must not stay
      // in history where the back button would replay it.
      window.location.replace(next);
    };

    (async () => {
      // ── 1. the PKCE shape ────────────────────────────────────────────────
      if (code) {
        const result = await completeCodeExchange(code);
        if (result.ok) return go();
        return fail(result.code, result.reason);
      }

      // ── 2. the implicit shape: everything is in the fragment ─────────────
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const frag = new URLSearchParams(hash);

      const fragError = frag.get("error_code") || frag.get("error");
      if (fragError) {
        return fail(fragError, frag.get("error_description") ?? undefined);
      }

      const accessToken = frag.get("access_token");
      const refreshToken = frag.get("refresh_token");
      if (accessToken && refreshToken) {
        setMessage("در حال ساختن نشست…");
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) return fail("session_failed", error.message);
        await recordFragmentLogin(data.user?.id ?? null);
        return go();
      }

      // ── 3. neither ──────────────────────────────────────────────────────
      // No code, no tokens, no error: the link carried nothing. Usually a
      // bare visit to /auth/callback, or a mail client that stripped the
      // fragment.
      fail("no_credentials");
    })();
  }, [code, next]);

  return (
    <p className="auth-paragraph" role="status" aria-live="polite">
      {message}
    </p>
  );
}
