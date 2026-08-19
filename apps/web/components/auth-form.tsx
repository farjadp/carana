// ============================================================================
// Source: components/auth-form.tsx
// Version: 2.0.0 — 2026-08-11
// Why: Premium, user-friendly split-panel auth layout with lazy env and password show/hide.
// Env / Identity: Uses client-side browser client and standard signup API.
// ============================================================================
"use client";

import { authErrorMessage } from "@goplaza/core";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Search,
  Award,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getSafeNextPath } from "@/lib/auth/redirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logUserActivity } from "@/lib/actions/logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    title: "خوش آمدید",
    description:
      "برای مدیریت کسب‌وکار و دسترسی به پنل خود وارد حساب کاربری شوید.",
    submit: "ورود به حساب کاربری",
  },
  signup: {
    title: "ایجاد حساب کاربری",
    description:
      "کسب‌وکار خود را ثبت کنید، تصاویر قرار دهید و توسط مشتریان ایرانی کشف شوید.",
    submit: "ایجاد حساب و شروع",
  },
  forgot: {
    title: "بازیابی رمز عبور",
    description: "ایمیل خود را وارد کنید تا لینک بازیابی برای شما ارسال شود.",
    submit: "ارسال لینک بازیابی",
  },
  "update-password": {
    title: "تعریف رمز جدید",
    description: "یک رمز عبور جدید و ایمن برای حساب کاربری خود تعریف کنید.",
    submit: "ثبت رمز عبور جدید",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const copy = useMemo(() => modeCopy[mode], [mode]);
  const nextParam = searchParams.get("next");
  const nextPath = useMemo(
    () => getSafeNextPath(nextParam),
    [nextParam]
  );

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

        // Log the login activity asynchronously without blocking the redirect
        logUserActivity("LOGIN", { method: "password" }).catch(console.error);

        setSuccess("ورود موفقیت‌آمیز بود. در حال انتقال...");
        router.replace(nextPath);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            email,
            password,
          }),
        });

        const result = (await response.json()) as {
          error?: string;
          status?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "ثبت‌نام کامل نشد.");
        }

        if (result.status === "created_and_confirmed") {
          const { error: signInAfterSignupError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInAfterSignupError) {
            throw signInAfterSignupError;
          }

          setSuccess("ثبت‌نام موفقیت‌آمیز بود. در حال انتقال به داشبورد...");
          router.replace("/auth/signup-success");
          router.refresh();
          return;
        }

        router.replace("/auth/check-email");
        return;
      }

      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
        });

        if (resetError) throw resetError;

        router.replace("/auth/recovery-sent");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setSuccess("رمز عبور با موفقیت تغییر کرد. در حال انتقال به صفحه ورود...");
      router.replace("/auth/login?reset=success");
      router.refresh();
    } catch (caughtError) {
      setError(authErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        }
      });
      if (signInError) throw signInError;
    } catch (caughtError) {
      setError(authErrorMessage(caughtError, "خطایی در ورود با گوگل رخ داد."));
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-container">
      {/* Left Column: Branding Showcase (Hidden on Mobile) */}
      <div className="auth-brand-side">
        <div className="brand-side-header">
          <Link href="/" className="brand-side-logo">
            <span className="brand-side-mark"><BrandMark size={30} color="#fff" /></span>
            <div className="brand-side-copy">
              <strong>GOPLAZA</strong>
              <span>دایرکتوری ایرانیان کانادا</span>
            </div>
          </Link>
        </div>

        <div className="brand-side-body">
          <span className="brand-side-badge">پلتفرم رشد و کشف بیزینس</span>
          <h2>مرجع ارتباط فارسی‌زبانان و کسب‌وکارهای ایرانی در کانادا</h2>
          <p className="brand-side-description">
            با حضور در گوپلازا، کسب‌وکارتان را پیش روی جامعه بزرگ ایرانی مقیم کانادا قرار دهید، لیدهای باکیفیت دریافت کنید و برند شخصی خود را ارتقا بخشید.
          </p>

          <div className="feature-bullets">
            <div className="feature-bullet">
              <div className="bullet-icon-wrapper">
                <Search size={18} />
              </div>
              <div>
                <strong>جستجو و کشف هوشمند</strong>
                <p>کاربران می‌توانند بیزینس‌های ایرانی را بر اساس دسته‌بندی و شهر پیدا کنند.</p>
              </div>
            </div>
            
            <div className="feature-bullet">
              <div className="bullet-icon-wrapper">
                <Award size={18} />
              </div>
              <div>
                <strong>مدیریت اختصاصی صفحه</strong>
                <p>ساعات کاری، تصاویر، منوها، آدرس، تلفن و جزئیات بیزینس را خودتان تغییر دهید.</p>
              </div>
            </div>

            <div className="feature-bullet">
              <div className="bullet-icon-wrapper">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>سیستم تایید اعتبار مالکیت</strong>
                <p>فرآیند امن Claim برای کسب اطمینان از صحت اطلاعات و جلوگیری از دسترسی غیرمجاز.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="brand-side-footer">
          <div className="stats-box">
            <div>
              <strong>۲۰,۰۰۰+</strong>
              <span>کسب‌وکارهای ثبت‌شده</span>
            </div>
            <div className="stats-divider" />
            <div>
              <span>تورنتو، ونکوور، مونترال</span>
              <strong>پوشش سراسری کانادا</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Glassmorphic Auth Form */}
      <div className="auth-form-side">
        <div className="auth-glass-card">
          <div className="auth-card-header">
            <h1 className="auth-card-title">{copy.title}</h1>
            <p className="auth-card-subtitle">{copy.description}</p>
          </div>

          {mode !== "update-password" ? (
            <div className="auth-tab-switcher" role="tablist">
              <Link 
                href={`/auth/login${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`}
                className={`tab-btn ${mode === "login" ? "is-active" : ""}`}
              >
                ورود
              </Link>
              <Link 
                href={`/auth/signup${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`}
                className={`tab-btn ${mode === "signup" ? "is-active" : ""}`}
              >
                ثبت‌نام
              </Link>
              <Link 
                href={`/auth/forgot-password${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`}
                className={`tab-btn ${mode === "forgot" ? "is-active" : ""}`}
              >
                فراموشی رمز
              </Link>
            </div>
          ) : null}

          {mode === "login" || mode === "signup" ? (
            <div className="flex flex-col gap-4 mb-6">
              <Button
                type="button"
                variant="muted"
                className="w-full flex items-center justify-center gap-2 h-11 border-gray-300 font-bold bg-white text-gray-700 hover:bg-gray-50 transition shadow-sm rounded-xl"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
                ادامه با حساب گوگل
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/80 backdrop-blur px-3 rounded-full text-gray-500 font-bold">یا با ایمیل</span>
                </div>
              </div>
            </div>
          ) : null}

          <form className="auth-main-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <div className="form-group">
                <Label htmlFor="full-name">نام و نام خانوادگی</Label>
                <div className="input-wrapper">
                  <UserIcon className="input-icon" size={18} />
                  <Input
                    id="full-name"
                    name="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="مثال: مریم کریمی"
                    required
                    className="pr-11"
                  />
                </div>
              </div>
            ) : null}

            {mode !== "update-password" ? (
              <div className="form-group">
                <Label htmlFor="email">نشانی ایمیل</Label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@domain.com"
                    required
                    className="pr-11"
                  />
                </div>
              </div>
            ) : null}

            {mode !== "forgot" ? (
              <div className="form-group">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">
                    {mode === "update-password" ? "رمز عبور جدید" : "رمز عبور"}
                  </Label>
                  {mode === "login" ? (
                    <Link href="/auth/forgot-password" className="forgot-password-link">
                      رمز خود را فراموش کرده‌اید؟
                    </Link>
                  ) : null}
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="pr-11 pl-11"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "مخفی‌سازی رمز عبور" : "نمایش رمز عبور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="auth-alert is-error">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {success ? (
              <div className="auth-alert is-success">
                <CheckCircle2 size={18} className="flex-shrink-0" />
                <span>{success}</span>
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "در حال پردازش..." : copy.submit}
            </Button>
          </form>

          {mode === "login" ? (
            <div className="auth-card-footer">
              <span>عضو نیستید؟</span>
              <Link href="/auth/signup" className="footer-link">
                ثبت‌نام کنید
              </Link>
            </div>
          ) : (
            <div className="auth-card-footer">
              <span>حساب کاربری دارید؟</span>
              <Link href="/auth/login" className="footer-link">
                وارد شوید
              </Link>
            </div>
          )}

          <div className="auth-back-to-home">
            <Link href="/" className="back-link">
              <ChevronLeft size={16} />
              <span>بازگشت به خانه</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
