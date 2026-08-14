// ============================================================================
// Source: apps/web/app/.well-known/assetlinks.json/route.ts
// Version: 1.0.0 — 2026-08-21
// Why: Proves domain ownership to Android so charana.ca links open in the app.
// Env / Identity: Public, unauthenticated. A signing-certificate SHA-256
//      fingerprint is a public value, not a secret.
//
// Get the fingerprint after the first EAS build:
//   npx eas-cli credentials --platform android
// and set ANDROID_SHA256_FINGERPRINT. Until then Android app links will not
// verify and links fall back to the browser — which fails safe.
// ============================================================================
import { NextResponse } from "next/server";

const SHA256 = process.env.ANDROID_SHA256_FINGERPRINT;
const PACKAGE_NAME = "ca.charana.app";

export function GET() {
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: SHA256 ? [SHA256] : [],
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
