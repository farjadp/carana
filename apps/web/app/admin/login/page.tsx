// ============================================================================
// Source: app/admin/login/page.tsx
// Version: 1.0.0 — 2026-08-11
// Why: Provide a dedicated, highly secure admin login gateway.
// Env / Identity: Standard client-side auth with role-based checks.
// ============================================================================
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Sign in the user
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // 2. Check if they have the admin role in Profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error("پروفایل مدیریتی شما یافت نشد.");
      }

      if (profile.role !== "admin" && profile.role !== "moderator") {
        await supabase.auth.signOut();
        throw new Error("شما مجوز دسترسی به این پنل را ندارید.");
      }

      setSuccess("احراز هویت ادمین موفقیت‌آمیز بود. ورود به پنل...");
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطایی رخ داد.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-layout">
      <div className="admin-login-glass-card">
        <div className="admin-login-header">
          <div className="admin-shield-icon">
            <ShieldCheck size={28} />
          </div>
          <h1>پنل مدیریت پلازا</h1>
          <p>دروازه کنترل و نظارت امنیتی پلتفرم</p>
        </div>

        <form onSubmit={handleLogin} className="admin-login-form">
          <div className="form-group">
            <Label htmlFor="admin-email">ایمیل ادمین</Label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="pr-11"
              />
            </div>
          </div>

          <div className="form-group">
            <Label htmlFor="admin-password">رمز عبور امنیتی</Label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pr-11 pl-11"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="auth-alert is-error">
              <ShieldAlert size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="auth-alert is-success">
              <ShieldCheck size={18} className="flex-shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          <Button type="submit" disabled={loading} className="admin-login-btn">
            {loading ? "در حال تایید اعتبار..." : "احراز هویت و ورود"}
          </Button>
        </form>

        <div className="admin-login-footer">
          <Link href="/" className="back-link">
            <ArrowRight size={16} />
            <span>بازگشت به سایت اصلی</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
