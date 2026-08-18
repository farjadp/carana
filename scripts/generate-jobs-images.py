#!/usr/bin/env python3
"""
Generate the hero imagery for the čārana jobs board.

Same locked art direction as generate-category-images.py — this is one campaign
and the jobs board must not look like a different product. The only deviations
are stated below and each has a reason.

The hero sits behind Persian text at the top of /jobs, so unlike the category
cards it needs a quiet region for that text to live in. That is the one place
this file borrows from generate-city-images.py rather than the category set.

Usage:
  python3 scripts/generate-jobs-images.py          # both
  python3 scripts/generate-jobs-images.py hero     # one, by slug
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
QUALITY = "high"

OUT = pathlib.Path("apps/web/public/images/jobs")

# ---------------------------------------------------------------------------
# The shared visual system. Copied verbatim from the category set — not
# paraphrased, because a paraphrase is how a campaign drifts.
# ---------------------------------------------------------------------------
SYSTEM = """
A real editorial photograph, part of one professionally art-directed campaign
for a contemporary Iranian-Canadian product.

It must look photographed on a real camera, not rendered and not generated.
Allow the small natural imperfections that make a photograph believable: a
slight asymmetry, a fingerprint, an uneven surface, a crumb, a worn edge.

Subject: ONE clear real-world detail, object, material or space, placed
slightly off-centre on a surface, with the room breathing around it. This is
not a photograph explaining a profession — no professional posed at their
workplace, no staged scene of someone performing their job, no handshake,
nobody looking at the camera, no exaggerated smiles. When a person appears at
all it is a hand or a partial figure caught mid-action, at the edge of the
frame.

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

No text, no lettering, no signage, no readable labels, no brand names, no
logos, no watermark, no borders.
""".strip()

# The one addition, and only for the wide hero: Persian headline and lede sit
# over the right-hand side of this image, so that region has to stay empty.
# Text over a busy frame is the single most common way a good photograph
# becomes an unreadable header.
HERO_LAYOUT = """
Composition for a wide page header with text overlaid on the RIGHT third:
the subject sits in the LEFT half of the frame, and the right third is calm,
soft and almost empty — plain wall, out-of-focus room, or open surface — with
no detail that would compete with words placed over it. Generous negative
space. Nothing important near any edge.
""".strip()

CARD_LAYOUT = """
Composition for a UI card: one dominant subject, low visual noise, generous
negative space, subject held near the centre so it survives responsive
cropping, nothing important near the edges.
""".strip()

IMAGES = [
    ("hero", "1536x1024", HERO_LAYOUT,
     "the corner of a small contemporary shop or studio just before opening: a warm walnut "
     "counter, a folded linen apron laid over the edge, a set of brass keys and a pale "
     "ceramic cup beside them, a deep maroon notebook closed underneath, morning light "
     "falling across the wood from a window out of frame, nobody present"),

    ("empty", "1024x1024", CARD_LAYOUT,
     "a single pale ceramic cup and an empty walnut chair pulled slightly back from a "
     "cream stone table in a quiet room, a folded linen cloth on the table, soft daylight, "
     "an unmistakable sense of a place waiting for someone, nobody present"),
]


def generate(slug: str, size: str, layout: str, scene: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": MODEL,
        "prompt": f"{SYSTEM}\n\n{layout}\n\nThe scene in this photograph: {scene}.",
        "size": size,
        "quality": QUALITY,
        "n": 1,
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    started = time.time()
    with urllib.request.urlopen(req, timeout=600) as resp:
        body = json.load(resp)

    item = body["data"][0]
    raw = (base64.b64decode(item["b64_json"]) if "b64_json" in item
           else urllib.request.urlopen(item["url"], timeout=300).read())

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{slug}.png"
    path.write_bytes(raw)

    return {"slug": slug, "bytes": len(raw), "seconds": round(time.time() - started, 1)}


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("OPENAI_API_KEY is not set")

    wanted = sys.argv[1:]
    targets = [i for i in IMAGES if not wanted or i[0] in wanted]

    for slug, size, layout, scene in targets:
        try:
            info = generate(slug, size, layout, scene, api_key)
            print(f"ok    {slug:8} {info['bytes'] // 1024:>5} KB  {info['seconds']}s", flush=True)
        except urllib.error.HTTPError as e:
            print(f"FAIL  {slug:8} {e.read().decode()[:200]}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL  {slug:8} {e}", flush=True)


if __name__ == "__main__":
    main()
