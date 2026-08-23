// ============================================================================
// Source: app/api/admin/export/businesses/route.ts
// Version: 1.0.0 — 2026-08-23
// Why: Farjad asked for "just the businesses list, exportable with the
//      fields inside, downloadable in a few formats" — narrower than the
//      full-table JSONL snapshot in /api/admin/backup (which covers every
//      table but only as one JSONL file per table, meant for restore, not
//      for opening in Excel or handing to someone outside the team).
//
//      GET ?format=csv|xlsx|json, admin-only. Single request, no client-side
//      pagination: the businesses table is ~5,600 rows and select("*") for
//      one table comfortably fits the route's time budget (the full backup
//      raised maxDuration for the same table for the same reason).
//
//      select("*") here still hits the 1,000-row PostgREST default — see
//      06-gotchas.md — so this uses fetchAllRows like every other "all of
//      businesses" path in the codebase, not a bare .select("*").
// Env / Identity: Service role after requireAdmin (admin role only — this
//      dumps every column, including ones not shown in the admin UI).
// ============================================================================
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";

import { NotAuthenticatedError, NotAuthorizedError, requireAdmin } from "@/lib/auth/require-admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORMATS = new Set(["csv", "xlsx", "json"]);

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  // Excel/Sheets need quoting on comma, quote, or newline; a leading BOM
  // (added once, on the whole file) is what makes Persian text render
  // correctly instead of as mojibake when opened in Excel on Windows.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(",")).join("\r\n");
  return `${header}\r\n${body}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await requireAdmin(supabase, ["admin"]);
    const admin = createSupabaseAdminClient();

    const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase();
    if (!FORMATS.has(format)) {
      return NextResponse.json({ error: "فرمت نامعتبر — csv, xlsx یا json." }, { status: 400 });
    }

    const rows = await fetchAllRows<Record<string, unknown>>(
      () => admin.from("businesses").select("*").order("created_at") as never,
      { cap: 50_000 }
    );

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `goplaza-businesses-${stamp}.${format}`;

    if (format === "json") {
      return new NextResponse(JSON.stringify(rows, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "csv") {
      const csv = "﻿" + toCsv(rows); // BOM so Excel opens UTF-8 (Persian) correctly
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // xlsx
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "businesses");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof NotAuthenticatedError || e instanceof NotAuthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    console.error("admin/export/businesses:", e);
    return NextResponse.json({ error: "خطای داخلی." }, { status: 500 });
  }
}
