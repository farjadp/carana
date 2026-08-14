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

const nextConfig: NextConfig = {
  // @charana/core ships raw TypeScript rather than a build step, so Next has
  // to compile it like first-party source.
  transpilePackages: ["@charana/core"],

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
