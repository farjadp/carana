# čārana — Engineering Handover

**Written:** 2026-08-24
**Repo:** https://github.com/farjadp/carana — branch `main`, all work pushed
**Live:** https://charana.ca
**Local:** `/Users/farjad/Downloads/Work-Studio/Charana`

---

## Where things stand, in sixty seconds

The web app is **live and working** at charana.ca with 677 published business
listings. The mobile app **runs on the iOS simulator** but not yet on a physical
phone — see `05-mobile.md`, there is one blocker with three ways round it.

Everything is committed and pushed. Nothing is half-finished on disk.

| Area | State |
|---|---|
| Web (Next.js 16) | Live on charana.ca, deploying cleanly from `main` |
| Database (Supabase) | 16 migrations applied, history in sync, RLS hardened |
| Directory data | 677 listings imported, categorised, published |
| Mobile (Expo SDK 57) | Builds and runs on simulator; device install prepared, not done |
| App Store / Play | Blocked on D-U-N-S for Ashavid Inc. |
| Brand assets | Category art done; **logo still needs a designer** |

---

## What to do first when you wake up

Three things are worth ten minutes each, in this order:

**1. Configure Supabase auth URLs.** Signup and password reset are broken in
production until this is done. It is four fields in a dashboard.
→ `04-deployment.md`, "Supabase auth configuration"

**2. Point carana.ca at Vercel.** The redirect is already configured on the
Vercel side; the domain just does not resolve yet. Nameservers at the registrar.
→ `04-deployment.md`, "Domains"

**3. Delete `GEMINI_API_KEY` from Vercel.** Nothing in the codebase reads it.
An unused key is only ever a liability.

After that, pick from `08-open-tasks.md`.

---

## Reading order

| File | Read it when |
|---|---|
| `01-architecture.md` | You want the shape of the system |
| `02-security.md` | Before touching auth, RLS, or anything admin |
| `03-database.md` | Before writing a migration or a query |
| `04-deployment.md` | Deploying, or something is broken in production |
| `05-mobile.md` | Picking the mobile work back up |
| `06-data-import.md` | Importing another directory export |
| `07-design.md` | Brand, colours, icons, and the logo brief |
| `08-open-tasks.md` | Deciding what to do next |
| `09-gotchas.md` | **Read this one.** It is the traps that cost hours today. |
| `10-accounts.md` | Setting up accounts and credentials |

---

## One honest note

Two things in this project were built by me and are below the standard of the
rest: the **category artwork** went through three attempts before landing
somewhere acceptable, and the **logo** is still the placeholder. Illustration
is not something I do well. `07-design.md` contains a proper brief to take to a
designer or an image model — that is the right way to finish it.
