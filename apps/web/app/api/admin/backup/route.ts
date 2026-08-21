// ============================================================================
// Source: app/api/admin/backup/route.ts
// Version: 1.0.0 — 2026-08-19
// Why: Data backup and restore for the admin settings page.
//
//      Shape: the CLIENT drives the work table by table — one request per
//      table for backup, one per table for restore — so no single request
//      fights the serverless time limit, the admin sees real per-table
//      progress, and a failure names the exact table instead of killing a
//      monolith. A backup is a folder in the private 'backups' bucket:
//        {id}/{table}.jsonl   one JSON row per line
//        {id}/manifest.json   what's inside, row counts, who, when
//
//      Restore semantics — decided, and the UI repeats them:
//        · UPSERT ONLY, by primary key. Rows from the backup are written
//          back; rows created after the backup are left alone. This is a
//          surgical "undo bad edits / recover deleted rows" tool, not a time
//          machine. Point-in-time disaster recovery is Supabase's own
//          backups in the dashboard — the page says so plainly.
//        · The UI takes a fresh automatic backup before any restore and
//          requires typing the backup id to confirm.
//        · profiles rows whose auth.users id is gone fail the FK and are
//          counted as skipped, not treated as an error.
//
//      Every action requires the full "admin" role (not moderator): a backup
//      file contains private columns of every table.
// Env / Identity: Service role after requireAdmin. maxDuration raised — the
//      businesses table is ~5,600 rows and export+upload can pass 10s.
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";

import { BACKUP_TABLES, BACKUP_TABLE_BY_NAME } from "@/lib/admin/backup-tables";
import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "backups";
const RESTORE_CHUNK = 400;

type Manifest = {
  id: string;
  created_at: string;
  created_by: string;
  app: string;
  /** 'manual' or 'pre-restore' — the automatic safety backup before a restore. */
  kind: "manual" | "pre-restore";
  tables: { name: string; rows: number; bytes: number }[];
};

async function guard(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const user = await requireAdmin(supabase, ["admin"]);
  return { user, admin: createSupabaseAdminClient() };
}

function errorResponse(e: unknown) {
  if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  console.error("admin/backup:", e);
  return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
}

/** GET — list existing backups (their manifests), newest first. */
export async function GET(req: NextRequest) {
  try {
    const { admin } = await guard(req);
    // list() on a missing bucket returns empty WITHOUT an error (verified
    // against the live project), so existence must be asked explicitly or
    // the UI reports "no backups yet" over a bucket that is not there.
    const { data: bucket } = await admin.storage.getBucket(BUCKET);
    if (!bucket) return NextResponse.json({ backups: [], bucketMissing: true });
    const { data: folders, error } = await admin.storage.from(BUCKET).list("", { limit: 100 });
    if (error) return NextResponse.json({ backups: [], bucketMissing: true });
    const manifests: Manifest[] = [];
    for (const f of folders ?? []) {
      if (!f.name || f.name.startsWith(".")) continue;
      const { data: file } = await admin.storage.from(BUCKET).download(`${f.name}/manifest.json`);
      if (!file) continue; // unfinished backup folder — a crash mid-run; ignored
      try {
        manifests.push(JSON.parse(await file.text()) as Manifest);
      } catch {
        /* corrupt manifest — skip */
      }
    }
    manifests.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return NextResponse.json({ backups: manifests });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, admin } = await guard(req);
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      backupId?: string;
      table?: string;
      tables?: { name: string; rows: number; bytes: number }[];
      kind?: string;
    };

    // ---------------------------------------------------------- backup: start
    if (body.action === "start") {
      // Folder id doubles as the human-visible name and the confirm phrase.
      const id = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      return NextResponse.json({ backupId: id, tables: BACKUP_TABLES });
    }

    // ---------------------------------------------------------- backup: table
    if (body.action === "table") {
      const table = BACKUP_TABLE_BY_NAME.get(String(body.table));
      const backupId = String(body.backupId ?? "");
      if (!table || !/^[\w-]{10,40}$/.test(backupId)) {
        return NextResponse.json({ error: "درخواست نامعتبر." }, { status: 400 });
      }
      const rows = await fetchAllRows<Record<string, unknown>>(
        () => admin.from(table.name).select("*").order(table.pk) as never,
        { cap: 500_000 }
      );
      const jsonl = rows.map((r) => JSON.stringify(r)).join("\n");
      const bytes = Buffer.byteLength(jsonl, "utf8");
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(`${backupId}/${table.name}.jsonl`, jsonl, {
          contentType: "application/x-ndjson",
          upsert: true,
        });
      if (upErr) return NextResponse.json({ error: `آپلود ${table.name}: ${upErr.message}` }, { status: 500 });
      return NextResponse.json({ table: table.name, rows: rows.length, bytes });
    }

    // --------------------------------------------------------- backup: finish
    if (body.action === "finish") {
      const backupId = String(body.backupId ?? "");
      if (!/^[\w-]{10,40}$/.test(backupId) || !Array.isArray(body.tables)) {
        return NextResponse.json({ error: "درخواست نامعتبر." }, { status: 400 });
      }
      const manifest: Manifest = {
        id: backupId,
        created_at: new Date().toISOString(),
        created_by: user.email ?? user.id,
        app: "goplaza-web",
        kind: body.kind === "pre-restore" ? "pre-restore" : "manual",
        tables: body.tables.map((t) => ({
          name: String(t.name),
          rows: Number(t.rows) || 0,
          bytes: Number(t.bytes) || 0,
        })),
      };
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(`${backupId}/manifest.json`, JSON.stringify(manifest, null, 2), {
          contentType: "application/json",
          upsert: true,
        });
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, manifest });
    }

    // -------------------------------------------------------------- download
    if (body.action === "download") {
      const backupId = String(body.backupId ?? "");
      if (!/^[\w-]{10,40}$/.test(backupId)) {
        return NextResponse.json({ error: "درخواست نامعتبر." }, { status: 400 });
      }
      const { data: files } = await admin.storage.from(BUCKET).list(backupId, { limit: 100 });
      const urls: { name: string; url: string }[] = [];
      for (const f of files ?? []) {
        const { data } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(`${backupId}/${f.name}`, 3600);
        if (data?.signedUrl) urls.push({ name: f.name, url: data.signedUrl });
      }
      return NextResponse.json({ files: urls });
    }

    // --------------------------------------------------------- restore: table
    if (body.action === "restore-table") {
      const table = BACKUP_TABLE_BY_NAME.get(String(body.table));
      const backupId = String(body.backupId ?? "");
      if (!table || !/^[\w-]{10,40}$/.test(backupId)) {
        return NextResponse.json({ error: "درخواست نامعتبر." }, { status: 400 });
      }
      const { data: file, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(`${backupId}/${table.name}.jsonl`);
      if (dlErr || !file) {
        return NextResponse.json({ error: `فایل ${table.name} در این پشتیبان نیست.` }, { status: 404 });
      }
      const text = await file.text();
      const rows: Record<string, unknown>[] = [];
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          rows.push(JSON.parse(trimmed));
        } catch {
          /* one corrupt line should not sink the table; it is counted below */
        }
      }
      let upserted = 0;
      let failed = 0;
      for (let i = 0; i < rows.length; i += RESTORE_CHUNK) {
        const chunk = rows.slice(i, i + RESTORE_CHUNK);
        const { error: upErr } = await admin
          .from(table.name)
          .upsert(chunk as never, { onConflict: table.pk, ignoreDuplicates: false });
        if (!upErr) {
          upserted += chunk.length;
          continue;
        }
        // A chunk-level FK failure (e.g. a profiles row whose auth user was
        // deleted) — retry row by row so one bad row costs one row.
        for (const row of chunk) {
          const { error: rowErr } = await admin
            .from(table.name)
            .upsert(row as never, { onConflict: table.pk });
          if (rowErr) failed += 1;
          else upserted += 1;
        }
      }
      return NextResponse.json({ table: table.name, upserted, failed, total: rows.length });
    }

    return NextResponse.json({ error: "action نامعتبر." }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
