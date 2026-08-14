// ============================================================================
// Source: app/api/admin/businesses/bulk-insert/route.ts
// Version: 2.1.0 — 2026-08-20
// Why: Bulk-import businesses from the admin CSV importer, in batches.
// Env / Identity: Admin-only. Identity comes from the caller's own cookies and
//      the role is verified with requireAdmin before any write. This route
//      inserts PUBLISHED rows straight into the public directory using the
//      service role, so an authenticated-only check is not sufficient.
// ============================================================================
import { type NextRequest, NextResponse } from "next/server";

import {
  NotAuthenticatedError,
  NotAuthorizedError,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { slugify } from "@/lib/utils/string";

const MAX_ROWS = 500;
const BATCH_SIZE = 50;

type IncomingBusiness = {
  name?: string;
  name_en?: string;
  category?: string;
  sub_category?: string;
  city?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  description?: string;
  logo_url?: string;
};

export async function POST(req: NextRequest) {
  const { supabase } = createSupabaseRouteHandlerClient(req);

  let adminUser;
  try {
    adminUser = await requireAdmin(supabase, ["admin"]);
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof NotAuthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  try {
    const { businesses } = (await req.json()) as {
      businesses?: IncomingBusiness[];
    };

    if (!Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json(
        { error: "فایلی یا داده‌ای ارسال نشده است" },
        { status: 400 }
      );
    }

    if (businesses.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `حداکثر ${MAX_ROWS} ردیف در هر بار وارد کردن مجاز است.` },
        { status: 400 }
      );
    }

    const missingName = businesses.findIndex((b) => !b.name?.trim());
    if (missingName !== -1) {
      return NextResponse.json(
        { error: `ردیف ${missingName + 1}: نام کسب‌وکار الزامی است.` },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Deterministic slugs de-duplicated against existing rows. The previous
    // random suffix could still collide and produced unreadable URLs.
    const { data: existing } = await adminClient.from("businesses").select("slug");
    const taken = new Set((existing ?? []).map((row) => row.slug as string));

    const businessesToInsert = businesses.map((b) => {
      const base = slugify(b.name_en || b.name || "business") || "business";
      let slug = base;
      let counter = 1;
      while (taken.has(slug)) {
        slug = `${base}-${counter}`;
        counter += 1;
      }
      taken.add(slug);

      return {
        slug,
        name: b.name!.trim(),
        name_en: b.name_en?.trim() || null,
        category: b.category || "uncategorized",
        sub_category: b.sub_category || null,
        city: b.city?.trim() || "نامشخص",
        address: b.address || null,
        phone: b.phone || null,
        website: b.website || null,
        contact_email: b.email || null,
        description: b.description || null,
        logo_url: b.logo_url || null,
        status: "PUBLISHED",
        created_by: adminUser.id,
      };
    });

    let insertedCount = 0;

    for (let i = 0; i < businessesToInsert.length; i += BATCH_SIZE) {
      const chunk = businessesToInsert.slice(i, i + BATCH_SIZE);
      const { data, error } = await adminClient
        .from("businesses")
        .insert(chunk)
        .select("id");

      if (error) {
        console.error(`Supabase batch insert error at index ${i}:`, error);
        return NextResponse.json(
          { error: `${error.message} (${insertedCount} مورد پیش از خطا ثبت شد)` },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        insertedCount += data.length;

        const { error: membershipError } = await adminClient
          .from("business_memberships")
          .insert(
            data.map((row) => ({
              business_id: row.id,
              user_id: adminUser.id,
              role: "owner",
            }))
          );

        if (membershipError) {
          console.error("Bulk membership insert error:", membershipError);
        }
      }
    }

    return NextResponse.json({ success: true, count: insertedCount });
  } catch (error: any) {
    console.error("Bulk Insert Error:", error);
    return NextResponse.json(
      { error: error.message || "خطا در ثبت گروهی کسب‌وکارها" },
      { status: 500 }
    );
  }
}
