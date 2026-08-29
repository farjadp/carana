// ============================================================================
// Source: apps/web/lib/data/company.ts
// Version: 2.0.0 — 2026-08-18 (rebrand: brand fields now come from @goplaza/core)
// Why: Single source of truth for the legal entity behind GOPLAZA. Legal pages,
//      the App Store listing and the footer must all state the same thing —
//      Apple checks that the seller identity matches the site.
// Env / Identity: Public information only.
// ============================================================================
import { brand } from "@goplaza/core";

export const company = {
  /** Legal name as registered, and as it will appear as App Store seller. */
  legalName: "Ashavid Inc.",
  /** Product/brand operated by the company — see packages/core/src/brand.ts. */
  brand: brand.name,
  brandFa: brand.nameFa,
  jurisdiction: "Ontario, Canada",

  tagline: brand.tagline,
  address: "Toronto, Ontario, Canada",

  /**
   * Mailboxes.
   *
   * Every address a human is asked to write to now points at one real,
   * monitored inbox. They were charana.ca boxes that stopped being read, and
   * the file's own rule is that displaying an address which does not receive
   * mail breaks the honesty rule — worse here than usual, because two of them
   * were not only displayed but were the actual recipients of the contact
   * form and of privacy-category complaints.
   *
   * One address is deliberately still on the old domain: `noreply`, which is
   * a sender rather than an inbox. See its own note.
   */
  email: {
    general: "its@farjadp.com",
    /**
     * Moved off charana.ca on 2026-08-27 at Farjad's word that the old box is
     * no longer read. This one is not only displayed — `contact/actions.ts`
     * MAILS THE CONTACT FORM HERE, so a dead address meant every message sent
     * through /contact went nowhere, silently. It is also what the terms,
     * privacy and disclaimer pages name as the way to reach us, and what the
     * verification screen offers when someone cannot get a code.
     */
    support: "its@farjadp.com",
    privacy: "its@farjadp.com",
    partners: "its@farjadp.com",
    /**
     * NOT moved, and it is the one that must not be.
     *
     * This is a FROM address, not an inbox: lib/email/send.ts builds
     * DEFAULT_FROM out of it, and /support tells people password-reset mail
     * arrives from it. A From address only works on a domain verified for
     * sending in Resend, and farjadp.com is not one. Pointing it there would
     * reproduce the exact failure that silently killed 17 verification emails
     * between 5 and 7 Shahrivar — «Invalid `from` field», returned as
     * { sent: false } with nobody told.
     *
     * Move it when goplaza.ca is verified in Resend
     * (REBRAND_EXTERNAL_ACTIONS.md §Resend), not before.
     */
    noreply: "noreply@charana.ca",
    /**
     * Real, monitored mailboxes on domains we already control, added
     * 2026-08-26. The remaining charana.ca addresses above stay because the
     * legal pages name them; these two are the human escalation route and are
     * what a complaint is copied to.
     */
    management: "farjad@ashavid.ca",
    technical: "its@farjadp.com",
  },

  /**
   * Telegram handles, without the `@`.
   *
   * An empty string hides that route wherever it is rendered rather than
   * printing a dead handle — a contact route that does not answer is the same
   * class of lie as a badge nothing backs. Set them here only.
   */
  telegram: {
    /** Public support account: https://t.me/ashavidsupport */
    support: "ashavidsupport",
    /** Farjad direct. Published on the management row only. */
    personal: "FaerjadTalks",
  },

  /**
   * Phone numbers in E.164, LATIN DIGITS ONLY.
   *
   * Given in Persian digits (+۱۶۴۷…) and converted here on purpose: a `tel:`
   * href built from Persian digits does not dial, and this is the same trap
   * that has already broken sign-in and verification twice. Display them
   * dir="ltr" so RTL does not reorder the +1.
   */
  phone: {
    /** Support line. */
    support: "+16476611839",
    /** Management / escalation. */
    management: "+14376611674",
  },

  social: {
    linkedin: "https://www.linkedin.com/company/ashavid/",
    instagram: "https://www.instagram.com/ashavidgroup/",
    youtube: "https://www.youtube.com/@ashavidgroup",
    x: "https://x.com/ashavidgroup",
    facebook: "https://www.facebook.com/ashavid",
  },

  parentSite: "https://www.ashavid.ca",

  /** Keep in step with the legal pages below whenever they are revised. */
  legalLastUpdated: "2026-08-26",
} as const;
