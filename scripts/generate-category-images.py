#!/usr/bin/env python3
"""
Generate the čārana category photography set.

One API call per category, never a collage — these are product assets that get
cropped into cards independently, so a grid image is useless.

The point of the SYSTEM block below is consistency: the whole set has to read
as one photographer shooting one campaign in one week. Every per-category
prompt is the same system text plus a scene, so the model is not re-inventing
the lighting and grading twelve times.

Usage:
  python3 scripts/generate-category-images.py            # all twelve
  python3 scripts/generate-category-images.py automotive # one, by slug
"""

import base64
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.request

MODEL = "gpt-image-2"
SIZE = "1024x1024"
QUALITY = "high"

OUT = pathlib.Path("charana-category-images")

# ---------------------------------------------------------------------------
# The shared visual system. Identical in every call.
# ---------------------------------------------------------------------------
SYSTEM = """
Premium editorial lifestyle photograph for a modern Canadian technology brand
with Iranian cultural roots. Shot as part of a single cohesive brand campaign.

Photographic system, identical across the whole set: soft natural daylight from
a large window, slightly warm white balance, restrained contrast with gentle
film-like grain, 35mm to 50mm lens feel, shallow but not exaggerated depth of
field, calm visual hierarchy, generous negative space of roughly 20 percent
around the main subject, subject centred or slightly off-centre so the frame
crops cleanly to both square and landscape.

Colour: warm cream surfaces, deep navy, restrained maroon and lapis blue
accents appearing naturally through wardrobe, materials, objects and shadows.
Never a monochrome maroon poster. Materials read as natural stone, walnut wood,
brass and ceramic.

Iranian identity appears subtly through craftsmanship, textile geometry,
material choices and the people themselves. Absolutely no Islamic arches,
domes, minarets, mosques, lanterns, Arabic calligraphy, eight-pointed stars,
oriental fantasy interiors, Persian carpets used as decoration, or national
flags of any country.

People, where present, are contemporary Iranian-Canadians of varied age and
gender, dressed as real working professionals, caught in candid working
moments, never looking into the camera, never posed handshakes, with realistic
skin texture rather than retouched perfection.

Strictly no text, no lettering, no signage, no numbers, no logos, no watermark,
no UI elements, no borders or frames. Realistic documentary photography, not
stock photography, not illustration, not 3D render.
""".strip()

# ---------------------------------------------------------------------------
CATEGORIES = [
    ("skilled-trades", "خدمات فنی و تخصصی",
     "A skilled tradesperson working with real tools inside a bright, clean, "
     "contemporary Canadian home mid-renovation. Hands and craft are the "
     "subject. No hard hats, no construction-site clichés, no posed contractor."),

    ("real-estate-mortgage", "املاک و وام مسکن",
     "A refined contemporary Canadian living room where a real-estate "
     "professional and a client review property documents together at a table. "
     "Quiet, considered, trust-building. No key handovers, no oversized keys, "
     "no handshakes, no mansion fantasy."),

    ("legal-immigration", "حقوقی و مهاجرت",
     "A calm modern law office with natural stone and walnut, where a lawyer "
     "reviews documents across a desk with a client. Serious, intelligent, "
     "reassuring. No scales of justice, no gavels, no passports, no flags."),

    ("accounting-tax", "حسابداری و مالیات",
     "An accountant at an uncluttered desk with a laptop and organised "
     "paperwork, explaining something to a client seated beside them. No "
     "floating charts, no cash, no coins, no generic fintech abstraction."),

    ("automotive", "خودرو",
     "A spotless modern independent automotive workshop where a mechanic "
     "inspects an engine bay with focused precision. Ordinary well-kept family "
     "car. No supercars, no racing, no grease-covered stereotype garage."),

    ("education", "آموزش",
     "A tutor and a teenage student working through material together at a "
     "table in a bright contemporary Canadian learning space. Curiosity and "
     "progress. No graduation caps, no chalkboards, no lecture halls."),

    ("medical-clinic", "پزشکی و سلامت",
     "A bright contemporary Canadian clinic consultation room where a "
     "healthcare professional listens attentively to a patient. Care and "
     "cleanliness. No surgery, no dramatic hospital imagery, no oversized "
     "medical symbols."),

    ("events", "رویدادها و خدمات مراسم",
     "An elegant contemporary Iranian-Canadian celebration table being styled "
     "before guests arrive: ceramics, seasonal flowers, textiles with subtle "
     "Persian geometry, warm candlelight. No wedding clichés, no traditional "
     "costume, no luxury excess."),

    ("digital-it", "دیجیتال و فناوری",
     "Two technology professionals working together in a calm, plant-filled "
     "Canadian studio workspace, screens present but content indistinct. No "
     "hooded hackers, no neon, no holograms, no cyberpunk."),

    ("beauty-wellness", "زیبایی و سلامت فردی",
     "A calm premium contemporary salon or wellness studio in soft daylight, a "
     "professional at work with a client. Natural textures and restrained "
     "warmth. No over-retouched faces, no spa clichés, nothing sexualised."),

    ("restaurant-cafe", "رستوران و کافه",
     "Contemporary Iranian food plated beautifully on ceramic at a shared table "
     "in a modern Canadian restaurant, warm daylight, hands reaching in to "
     "serve. Appetising and authentic. No oriental decoration, no carpets, no "
     "hookah."),

    ("iranian-grocery", "فروشگاه و مواد غذایی ایرانی",
     "A modern Iranian grocery in Canada: beautifully organised shelves, fresh "
     "herbs, pomegranates, saffron, tea, rice and nuts in clean contemporary "
     "packaging with no readable labels. Warm, familiar, local. No bazaar, no "
     "market stereotype, no clutter."),
]


def build_prompt(scene: str) -> str:
    return f"{SYSTEM}\n\nScene for this photograph: {scene}"


def generate(slug: str, scene: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": MODEL,
        "prompt": build_prompt(scene),
        "size": SIZE,
        "quality": QUALITY,
        "n": 1,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    started = time.time()
    with urllib.request.urlopen(req, timeout=600) as resp:
        body = json.load(resp)

    item = body["data"][0]
    if "b64_json" in item:
        raw = base64.b64decode(item["b64_json"])
    else:
        with urllib.request.urlopen(item["url"], timeout=300) as img:
            raw = img.read()

    OUT.mkdir(exist_ok=True)
    path = OUT / f"category-{slug}.png"
    path.write_bytes(raw)

    return {
        "slug": slug,
        "path": str(path),
        "bytes": len(raw),
        "seconds": round(time.time() - started, 1),
        "revised_prompt": item.get("revised_prompt"),
    }


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("OPENAI_API_KEY is not set")

    wanted = sys.argv[1:]
    targets = [c for c in CATEGORIES if not wanted or c[0] in wanted]
    if not targets:
        sys.exit(f"no category matched {wanted}")

    results = []
    for slug, title_fa, scene in targets:
        try:
            info = generate(slug, scene, api_key)
            info["title_fa"] = title_fa
            info["status"] = "ok"
            print(f"ok    {slug:24} {info['bytes'] // 1024:>5} KB  {info['seconds']}s")
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            info = {"slug": slug, "title_fa": title_fa, "status": "failed", "error": detail}
            print(f"FAIL  {slug:24} {detail}")
        except Exception as e:  # noqa: BLE001
            info = {"slug": slug, "title_fa": title_fa, "status": "failed", "error": str(e)}
            print(f"FAIL  {slug:24} {e}")
        results.append(info)

    OUT.mkdir(exist_ok=True)
    (OUT / "_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
    ok = sum(1 for r in results if r["status"] == "ok")
    print(f"\n{ok}/{len(results)} generated into {OUT}/")


if __name__ == "__main__":
    main()
