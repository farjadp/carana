// ============================================================================
// Source: scripts/rehost-logos.mts
// Version: 1.0.0 — 2026-08-23
// Why: Imported listings point at images on the source directory's server.
//      Hotlinking breaks the moment they reorganise, and every page view leaks
//      a referrer to a competing directory. This copies them into our own
//      Supabase storage bucket and repoints the rows.
// Env / Identity: Service role. Reads credentials from apps/web/.env.local.
//
// Usage:
//   npx tsx scripts/rehost-logos.mts [--commit] [--limit N]
// Dry run by default.
// ============================================================================
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const flags = process.argv.slice(2);
const COMMIT = flags.includes("--commit");
const limitFlag = flags.indexOf("--limit");
const LIMIT = limitFlag !== -1 ? Number(flags[limitFlag + 1]) : Infinity;

const env = Object.fromEntries(
  fs
    .readFileSync("apps/web/.env.local", "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "businesses";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

async function main() {
  const { data: rows, error } = await supabase
    .from("businesses")
    .select("id, slug, logo_url")
    .not("logo_url", "is", null)
    // Skip our own placeholder and anything already re-hosted, so a re-run
    // only retries what genuinely still lives on someone else's server.
    .not("logo_url", "like", "/images/%")
    .not("logo_url", "like", `%${new URL(env.SUPABASE_URL).hostname}%`);

  if (error) throw error;

  const external = (rows ?? []).filter((r) =>
    /^https?:\/\//i.test(r.logo_url as string)
  );

  console.log(`${external.length} externally hosted logos`);

  if (!COMMIT) {
    const hosts = new Map<string, number>();
    for (const r of external) {
      const h = new URL(r.logo_url as string).hostname;
      hosts.set(h, (hosts.get(h) ?? 0) + 1);
    }
    console.log("by host:");
    for (const [h, n] of [...hosts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${h.padEnd(28)} ${n}`);
    }
    console.log("\nDRY RUN — nothing downloaded. Re-run with --commit.");
    return;
  }

  let done = 0;
  let failed = 0;
  const targets = external.slice(0, LIMIT);

  for (const row of targets) {
    const source = row.logo_url as string;

    try {
      const res = await fetch(source, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: { "User-Agent": "goplaza-importer/1.0 (+https://goplaza.ca)" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!ALLOWED.has(contentType)) throw new Error(`unsupported type ${contentType}`);

      const buffer = new Uint8Array(await res.arrayBuffer());
      if (buffer.byteLength === 0) throw new Error("empty body");
      if (buffer.byteLength > MAX_BYTES) throw new Error("too large");

      // Imported rows are owned by the admin account, so they live under a
      // dedicated prefix rather than a user folder.
      const path = `imported/${row.id}/logo.${EXT[contentType]}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from("businesses")
        .update({ logo_url: publicUrl })
        .eq("id", row.id);

      if (updateError) throw updateError;

      done += 1;
    } catch (err) {
      failed += 1;
      console.error(`\n  ${row.slug}: ${(err as Error).message}`);
    }

    process.stdout.write(`\r  ${done + failed}/${targets.length}  ok=${done} failed=${failed}`);
  }

  console.log(`\ndone: ${done} re-hosted, ${failed} failed`);
  if (failed) {
    console.log("Failed rows keep their original URL; re-run to retry them.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
