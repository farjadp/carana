// ============================================================================
// Source: apps/mobile/src/components/suggestion-box.tsx
// Version: 1.0.0 — 2026-08-15
// Why: "Tell us what you want" — typed or spoken. Same door as the website
//      (/api/suggestions), same rule: no sign-in required. If a session
//      exists, its token rides along so the row is attributed.
// Env / Identity: Uses expo-audio for the recorder (mic permission asked on
//      first tap, not on mount). Multipart POST; the file goes as
//      { uri, name, type } which RN's fetch turns into a real part.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { CheckCircle2, Lightbulb, Mic, Pause, Play, Send, Square, Trash2 } from "lucide-react-native";

import { supabase } from "../lib/supabase";
import { colors, fonts, radius, shadow, space, type } from "../theme";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "https://charana.ca").replace(/\/$/, "");
const MAX_SECONDS = 180;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function SuggestionBox({
  page,
  title = "چی کم داریم؟ بهمون بگو.",
  hint = "دنبال چه کسب‌وکار یا امکانی بودی که پیدا نکردی؟ بنویس، یا اگر راحت‌تری، بگو.",
}: {
  page: string;
  title?: string;
  hint?: string;
}) {
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recorder — the URI is only meaningful after stop().
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recState = useAudioRecorderState(recorder, 250);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);

  // Player for the preview.
  const player = useAudioPlayer(voiceUri ? { uri: voiceUri } : null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const sub = player.addListener("playbackStatusUpdate", (s) => {
      setPlaying(s.playing);
      if (s.didJustFinish) {
        setPlaying(false);
        player.seekTo(0);
      }
    });
    return () => sub.remove();
  }, [player]);
  useEffect(() => () => { if (capTimer.current) clearTimeout(capTimer.current); }, []);

  const startRecording = async () => {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("برای ضبط صدا باید دسترسی میکروفون را بدهی.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    // Hard cap; the server clamps too.
    capTimer.current = setTimeout(() => void stopRecording(), MAX_SECONDS * 1000);
  };

  const stopRecording = async () => {
    if (capTimer.current) clearTimeout(capTimer.current);
    capTimer.current = null;
    const seconds = Math.round(recorder.currentTime);
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    setVoiceSeconds(seconds);
    setVoiceUri(recorder.uri);
  };

  const clearVoice = () => {
    if (playing) player.pause();
    setVoiceUri(null);
    setVoiceSeconds(0);
  };

  const canSend = !sending && (text.trim().length > 0 || !!voiceUri);

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("text", text.trim());
      fd.append("contact", contact.trim());
      fd.append("source", "mobile");
      fd.append("page", page);
      if (voiceUri) {
        // RN's FormData accepts a file descriptor object, not a Blob.
        fd.append("voice", { uri: voiceUri, name: "voice.m4a", type: "audio/m4a" } as unknown as Blob);
        fd.append("voice_seconds", String(voiceSeconds));
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${BASE}/api/suggestions`, {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error || "ارسال ناموفق بود.");
      setDone(true);
      setText("");
      setContact("");
      clearVoice();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال ناموفق بود.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.card, styles.doneCard]}>
        <CheckCircle2 size={22} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.doneTitle}>رسید. ممنون.</Text>
          <Text style={styles.doneBody}>هر پیشنهاد را خودمان می‌خوانیم یا گوش می‌دهیم — و اگر بشود، می‌سازیمش.</Text>
        </View>
        <Pressable onPress={() => setDone(false)} style={styles.again} hitSlop={6}>
          <Text style={styles.againText}>یکی دیگر</Text>
        </Pressable>
      </View>
    );
  }

  const recording = recState.isRecording;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headIcon}>
          <Lightbulb size={18} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="مثلاً: یک آرایشگاه مردانه در نیومارکت پیدا نکردم…"
        placeholderTextColor={colors.mutedText}
        multiline
        maxLength={2000}
        editable={!sending}
        style={styles.input}
        textAlign="right"
        textAlignVertical="top"
      />

      {voiceUri ? (
        <View style={styles.voiceRow}>
          <Pressable
            onPress={() => (playing ? player.pause() : player.play())}
            style={styles.playBtn}
            hitSlop={6}
          >
            {playing ? <Pause size={16} color={colors.onAnnabi} /> : <Play size={16} color={colors.onAnnabi} />}
          </Pressable>
          <Text style={styles.voiceMeta}>صدای ضبط‌شده · {fmt(voiceSeconds)}</Text>
          <Pressable onPress={clearVoice} style={styles.trashBtn} hitSlop={6} disabled={sending}>
            <Trash2 size={16} color={colors.mutedText} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={recording ? stopRecording : startRecording}
          style={({ pressed }) => [styles.mic, recording && styles.micRecording, pressed && { opacity: 0.85 }]}
          disabled={sending}
        >
          {recording ? <Square size={15} color={colors.onAnnabi} /> : <Mic size={15} color={colors.annabi} />}
          <Text style={[styles.micText, recording && styles.micTextRecording]}>
            {recording ? `در حال ضبط ${fmt(recState.durationMillis / 1000)} — برای پایان بزن` : "به‌جای تایپ، بگو"}
          </Text>
        </Pressable>
      )}

      <View style={styles.foot}>
        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && canSend && { opacity: 0.9 }]}
        >
          <Send size={15} color={colors.onAnnabi} />
          <Text style={styles.sendText}>{sending ? "در حال ارسال…" : "بفرست"}</Text>
        </Pressable>
        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder="ایمیل یا شماره (اختیاری)"
          placeholderTextColor={colors.mutedText}
          maxLength={200}
          editable={!sending}
          style={styles.contact}
          textAlign="right"
          autoCapitalize="none"
        />
      </View>

      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm + 2,
    ...shadow.card,
  },
  head: { flexDirection: "row-reverse", gap: space.sm + 2, alignItems: "flex-start" },
  headIcon: {
    width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.softGold,
  },
  title: { fontSize: 15.5, fontFamily: fonts.heavy, color: colors.text, textAlign: "right" },
  hint: { ...type.muted, textAlign: "right", marginTop: 2 },
  input: {
    minHeight: 84, borderRadius: radius.md, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10,
    ...type.body, color: colors.text,
  },
  mic: {
    alignSelf: "flex-end", flexDirection: "row-reverse", alignItems: "center", gap: 8,
    height: 38, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(128,0,0,0.4)",
  },
  micRecording: { backgroundColor: colors.annabi, borderStyle: "solid", borderColor: colors.annabi },
  micText: { fontSize: 13, fontFamily: fonts.bold, color: colors.annabi },
  micTextRecording: { color: colors.onAnnabi },
  voiceRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  playBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.annabi,
    alignItems: "center", justifyContent: "center",
  },
  voiceMeta: { flex: 1, fontSize: 13, fontFamily: fonts.semibold, color: colors.text, textAlign: "right" },
  trashBtn: { padding: 8, borderRadius: 10, backgroundColor: colors.bg },
  foot: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  contact: {
    flex: 1, height: 42, borderRadius: radius.md, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, ...type.body, color: colors.text,
  },
  send: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8, height: 42, paddingHorizontal: 18,
    borderRadius: radius.pill, backgroundColor: colors.annabi, ...shadow.card,
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontSize: 14, fontFamily: fonts.heavy, color: colors.onAnnabi },
  err: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.annabi, textAlign: "right" },
  doneCard: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm + 2 },
  doneTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  doneBody: { ...type.muted, textAlign: "right", marginTop: 2 },
  again: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.bg },
  againText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.text },
});
