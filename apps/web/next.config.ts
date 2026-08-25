import type { NextConfig } from "next";

/**
 * Bridge the server-side Supabase variables into the public namespace.
 *
 * Next only inlines `NEXT_PUBLIC_*` into the browser bundle; every other
 * `process.env` read in client code compiles to `undefined`. That makes the
 * `?? process.env.SUPABASE_URL` fallback in lib/env.ts work on the server and
 * silently fail in the browser — which is what broke the prerender of the
 * admin login page, a client component.
 *
 * Rather than requiring the same two values to be configured twice, we promote
 * them here at build time. An explicitly set `NEXT_PUBLIC_*` still wins.
 *
 * Only the URL and the publishable key are promoted. Both are public by
 * design and already ship in every page. SUPABASE_SECRET_KEY must never
 * appear here — it would be inlined into the browser bundle.
 */
const publicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

const publicSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

/**
 * NEXT_PUBLIC_* values are baked into the browser bundle at build time. If they
 * are absent now they are absent forever, so a missing one has to stop the
 * build rather than ship an app that cannot reach Supabase.
 *
 * The generic "Missing required environment variable" thrown from a prerender
 * worker says nothing about which side of the build is misconfigured, so state
 * plainly what the build can and cannot see.
 */
function reportSupabaseEnv() {
  const seen = (name: string) => (process.env[name] ? "set" : "MISSING");

  const lines = [
    "",
    "  Supabase build environment",
    `    NEXT_PUBLIC_SUPABASE_URL              ${seen("NEXT_PUBLIC_SUPABASE_URL")}`,
    `    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  ${seen("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")}`,
    `    SUPABASE_URL                          ${seen("SUPABASE_URL")}`,
    `    SUPABASE_PUBLISHABLE_KEY              ${seen("SUPABASE_PUBLISHABLE_KEY")}`,
    `    resolved public url                   ${publicSupabaseUrl ? "ok" : "UNRESOLVED"}`,
    `    resolved public key                   ${publicSupabaseKey ? "ok" : "UNRESOLVED"}`,
    "",
  ];

  console.log(lines.join("\n"));

  if (!publicSupabaseUrl || !publicSupabaseKey) {
    throw new Error(
      [
        "Cannot build: the Supabase URL and publishable key must be available at build time,",
        "because Next inlines NEXT_PUBLIC_* values into the browser bundle and they cannot be",
        "supplied later at runtime.",
        "",
        "Set BOTH of these in the hosting project, for every environment that builds",
        "(Production, Preview and Development):",
        "  NEXT_PUBLIC_SUPABASE_URL",
        "  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "",
        "Setting only SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY is enough for server code,",
        "but this build did not receive those either — see the table above.",
      ].join("\n")
    );
  }
}

reportSupabaseEnv();

const nextConfig: NextConfig = {
  // @goplaza/core ships raw TypeScript rather than a build step, so Next has
  // to compile it like first-party source.
  transpilePackages: ["@goplaza/core"],

  // Dev only. Next blocks cross-origin requests to dev assets, and the origin
  // it trusts is the one it was started with — `localhost`. Opening the dev
  // server on 127.0.0.1 therefore serves the HTML but 403s every JS chunk, so
  // the page renders and never hydrates: a silent, confusing half-failure that
  // looks like broken client code. Has no effect on a production build.
  allowedDevOrigins: ["127.0.0.1", "0.0.0.0"],

  env: {
    ...(publicSupabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl } : {}),
    ...(publicSupabaseKey
      ? { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicSupabaseKey }
      : {}),
  },

  images: {
    remotePatterns: [
      // Business logos and covers live in our own Supabase storage bucket.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
