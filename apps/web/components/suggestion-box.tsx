// ============================================================================
// Source: components/suggestion-box.tsx
// Version: 1.0.0 — 2026-08-15
// Why: "Tell us what you want" — typed or spoken, whichever is easier. Sits on
//      the home page, the support page and the empty search result, and posts
//      to /api/suggestions. No sign-in required: a suggestion box that asks
//      people to register first collects nothing.
// Env / Identity: Client component. Reads no auth; the API attributes the row
//      to the cookie session if there is one.
// ============================================================================
"use client";

import { useState } from "react";
import { CheckCircle2, Lightbulb, Mic, Send, Square, Trash2 } from "lucide-react";

import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function SuggestionBox({
  page,
  compact = false,
  title = "چی کم داریم؟ بهمون بگو.",
  hint = "دنبال چه کسب‌وکار یا امکانی بودی که پیدا نکردی؟ بنویس، یا اگر راحت‌تری، بگو.",
}: {
  page: string;
  compact?: boolean;
  title?: string;
  hint?: string;
}) {
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useVoiceRecorder(180);

  const canSend = !sending && (text.trim().length > 0 || !!rec.audioBlob);

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("text", text.trim());
      fd.set("contact", contact.trim());
      fd.set("source", "web");
      fd.set("page", page);
      if (rec.audioBlob) {
        fd.set("voice", rec.audioBlob, "voice.webm");
        fd.set("voice_seconds", String(rec.recordingTime));
      }
      const res = await fetch("/api/suggestions", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "ارسال ناموفق بود.");
      setDone(true);
      setText("");
      setContact("");
      rec.resetRecording();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال ناموفق بود.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className={`sbox is-done${compact ? " is-compact" : ""}`}>
        <CheckCircle2 size={22} />
        <div>
          <strong>رسید. ممنون.</strong>
          <p>هر پیشنهاد را خودمان می‌خوانیم یا گوش می‌دهیم — و اگر بشود، می‌سازیمش.</p>
        </div>
        <button type="button" className="sbox-again" onClick={() => setDone(false)}>
          یکی دیگر
        </button>
      </div>
    );
  }

  return (
    <div className={`sbox${compact ? " is-compact" : ""}`}>
      <div className="sbox-head">
        <span className="sbox-icon"><Lightbulb size={18} /></span>
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
      </div>

      <div className="sbox-input">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مثلاً: یک آرایشگاه مردانه در نیومارکت پیدا نکردم…"
          rows={compact ? 2 : 3}
          maxLength={2000}
          disabled={sending}
        />

        {/* Voice — one button that records, then a small player with delete. */}
        {rec.audioUrl ? (
          <div className="sbox-voice">
            <audio controls src={rec.audioUrl} preload="metadata" />
            <span className="sbox-voice-time">{fmt(rec.recordingTime)}</span>
            <button type="button" className="sbox-icon-btn" onClick={rec.resetRecording} aria-label="حذف صدا" disabled={sending}>
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`sbox-mic${rec.isRecording ? " is-recording" : ""}`}
            onClick={rec.isRecording ? rec.stopRecording : rec.startRecording}
            aria-pressed={rec.isRecording}
            disabled={sending}
          >
            {rec.isRecording ? <Square size={16} /> : <Mic size={16} />}
            {rec.isRecording ? `در حال ضبط ${fmt(rec.recordingTime)} — برای پایان بزن` : "به‌جای تایپ، بگو"}
          </button>
        )}
      </div>

      <div className="sbox-foot">
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="ایمیل یا شماره (اختیاری — اگر خواستی جواب بدهیم)"
          maxLength={200}
          disabled={sending}
          dir="auto"
        />
        <button type="button" className="sbox-send" onClick={submit} disabled={!canSend}>
          <Send size={15} /> {sending ? "در حال ارسال…" : "بفرست"}
        </button>
      </div>

      {rec.error ? <p className="sbox-err">{rec.error}</p> : null}
      {error ? <p className="sbox-err">{error}</p> : null}
    </div>
  );
}
