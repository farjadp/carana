# čārana

Frontend for `čārana`, a Persian-first directory of Iranian businesses in Canada.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- shadcn-style local UI primitives
- Supabase client and server wiring

## Current Scope

- Marketing and brand pages
- Legal placeholder pages
- Auth flows:
  - login
  - signup
  - forgot password
  - update password
- Access-architecture page
- Dashboard and business dashboard scaffolds

## Environment

Copy `.env.example` to `.env.local` and fill the values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
```

## Notes

- `.env.local` is intentionally ignored.
- `AGENTS.md` and `CLAUDE.md` are ignored because Next.js may regenerate them locally.
- JSON files like `package.json` and `components.json` cannot contain inline comments without becoming invalid; context for them is documented here and in `CHANGELOG.md`.
