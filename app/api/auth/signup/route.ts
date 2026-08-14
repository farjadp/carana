// ============================================================================
// Source: app/api/auth/signup/route.ts
// Version: 1.5.0 — 2026-08-11
// Why: Create test-friendly signups with optional auto-confirm or standard email confirmations.
// Env / Identity: Uses Supabase admin for test-safe auto-confirm or public client for real confirmation emails.
// ============================================================================
import { type NextRequest, NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

type SignupPayload = {
  fullName?: string;
  email?: string;
  password?: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SignupPayload;
  const fullName = body.fullName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: "نام، ایمیل و رمز عبور الزامی هستند." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "فرمت ایمیل معتبر نیست." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "رمز عبور باید حداقل ۸ کاراکتر باشد." },
      { status: 400 }
    );
  }

  // 1. If testing flag is enabled, bypass email confirmation using Admin SDK
  if (serverEnv.disableEmailConfirmationForTesting) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        desired_role: "business_owner",
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 400 }
      );
    }

    return NextResponse.json({
      status: "created_and_confirmed",
      userId: data.user.id,
    });
  }

  // 2. Otherwise, standard production-ready signup
  const { supabase, getResponse } = createSupabaseRouteHandlerClient(request);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=/auth/signup-success`,
      data: {
        full_name: fullName,
        desired_role: "business_owner",
      },
    },
  });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status ?? 400 }
    );
  }

  const baseResponse = getResponse();
  const responseInit = {
    status: 200,
    headers: new Headers(baseResponse.headers),
  };

  // If auto-confirm is enabled at Supabase console level, a session is returned immediately
  if (data.session) {
    const res = NextResponse.json({
      status: "created_and_confirmed",
      userId: data.user?.id,
    }, responseInit);

    for (const cookie of baseResponse.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return res;
  }

  // Otherwise, email confirmation link is sent and user creation is pending verification
  const res = NextResponse.json({
    status: "requires_email_confirmation",
    message: "ثبت‌نام موفقیت‌آمیز بود. لطفاً صندوق ورودی ایمیل خود را جهت تایید بررسی کنید.",
  }, responseInit);

  for (const cookie of baseResponse.cookies.getAll()) {
    res.cookies.set(cookie);
  }
  return res;
}
