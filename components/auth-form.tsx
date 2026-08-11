// ============================================================================
// Source: components/auth-form.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Centralize Supabase-based login, signup, and password recovery flows.
// Env / Identity: Uses public Supabase env via the shared browser client.
// ============================================================================
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

type AuthMode = "login" | "signup" | "forgot" | "update-password";

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submit: string;
  }
> = {
  login: {
    title: "ورود به پنل کاربری",
    description:
      "برای مدیریت کسب‌وکار، پیگیری درخواست‌ها و دسترسی به پنل خودت وارد حساب کاربری شو.",
    submit: "ورود",
  },
  signup: {
    title: "ایجاد حساب و شروع ثبت کسب‌وکار",
    description:
      "ثبت‌نام برای صاحبین کسب‌وکار، مدیران برند و افرادی است که می‌خواهند کسب‌وکار خودشان را claim یا منتشر کنند.",
    submit: "ایجاد حساب",
  },
  forgot: {
    title: "بازیابی رمز عبور",
    description:
      "ایمیل حساب را وارد کن تا لینک بازیابی رمز برایت ارسال شود.",
    submit: "ارسال لینک بازیابی",
  },
  "update-password": {
    title: "تعریف رمز جدید",
    description: "رمز تازه‌ات را وارد کن تا دسترسی به حساب دوباره برقرار شود.",
    submit: "ثبت رمز جدید",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const copy = useMemo(() => modeCopy[mode], [mode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        setSuccess("ورود موفق بود. در حال انتقال به داشبورد...");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              desired_role: "business_owner",
            },
            emailRedirectTo: `${window.location.origin}/auth/login`,
          },
        });

        if (signUpError) throw signUpError;

        setSuccess(
          "حساب ساخته شد. اگر تأیید ایمیل فعال باشد، لینک تأیید برایت ارسال شده است."
        );
        return;
      }

      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });

        if (resetError) throw resetError;

        setSuccess("لینک بازیابی رمز برای ایمیل واردشده ارسال شد.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setSuccess("رمز عبور با موفقیت تغییر کرد. حالا می‌توانی وارد شوی.");
      router.push("/auth/login");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "خطایی رخ داد. دوباره تلاش کن.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">ورود و دسترسی</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>

      <div className="auth-tabs" role="tablist" aria-label="حالت‌های احراز هویت">
        <Link href="/auth/login" aria-current={mode === "login" ? "page" : undefined}>
          ورود
        </Link>
        <Link href="/auth/signup" aria-current={mode === "signup" ? "page" : undefined}>
          ثبت‌نام
        </Link>
        <Link href="/auth/forgot-password" aria-current={mode === "forgot" ? "page" : undefined}>
          فراموشی رمز
        </Link>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <div>
            <Label htmlFor="full-name">نام و نام خانوادگی</Label>
            <Input
              id="full-name"
              name="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="مثلاً فرجاد پوریوسفی"
              required
            />
          </div>
        ) : null}

        {mode !== "update-password" ? (
          <div>
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        ) : null}

        {mode !== "forgot" ? (
          <div>
            <Label htmlFor="password">
              {mode === "update-password" ? "رمز جدید" : "رمز عبور"}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
        ) : null}

        {error ? <p className="auth-message is-error">{error}</p> : null}
        {success ? <p className="auth-message is-success">{success}</p> : null}

        <Button type="submit" disabled={loading}>
          {loading ? "در حال انجام..." : copy.submit}
        </Button>
      </form>

      <div className="auth-meta">
        <strong>سطوح دسترسی در فاز اول</strong>
        <p>
          مهمان، کاربر ثبت‌نام‌شده، صاحب کسب‌وکار، و ادمین. نقش‌های moderator و support را
          می‌توانیم در فاز بعد اضافه کنیم.
        </p>
      </div>
    </div>
  );
}
