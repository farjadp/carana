// ============================================================================
// Source: lib/blog/images.ts
// Version: 1.0.0 — 2026-08-16
// Why: Post imagery through fal.ai, art-directed exactly like the category and
//      city photography (scripts/generate-category-images.py) so the blog reads
//      as the same campaign: real editorial photograph, warm cream, maroon /
//      lapis / navy only as accents in objects, one subject, no text. Uploads
//      into the public `blog` bucket and returns the CDN URL.
// Env / Identity: Server only. FAL_KEY + service role.
// ============================================================================
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const FAL_ENDPOINT = "https://fal.run/fal-ai/flux/schnell";

/** Shared visual system — keep in step with the Python script. */
export const BRAND_ART_DIRECTION = `
A real editorial photograph, part of one professionally art-directed campaign for a contemporary Iranian-Canadian product. It must look photographed on a real camera, not rendered and not generated; allow small natural imperfections.
Subject: ONE clear real-world detail, object, material or space, slightly off-centre, with the room breathing around it. Medium-close. Never a wide establishing scene, no professional posed at their workplace, no handshake, nobody looking at the camera; when a person appears it is a hand or partial figure at the edge of the frame.
Light: soft natural daylight from one side, restrained contrast, no dramatic lighting, no HDR, no heavy grading. Gentle depth of field.
Atmosphere: warm cream is the dominant tone. Deep maroon (#7A1831), lapis blue (#0047AB) and deep navy appear only as restrained accents in real objects — a ceramic, a textile, a book cover, a painted wall. Never tint the photograph.
Materials: warm walnut, cream stone, unglazed ceramic, brass, linen. Contemporary Canadian interiors and streets; never a flag, maple leaf or skyline landmark. Persian cues, when present, are pre-Islamic and quiet: a stepped-merlon edge on a ceramic, a boteh on a textile, a cypress in a window — never pointed arches, eight-point stars, domes or calligraphy.
Composition: one dominant subject, low visual noise, generous negative space, subject held near the centre so it survives cropping.
No text, no lettering, no signage, no readable labels, no brand names, no logos, no watermark, no borders.
`.trim();

export type GeneratedImage = { url: string; path: string };

/**
 * Generate one image and store it. `scene` is the per-image sentence the
 * writer model produced; the art direction is prepended verbatim.
 */
export async function generatePostImage(opts: {
  scene: string;
  postSlug: string;
  role: "cover" | "inline";
  landscape?: boolean;
}): Promise<GeneratedImage | null> {
  const key = process.env.FAL_KEY;
  if (!key) {
    console.warn("blog/images: FAL_KEY missing — post will ship without images");
    return null;
  }
  const size = opts.landscape === false ? "square_hd" : "landscape_16_9";
  const res = await fetch(FAL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `${BRAND_ART_DIRECTION}\n\nScene: ${opts.scene}`,
      image_size: size,
      num_images: 1,
      num_inference_steps: 4,
      enable_safety_checker: true,
      output_format: "jpeg",
    }),
  });
  if (!res.ok) {
    console.error("blog/images: fal error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { images?: { url: string; content_type?: string }[] };
  const src = json.images?.[0]?.url;
  if (!src) return null;

  const bin = await fetch(src);
  if (!bin.ok) return null;
  const buf = Buffer.from(await bin.arrayBuffer());

  const admin = createSupabaseAdminClient();
  const path = `${new Date().toISOString().slice(0, 7)}/${opts.postSlug}/${opts.role}-${Date.now()}.jpg`;
  const { error } = await admin.storage.from("blog").upload(path, buf, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
  if (error) {
    console.error("blog/images: upload failed", error);
    return null;
  }
  const { data } = admin.storage.from("blog").getPublicUrl(path);
  return { url: data.publicUrl, path };
}
