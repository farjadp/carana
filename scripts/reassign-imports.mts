// ============================================================================
// Source: scripts/reassign-imports.mts
// Version: 1.0.0 — 2026-08-17
// Why: Imported listings were created with created_by = the first admin
//      profile, so that admin's /dashboard listed every one of them as "my
//      businesses" (5,649 rows on 17 Aug). Imports belong to a system account,
//      not to a person. This creates imports@charana.ca once (no usable
//      password, role user) and moves every row whose provenance says
//      "imported from …" onto it. Idempotent.
// Env / Identity: Service role. Reads apps/web/.env.local.
//
// Usage:  npx tsx scripts/reassign-imports.mts [--commit]
// ============================================================================
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const COMMIT = process.argv.includes("--commit");
const env = Object.fromEntries(fs.readFileSync("apps/web/.env.local", "utf8").split("\n").filter(Boolean).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const SYSTEM_EMAIL = "imports@charana.ca";

async function systemProfileId(): Promise<string> {
  const { data: existing } = await sb.from("profiles").select("id").eq("email", SYSTEM_EMAIL).maybeSingle();
  if (existing) return existing.id as string;
  if (!COMMIT) return "(would create)";
  const { data, error } = await sb.auth.admin.createUser({
    email: SYSTEM_EMAIL,
    email_confirm: true,
    password: crypto.randomBytes(32).toString("base64url"), // never recorded; nobody signs in as this account
    user_metadata: { full_name: "واردات خودکار", system: true },
  });
  if (error) throw error;
  const id = data.user.id;
  // handle_new_user() normally creates the profile row; make sure it exists and is a plain user.
  await sb.from("profiles").upsert({ id, email: SYSTEM_EMAIL, full_name: "واردات خودکار", role: "user" }, { onConflict: "id" });
  return id;
}

async function main() {
  const sys = await systemProfileId();
  const { data: admins } = await sb.from("profiles").select("id,email").eq("role", "admin");
  const adminIds = (admins ?? []).map((a) => a.id as string);
  const { count } = await sb.from("businesses").select("*", { count: "exact", head: true }).like("verification_notes", "imported from %").in("created_by", adminIds);
  console.log(`system profile: ${sys}\nimported rows still owned by an admin profile: ${count}`);
  if (!COMMIT) { console.log("dry run — pass --commit"); return; }
  const { error, count: moved } = await sb.from("businesses").update({ created_by: sys }, { count: "exact" }).like("verification_notes", "imported from %").in("created_by", adminIds);
  if (error) throw error;
  console.log(`moved ${moved} rows to ${SYSTEM_EMAIL}`);
  for (const a of admins ?? []) { const { count: c } = await sb.from("businesses").select("*", { count: "exact", head: true }).or(`created_by.eq.${a.id},owner_user_id.eq.${a.id}`); console.log(`  ${a.email} dashboard now shows ${c}`); }
}
main().catch((e) => { console.error(e); process.exit(1); });
