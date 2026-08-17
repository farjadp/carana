// ============================================================================
// Source: apps/mobile/src/components/interaction-bar.tsx
// Version: 1.0.0 — 2026-08-24
// Why: Save, rate and note a business from its profile screen.
// Env / Identity: Every write is the caller's own row; RLS enforces that.
//      Signed-out users see the same controls and are sent to sign in, rather
//      than the controls being hidden — hiding them hides the reason to join.
// ============================================================================
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bell, BellOff, Bookmark, BookmarkCheck, PenLine, Star, X } from "lucide-react-native";

import { PrimaryButton } from "./ui";
import { useAuth } from "../context/auth";
import {
  getInteraction,
  isSaved,
  toggleNotify,
  toggleSaved,
  upsertInteraction,
  type Interaction,
} from "../lib/interactions";
import { colors, radius, space, type, fonts, shadow } from "../theme";

export function InteractionBar({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [ratingDraft, setRatingDraft] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setInteraction(null);
      return;
    }
    try {
      const row = await getInteraction(businessId);
      setInteraction(row);
      setNoteDraft(row?.private_note ?? "");
      setRatingDraft(row?.personal_rating ?? 0);
    } catch {
      // A read failure here is not worth interrupting the page for.
    }
  }, [user, businessId]);

  useEffect(() => {
    // Same as the home screen: load() awaits before it sets anything, so this is subscribe-then-update, not a synchronous cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const requireAuth = () => {
    router.push(`/auth/login?next=/business/${encodeURIComponent(businessId)}`);
  };

  const saved = isSaved(interaction);

  async function onToggleSave() {
    if (!user) return requireAuth();
    setBusy(true);
    try {
      setInteraction(await toggleSaved(user.id, businessId, saved));
    } finally {
      setBusy(false);
    }
  }

  const notifying = !!interaction?.notify_announcements;

  async function onToggleNotify() {
    if (!user) return requireAuth();
    setBusy(true);
    try {
      setInteraction(await toggleNotify(user.id, businessId, notifying));
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    if (!user) return requireAuth();
    setBusy(true);
    try {
      setInteraction(
        await upsertInteraction(user.id, businessId, {
          private_note: noteDraft.trim() || null,
          personal_rating: ratingDraft || null,
        })
      );
      setNoteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.bar}>
        <Pressable
          onPress={onToggleSave}
          disabled={busy}
          style={({ pressed }) => [
            styles.action,
            saved && styles.actionOn,
            pressed && { opacity: 0.75 },
          ]}
        >
          {saved ? (
            <BookmarkCheck size={18} color="#fff" />
          ) : (
            <Bookmark size={18} color={colors.text} />
          )}
          <Text style={[styles.actionText, saved && styles.actionTextOn]}>
            {saved ? "ذخیره شد" : "ذخیره"}
          </Text>
        </Pressable>

        {/* Separate from "ذخیره" on purpose: bookmarking and asking to be
            emailed about news are different intents, and defaulting one to
            the other would be mail nobody asked for. */}
        <Pressable
          onPress={onToggleNotify}
          disabled={busy}
          style={({ pressed }) => [
            styles.action,
            notifying && styles.actionOn,
            pressed && { opacity: 0.75 },
          ]}
        >
          {notifying ? <Bell size={18} color="#fff" /> : <BellOff size={18} color={colors.text} />}
          <Text style={[styles.actionText, notifying && styles.actionTextOn]}>
            {notifying ? "باخبرم" : "باخبرم کن"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => (user ? setNoteOpen(true) : requireAuth())}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.75 }]}
        >
          <PenLine size={18} color={colors.text} />
          <Text style={styles.actionText}>
            {interaction?.private_note ? "ویرایش یادداشت" : "یادداشت"}
          </Text>
        </Pressable>
      </View>

      {interaction?.private_note ? (
        <View style={styles.notePreview}>
          <Text style={styles.notePreviewLabel}>یادداشت خصوصی شما</Text>
          <Text style={styles.notePreviewBody}>{interaction.private_note}</Text>
          {interaction.personal_rating ? (
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={14}
                  color={colors.annabi}
                  fill={n <= (interaction.personal_rating ?? 0) ? colors.annabi : "transparent"}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal visible={noteOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Pressable onPress={() => setNoteOpen(false)} hitSlop={10}>
              <X size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.sheetTitle}>یادداشت خصوصی</Text>
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetSubtitle} numberOfLines={2}>
              {businessName}
            </Text>
            <Text style={styles.privacyNote}>
              این یادداشت فقط برای خودتان است و هیچ‌کس دیگری آن را نمی‌بیند.
            </Text>

            <Text style={styles.fieldLabel}>امتیاز شخصی</Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRatingDraft(n === ratingDraft ? 0 : n)} hitSlop={6}>
                  <Star
                    size={30}
                    color={colors.annabi}
                    fill={n <= ratingDraft ? colors.annabi : "transparent"}
                  />
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>یادداشت</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="تجربه‌تان را بنویسید…"
              placeholderTextColor={colors.mutedText}
              multiline
              textAlignVertical="top"
              style={styles.noteInput}
            />

            <PrimaryButton label="ذخیره یادداشت" onPress={saveNote} loading={busy} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row-reverse", gap: space.sm, marginTop: space.sm },
  action: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  actionOn: { backgroundColor: colors.annabi },
  actionText: { fontSize: 13.5, fontFamily: fonts.bold, color: colors.text },
  actionTextOn: { color: "#fff" },

  notePreview: {
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.softLajvard,
  },
  notePreviewLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.lajvard, textAlign: "right" },
  notePreviewBody: { ...type.body, textAlign: "right", marginTop: 5 },
  starRow: { flexDirection: "row-reverse", gap: 3, marginTop: space.sm },

  sheet: { flex: 1, backgroundColor: colors.bg },
  sheetHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetTitle: { ...type.h2, fontSize: 16 },
  sheetBody: { padding: space.lg, gap: space.md },
  sheetSubtitle: { ...type.h2, fontSize: 17, textAlign: "right" },
  privacyNote: { ...type.muted, textAlign: "right", lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  starPicker: { flexDirection: "row-reverse", gap: space.sm },
  noteInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: space.md,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    lineHeight: 22,
  },
});
