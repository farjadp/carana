# Accounts and credentials

**No secrets in this folder.** Variable names only.

## Where secrets live

| Location | Contents |
|---|---|
| `apps/web/.env.local` | all web secrets — gitignored |
| `apps/mobile/.env.local` | Expo public vars only — gitignored |
| Vercel → Settings → Environment Variables | production and preview |
| `~/Library/Application Support/com.vercel.cli/auth.json` | Vercel CLI token |

`.env.example` at the repo root documents every variable the app reads.

## Accounts

| Service | Account | State |
|---|---|---|
| GitHub | `farjadp/carana` | active, `main` up to date |
| Vercel | team `ashavidproject`, project `carana`, Pro | live |
| Supabase | project `flrpuzmqsqgrfutzoyop` | live |
| OpenAI | API key in env | active |
| Google Maps | key in env | **restrict by HTTP referrer** |
| expo.dev | organisation created | slug not yet wired into `app.json` |
| Apple Developer | — | blocked on D-U-N-S |
| Google Play | — | blocked on D-U-N-S |
| Domains | charana.ca, carana.ca | charana live; carana DNS not pointed |

## Legal entity

**Ashavid Inc.**, Toronto, Ontario, Canada. čārana is one of its products.

The App Store seller name will be **Ashavid Inc.**, not čārana — normal, and
the app's own name is unaffected. Use the exact registered legal name and
address when applying for D-U-N-S; any mismatch means rejection and weeks lost.

Public contact addresses: `hello@`, `support@`, `privacy@`, `partners@`
`charana.ca`. Single source of truth in `apps/web/lib/data/company.ts` — legal
pages, footer and the future store listing all read from it.

## Security notes

**The Supabase service key was rotated on 2026-08-23.** The old key had been
hard-coded in four repo-root scripts; those are deleted and the key is revoked
and returns 401. It was never committed — `git log -S` across all branches
confirms it.

Rotating a Supabase key does **not** revoke the old one. You must delete it
explicitly, and propagation takes about 30 seconds.

**Never put `SUPABASE_SECRET_KEY` behind a `NEXT_PUBLIC_` prefix** or in
`next.config.ts`'s `env` block. Either would inline it into the browser bundle
on every page.

**`SUPABASE_DISABLE_EMAIL_CONFIRMATION_FOR_TESTING` must never be `true` in
production.** It creates pre-confirmed accounts through the admin API.
