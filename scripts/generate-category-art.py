#!/usr/bin/env python3
"""
Generate the čārana category illustration system.

Direction: minimal geometric flat illustration, not photography. Iranian
identity lives in the geometry and rhythm, never in a monument or a
foodstuff — a Persepolis column for the lawyer and a pomegranate for the
restaurant becomes a cliché by the third image.

The point is not twelve attractive pictures. It is ONE illustration system
containing twelve category images, which is why SYSTEM below is byte-identical
in every call and only METAPHOR changes. Writing a bespoke art prompt per
category is how a set stops being a set.

Usage:
  python3 scripts/generate-category-art.py --probe        # three, to judge the system
  python3 scripts/generate-category-art.py                # all twelve
  python3 scripts/generate-category-art.py automotive     # named slugs
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

OUT = pathlib.Path("charana-category-art")

# The three that stress the system in different directions: an abstract idea,
# a physical object, and a network. If one language carries all three it will
# carry the rest.
PROBE = ["restaurant-cafe", "medical-clinic", "legal-immigration"]

# ---------------------------------------------------------------------------
# The master visual language. Identical in every single call.
# ---------------------------------------------------------------------------
SYSTEM = """
A single minimal flat pictogram for a premium mobile app icon set.

This is app iconography, not artwork. One central object, bold simple
silhouette, very low detail, large clear shapes. It must be recognisable
instantly at small size on a phone.

Background: solid warm cream #F6F1E8, filling the entire frame, completely
plain.
Main shape: solid deep maroon #800000.
Optional second shape: deep navy #14213D, only where it genuinely helps.
Maximum two colours in the pictogram. No third colour.

The object is precisely centred, both horizontally and vertically, with equal
margins on all four sides. It occupies almost exactly half the width and half
the height of the frame. Every icon in this set must sit at the same optical
size and the same position, so they line up perfectly when placed side by side.

The one shared signature across the whole set: the BOTTOM-RIGHT CORNER of the
main shape is squared off as a small staircase of exactly three even steps,
each step the same size, descending toward the lower right. It is small —
roughly one eighth of the shape's width — and it reads as a deliberate corner
treatment, the way a chamfer or a rounded corner would.

It must look designed, not damaged. The object stays complete and undamaged
everywhere else: nothing is bitten out of the middle of an edge, nothing
interrupts the object's silhouette anywhere except that one corner, and the
object remains immediately readable as itself.

The stepped corner appears exactly once, only at the bottom right, in every
icon without exception.

NONE OF THE FOLLOWING: scenes, backgrounds, environments, people, faces, hands,
photography, realism, 3D, isometric, perspective, shadows, gradients, outlines,
strokes, textures, patterns, ornament, floating extra elements, sparkles, dots,
multiple objects, monuments, architecture, carpets, arches, domes, stars.

No text, no letters, no numbers, no logo, no watermark, no frame, no border.

The result should sit comfortably in an icon set made for Stripe, Linear or
Notion. Modern first. The geometry is the only thing that is Iranian, and only
to someone who studies it.
""".strip()

# ---------------------------------------------------------------------------
# Only this line changes between categories.
# ---------------------------------------------------------------------------
CATEGORIES = [
    ("skilled-trades", "خدمات فنی و تخصصی", "a wrench"),
    ("real-estate-mortgage", "املاک و وام مسکن", "a house"),
    ("legal-immigration", "حقوقی و مهاجرت", "a single sheet of paper, a document"),
    ("accounting-tax", "حسابداری و مالیات", "a calculator"),
    ("automotive", "خودرو", "a car wheel"),
    ("education", "آموزش", "an open book"),
    ("medical-clinic", "پزشکی و سلامت", "a medical cross"),
    ("events", "رویدادها و خدمات مراسم", "a calendar page"),
    ("digital-it", "دیجیتال و فناوری", "a computer screen"),
    ("beauty-wellness", "زیبایی و سلامت فردی", "a hand mirror"),
    ("restaurant-cafe", "رستوران و کافه", "a plate seen from above"),
    ("iranian-grocery", "فروشگاه و مواد غذایی ایرانی", "a shopping basket"),
]


def build_prompt(metaphor: str) -> str:
    return f"{SYSTEM}\n\nThe object in this pictogram: {metaphor}."


def generate(slug: str, metaphor: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": MODEL,
        "prompt": build_prompt(metaphor),
        "size": SIZE,
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

    OUT.mkdir(exist_ok=True)
    path = OUT / f"{slug}.png"
    path.write_bytes(raw)

    return {"slug": slug, "path": str(path), "bytes": len(raw),
            "seconds": round(time.time() - started, 1)}


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("OPENAI_API_KEY is not set")

    args = [a for a in sys.argv[1:] if a != "--probe"]
    if "--probe" in sys.argv:
        targets = [c for c in CATEGORIES if c[0] in PROBE]
    elif args:
        targets = [c for c in CATEGORIES if c[0] in args]
    else:
        targets = CATEGORIES

    if not targets:
        sys.exit("no category matched")

    results = []
    for slug, title_fa, metaphor in targets:
        try:
            info = generate(slug, metaphor, api_key)
            info.update(title_fa=title_fa, status="ok", metaphor=metaphor)
            print(f"ok    {slug:24} {info['bytes'] // 1024:>5} KB  {info['seconds']}s", flush=True)
        except urllib.error.HTTPError as e:
            info = {"slug": slug, "status": "failed", "error": e.read().decode()[:300]}
            print(f"FAIL  {slug:24} {info['error']}", flush=True)
        except Exception as e:  # noqa: BLE001
            info = {"slug": slug, "status": "failed", "error": str(e)}
            print(f"FAIL  {slug:24} {e}", flush=True)
        results.append(info)

    OUT.mkdir(exist_ok=True)
    (OUT / "_results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\n{sum(1 for r in results if r['status'] == 'ok')}/{len(results)} into {OUT}/")


if __name__ == "__main__":
    main()
