// ============================================================================
// Source: app/api/suggestions/route.ts
// Version: 1.0.0 — 2026-08-15
// Why: One door for "tell us what you want" from both the website and the app.
//      Accepts multipart form data: optional `text`, optional `voice` (audio
//      file), `source`, `page`, `contact`. Anyone may post — a suggestion box
//      that demands sign-in collects nothing — so the write goes through the
//      service role and the table has no anon policy. If a session is present
//      (cookie on web, Bearer from the app) the row is attributed to it.
// Env / Identity: Server only. Rate-limited per user or per IP.
// ============================================================================
import { NextResponse } from "next/server";

import { authenticateBearer } from "@/lib/auth/bearer";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const MAX_TEXT = 2000;
const MAX_VOICE_BYTES = 8 * 1024 * 1024; // ~3 min of webm/m4a
const MAX_VOICE_SECONDS = 180;

const AUDIO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

async function resolveUserId(req: Request): Promise<string | null> {
  const bearer = await authenticateBearer(req);
  if (bearer) return bearer.user.id;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const userId = await resolveUserId(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`suggestions:${userId ?? `ip:${ip}`}`, 10, 60 * 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "پیشنهادهای زیادی فرستاده‌اید. کمی بعد دوباره تلاش کنید." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const text = String(form.get("text") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  const contact = String(form.get("contact") ?? "").trim().slice(0, 200) || null;
  const source = form.get("source") === "mobile" ? "mobile" : "web";
  const page = String(form.get("page") ?? "").slice(0, 200) || null;
  const voice = form.get("voice");
  const voiceSecondsRaw = Number(form.get("voice_seconds") ?? 0);
  const voiceSeconds = Number.isFinite(voiceSecondsRaw) ? Math.min(Math.round(voiceSecondsRaw), MAX_VOICE_SECONDS) : null;

  const hasVoice = voice instanceof File && voice.size > 0;
  if (!text && !hasVoice) {
    return NextResponse.json({ success: false, error: "چیزی بنویسید یا صدایتان را ضبط کنید." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  let voicePath: string | null = null;

  if (hasVoice) {
    const file = voice as File;
    if (file.size > MAX_VOICE_BYTES) {
      return NextResponse.json({ success: false, error: "فایل صدا بزرگ‌تر از حد مجاز است." }, { status: 413 });
    }
    const mime = (file.type || "").split(";")[0].toLowerCase();
    const ext = AUDIO_EXT[mime] ?? (file.name.split(".").pop() || "bin").toLowerCase();
    if (!AUDIO_EXT[mime] && !Object.values(AUDIO_EXT).includes(ext)) {
      return NextResponse.json({ success: false, error: "فرمت صدا پشتیبانی نمی‌شود." }, { status: 415 });
    }
    const day = new Date().toISOString().slice(0, 10);
    voicePath = `${day}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("suggestions")
      .upload(voicePath, file, { contentType: mime || undefined, upsert: false });
    if (upErr) {
      console.error("suggestions: voice upload failed", upErr);
      return NextResponse.json({ success: false, error: "آپلود صدا ناموفق بود." }, { status: 500 });
    }
  }

  const { error } = await admin.from("suggestions").insert({
    user_id: userId,
    body: text || null,
    voice_path: voicePath,
    voice_seconds: hasVoice ? voiceSeconds : null,
    contact,
    source,
    page,
  });

  if (error) {
    console.error("suggestions: insert failed", error);
    return NextResponse.json({ success: false, error: "ثبت پیشنهاد ناموفق بود." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
