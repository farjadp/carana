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
PROBE = ["legal-immigration", "restaurant-cafe", "digital-it"]

# ---------------------------------------------------------------------------
# The master visual language. Identical in every single call.
# ---------------------------------------------------------------------------
SYSTEM = """
A minimal geometric flat vector symbol for a premium modern technology brand.
Part of one custom illustration system, drawn as if constructed with compass
and straightedge on a strict modular grid.

Construction, which is where the identity lives: forms are assembled from
stepped rectilinear profiles, exact bilateral or radial symmetry, and steady
repetition of a single module. Edges are either orthogonal or at clean 45
degree angles. Where a form tapers it tapers in discrete steps, never in a
smooth curve. Circles are true circles. This stepped, modular, strictly
symmetrical construction is the visual signature and must be visible in the
silhouette itself.

Legibility is the first requirement. The subject must be recognisable within one
second, by someone glancing at a small card. An abstract decorative medallion
that could belong to any category is a failure, however beautiful.

The identity is in HOW the recognisable form is drawn, not in replacing it with
ornament: draw the real thing, but construct it entirely from stepped modular
geometry with exact symmetry. Never reproduce the standard app-icon glyph for
the subject — find a different, simpler cut of the same idea.

Composition: one centred symbol occupying roughly half the frame, generous
empty space around it, perfectly flat. No perspective, no depth, no shadow, no
gradient, no texture, no outline stroke, no highlight.

Colour: exactly two. Solid deep maroon #800000 filling the entire frame, symbol
in warm cream #F6F1E8. No third colour, no white, no black, no gradient.

FORBIDDEN, without exception: bulbous, onion-shaped, domed, teardrop-topped or
tapering tower forms of any kind. Arches of any kind. Minarets, mosques,
lanterns, eight-pointed stars, Arabic calligraphy, carpets, flags, monuments,
buildings. Scales of justice. Generic hub-and-spoke network diagrams. Anything
that reads as a stock icon-library glyph.

No photography, no realism, no 3D, no isometric, no sketch texture. No text, no
letters, no numbers, no logo, no watermark, no border, no frame. The symbol must
stay legible at 120 pixels, so large simple forms only and no fine detail.
""".strip()

# ---------------------------------------------------------------------------
# Only this line changes between categories.
# ---------------------------------------------------------------------------
CATEGORIES = [
    ("skilled-trades", "خدمات فنی و تخصصی",
     "a stylised geometric tool form — a simple angular wrench or square-and-"
     "compass shape built from a few straight solid bars meeting at clean angles"),

    ("real-estate-mortgage", "املاک و وام مسکن",
     "a stylised geometric dwelling — a simple solid house silhouette whose "
     "roofline follows a stepped Achaemenid rhythm rather than a plain triangle"),

    ("legal-immigration", "حقوقی و مهاجرت",
     "a document with a stepped seal: a tall upright rectangle standing for a "
     "sheet of paper, its lower right corner carrying a small square stamp built "
     "of stepped modules, and three short horizontal bars across its upper half "
     "standing for lines of writing"),

    ("accounting-tax", "حسابداری و مالیات",
     "a stylised geometric ledger — a stack of even horizontal bars of "
     "decreasing width, rising in a steady rhythm like a stepped profile"),

    ("automotive", "خودرو",
     "a stylised geometric wheel — a bold ring with a small number of evenly "
     "spaced radial spokes, radially symmetrical like an ancient lotus rosette"),

    ("education", "آموزش",
     "a stylised geometric open book — two symmetrical solid pages meeting at a "
     "central spine, with a single small form rising above them"),

    ("medical-clinic", "پزشکی و سلامت",
     "a stylised geometric care symbol — a rounded solid heart-adjacent form "
     "with a clean cross-shaped negative space cut precisely through its centre"),

    ("events", "رویدادها و خدمات مراسم",
     "a stylised geometric celebration form — a radially symmetrical burst of "
     "identical tapering petals, built on the twelve-fold rhythm of a lotus rosette"),

    ("digital-it", "دیجیتال و فناوری",
     "a screen: a wide rectangle with a thick stepped border and a solid centre, "
     "standing on a short symmetrical stepped base, unmistakably a display or "
     "monitor seen straight on"),

    ("beauty-wellness", "زیبایی و سلامت فردی",
     "a stylised geometric botanical — a single symmetrical form of tapering "
     "leaves rising from one stem, following the vertical proportion of a cypress"),

    ("restaurant-cafe", "رستوران و کافه",
     "a plate seen from directly above: one bold circle with a narrower "
     "concentric ring inside it, flanked left and right by two simple straight "
     "vertical bars of equal length standing for utensils, all built from clean "
     "orthogonal geometry with flat square ends and no tapering or rounded tips"),

    ("iranian-grocery", "فروشگاه و مواد غذایی ایرانی",
     "a stylised geometric vessel — a wide symmetrical jar or basket form with a "
     "simple stepped rim and a repeating rhythm across its body"),
]


def build_prompt(metaphor: str) -> str:
    return f"{SYSTEM}\n\nThe central symbol for this image: {metaphor}."


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
