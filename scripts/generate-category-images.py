#!/usr/bin/env python3
"""
Generate the GOPLAZA category photography set.

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
SIZE = "1536x1024"
QUALITY = "high"

OUT = pathlib.Path("charana-category-images/round-2")

# ---------------------------------------------------------------------------
# The shared visual system. Identical in every call.
# ---------------------------------------------------------------------------
SYSTEM = """
A real editorial photograph, part of one professionally art-directed campaign
for a contemporary Iranian-Canadian product.

It must look photographed on a real camera, not rendered and not generated.
Allow the small natural imperfections that make a photograph believable: a
slight asymmetry, a fingerprint, an uneven surface, a crumb, a worn edge.

Subject: ONE clear real-world detail, object, material or space, placed
slightly off-centre on a surface, with the room breathing around it — a wall, a
window edge, a chair back softening away behind. Medium-close: near enough that
the object is unmistakably the subject, far enough that it sits somewhere real
rather than floating on a styling table. Never a wide establishing scene. This is not a photograph explaining a
profession — no professional posed at their workplace, no staged scene of
someone performing their job, no handshake, nobody looking at the camera, no
exaggerated smiles. When a person appears at all it is a hand or a partial
figure caught mid-action, at the edge of the frame.

Light: soft natural daylight from one side, restrained contrast, no dramatic
or cinematic lighting, no HDR, no heavy colour grading. Gentle depth of field —
the background is softer than the subject but still readable, never dissolved
into heavy bokeh.

Atmosphere: warm cream is the dominant tone of the whole campaign. Deep maroon,
lapis blue and deep navy appear only as restrained accents in real objects —
a ceramic, a textile, a book cover, a painted wall. Never recolour or tint the
photograph itself.

Materials that recur across the campaign: warm walnut, cream stone, unglazed
ceramic, brass, linen. Contemporary Canadian interiors and streets, never a
flag, a maple leaf or a skyline landmark.

Composition for a UI card: one dominant subject, low visual noise, generous
negative space, subject held near the centre so it survives responsive
cropping, nothing important near the edges.

No text, no lettering, no signage, no readable labels, no brand names, no
logos, no watermark, no borders.
""".strip()

# ---------------------------------------------------------------------------
CATEGORIES = [
    ("restaurant-cafe",
     "a shallow ceramic bowl of contemporary Persian food set slightly off-centre on a "
     "pale stone cafe table, a slim glass of black tea behind it, a folded deep maroon "
     "napkin and cutlery to one side, a sprig of eucalyptus in clear glass, a soft window "
     "and a chair back falling away behind"),

    ("medical-clinic",
     "a stethoscope resting on a warm cream stone counter in a quiet contemporary clinic, "
     "a small amber glass bottle beside it, a deep navy panel and a single olive branch in "
     "a pale vase softening away behind, nobody present"),

    ("digital-it",
     "the corner of an open laptop on a warm walnut desk, a deep navy ceramic cup of coffee "
     "beside it, a dried branch in a pale vessel behind, screen dark and unreadable, morning "
     "light across the wood"),

    ("skilled-trades",
     "a few well-used hand tools laid in a row on a walnut workbench, a brass measuring tape "
     "and a folded canvas cloth, pale plaster wall behind, one hand just leaving the frame"),

    ("real-estate-mortgage",
     "a quiet corner of a contemporary Canadian home: a pale stone sill, a brass door handle "
     "catching light, a linen curtain moving slightly, a single key on the sill"),

    ("legal-immigration",
     "a walnut desk with a closed leather folder, a fountain pen resting on it and a pair of "
     "reading glasses to one side, deep navy book spines out of focus behind"),

    ("accounting-tax",
     "an uncluttered walnut desk with a small calculator, a neat stack of papers weighted by "
     "a brass ruler, a cup of tea at the edge, pale wall behind"),

    ("automotive",
     "a detail of a clean car in a bright modern workshop: the curve of a wheel arch and a "
     "polished alloy wheel, a folded cloth on the floor, pale concrete and daylight"),

    ("education",
     "an open notebook and two closed books on a walnut table, a pencil across the page, a "
     "glass of tea at the edge, a window and pale curtain behind"),

    ("events",
     "a table being laid for a gathering: pale ceramic plates, deep maroon linen napkins, a "
     "brass candlestick unlit, small seasonal flowers, cream wall behind"),

    ("beauty-wellness",
     "a calm counter in a contemporary studio: a folded linen towel, a small brass hand "
     "mirror face down, an unglazed ceramic dish, one amber bottle, soft daylight"),

    ("iranian-grocery",
     "a wooden crate of fresh herbs beside a shallow bowl of pistachios and a small dish of "
     "saffron threads on a pale stone counter, a pomegranate at the edge of frame, warm shop "
     "light behind"),
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
    for slug, scene in targets:
        try:
            info = generate(slug, scene, api_key)
            info["status"] = "ok"
            print(f"ok    {slug:24} {info['bytes'] // 1024:>5} KB  {info['seconds']}s")
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            info = {"slug": slug, "status": "failed", "error": detail}
            print(f"FAIL  {slug:24} {detail}")
        except Exception as e:  # noqa: BLE001
            info = {"slug": slug, "status": "failed", "error": str(e)}
            print(f"FAIL  {slug:24} {e}")
        results.append(info)

    OUT.mkdir(exist_ok=True)
    (OUT / "_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
    ok = sum(1 for r in results if r["status"] == "ok")
    print(f"\n{ok}/{len(results)} generated into {OUT}/")


if __name__ == "__main__":
    main()
