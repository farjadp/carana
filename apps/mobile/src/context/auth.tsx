// ============================================================================
// Source: apps/mobile/src/context/auth.tsx
// Version: 1.0.0 — 2026-08-24
// Why: One place that knows whether someone is signed in. Screens read it
//      instead of each calling supabase.auth themselves and drifting.
// Env / Identity: The session lives in expo-secure-store; this only observes it.
// ============================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  mobile_number: string | null;
  avatar_url: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the stored session has been read; screens wait on this. */
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, mobile_number, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    setProfile((data ?? null) as Profile | null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadProfile(data.session?.user.id).finally(() => setLoading(false));
    });

    // Fires on sign-in, sign-out and token refresh.
    //
    // supabase-js holds an internal lock while this callback runs, and calling
    // back into the client from inside it deadlocks — the session updates but
    // the profile query never resolves. Defer the query to the next tick so the
    // lock is released first.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => loadProfile(next?.user.id), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile: () => loadProfile(session?.user.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [session, profile, loading, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
