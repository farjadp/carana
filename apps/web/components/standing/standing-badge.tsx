// ============================================================================
// Source: components/standing/standing-badge.tsx
// Version: 1.0.0 — 2026-08-26
// Why: The «اعتبار مشارکت» level, where a reader can see it. Design:
//      docs/16-standing-and-loyalty.md.
//
//      IT RENDERS NOTHING AT LEVEL 0, and that is the whole of its honesty.
//      «تازه‌وارد» is not an achievement; a badge on every account would be
//      decoration, and worse, it would advertise a ranking system to visitors
//      before anyone can be ranked. The level a reader sees is one somebody
//      earned. `privilegesFor(level).showsContributions` is the gate — the
//      same boolean the design named for exactly this, never `level >= n`
//      written out here.
//
//      IT IS NOT THE VERIFIED MARK. A verified badge says a business proved
//      who it is; this says a person has a record of contributions that held
//      up. Different claim, so a deliberately different icon and colour — the
//      two must not be confusable at a glance on the same page.
//
//      THE LABEL EXPLAINS ITSELF. A rank nobody can decode is decoration with
//      extra steps, so every badge carries what it means in its title.
// Env / Identity: Pure presentation. No IO.
// ============================================================================
import { Award, ShieldCheck, Sparkles } from "lucide-react";

import { LEVEL_LABELS_FA, privilegesFor, type StandingLevel } from "@goplaza/core";

/**
 * What each level actually means to a reader, in one sentence — and never a
 * number. «۴۲۰ امتیاز» is our bookkeeping, not something a visitor to a
 * business page can judge; the sentence is what they can.
 *
 * Exported because the owner section on a business profile prints the same
 * sentence beside the badge. Two copies of this wording would drift, and the
 * drift would be two different claims about the same person.
 */
export const STANDING_MEANING_FA: Record<StandingLevel, string> = {
  0: "",
  1: "مشارکت‌هایی داشته که بررسی و تأیید شده‌اند.",
  2: "سابقه‌ی طولانی و دقیقی از مشارکت‌های تأییدشده دارد.",
  // Says only what the level MEANS, never restates its name. The owner
  // section prints «سطح «نگهبان» دارد — {this}», and the first draft of this
  // string began «نقش نگهبانی در گوپلازا دارد», which read back as the same
  // sentence twice. A string written for a tooltip does not automatically
  // compose into a sentence.
  3: "این سطح را تیم گوپلازا می‌دهد و به‌دست نمی‌آید.",
};

const STYLE: Record<StandingLevel, string> = {
  0: "",
  1: "bg-[color:var(--bg)] text-[color:var(--muted-text)] border-[color:var(--line)]",
  2: "bg-sky-50 text-sky-700 border-sky-200",
  3: "bg-[color:var(--annabi)]/8 text-[color:var(--annabi)] border-[color:var(--annabi)]/20",
};

const ICON: Record<StandingLevel, typeof Award> = {
  0: Sparkles,
  1: Sparkles,
  2: Award,
  3: ShieldCheck,
};

export function StandingBadge({ level, size = "sm" }: { level: StandingLevel; size?: "sm" | "md" }) {
  // The gate is the named privilege, not a number comparison. Level 0 has
  // nothing to show, and level 0 is most accounts.
  if (!privilegesFor(level).showsContributions) return null;

  const Icon = ICON[level];
  const pad = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      title={`${LEVEL_LABELS_FA[level]} — ${STANDING_MEANING_FA[level]}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-bold ${pad} ${STYLE[level]}`}
    >
      <Icon size={size === "md" ? 12 : 10} />
      {LEVEL_LABELS_FA[level]}
    </span>
  );
}
