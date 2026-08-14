// ============================================================================
// Source: apps/web/app/.well-known/apple-app-site-association/route.ts
// Version: 1.0.0 — 2026-08-21
// Why: Proves domain ownership to iOS so charana.ca links open in the app.
// Env / Identity: Public, unauthenticated. Contains no secrets.
//
// Apple fetches this over https with NO redirects and requires
// Content-Type: application/json with no .json extension on the path —
// which is why this is a route handler rather than a file in public/.
//
// TEAM_ID comes from the Apple Developer account (Membership → Team ID) and is
// not secret; it appears in every published app's entitlements.
// ============================================================================
import { NextResponse } from "next/server";

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? "TEAMID";
const BUNDLE_ID = "ca.charana.app";

export function GET() {
  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${APPLE_TEAM_ID}.${BUNDLE_ID}`,
            // Business profiles deep-link into the app; everything else stays
            // in the browser so marketing and legal pages remain indexable.
            paths: ["/businesses/*"],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
