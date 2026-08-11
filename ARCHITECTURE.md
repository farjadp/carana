# Architecture

## Product Direction

`čārana` is a Persian-first directory for Iranian businesses in Canada, not a general classifieds marketplace.

## User Roles

- Guest
- Registered user
- Business owner
- Admin / moderator

## Planned Core Tables

- `profiles`
- `businesses`
- `business_memberships`
- `business_claims`

## Access Model

- Public read access for published business listings
- Authenticated actions for save, report, and claim flows
- Owner/editor access for business-management actions
- Admin-only moderation and verification actions

## Auth Flows

- Signup
- Login
- Forgot password
- Password reset

## Next Steps

- Create the Supabase schema
- Add RLS policies
- Add session-aware protected routes
- Add business-claim workflow
