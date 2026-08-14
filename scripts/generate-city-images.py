#!/usr/bin/env python3
"""
Generate the city card backgrounds for the čārana home page.

These are backgrounds, not photographs to admire. Persian city names sit on top
of them, so the shared system below is written around legibility first: dark,
low-contrast, no busy detail in the middle, no bright sky where a word will be.
An overlay gradient in CSS does the rest.

Landscape 1536x1024, because the cards are wider than they are tall.

Usage:
  python3 scripts/generate-city-images.py           # all eight
  python3 scripts/generate-city-images.py toronto   # one
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

OUT = pathlib.Path("apps/web/public/images/cities")

SYSTEM = """
A moody, atmospheric photograph of a Canadian city, used as a dark background
behind large overlaid text. Legibility of that future text is the first
requirement.

Treatment, identical across the whole set: shot at blue hour just after sunset,
deep navy and near-black tones, low overall contrast, soft haze, no bright sky,
no sun, no strong highlights, no lens flare. Slightly desaturated with a cool
cast and a faint warm glow only from small distant windows. Fine film grain.

Composition: the subject sits low and wide across the lower third of the frame.
The upper two thirds are calm, dark and almost empty — sky, haze or water — with
no detail that would compete with text placed over it. Wide establishing view
from a distance. No people, no vehicles in the foreground, no signage, no
readable text of any kind, no logos, no watermark, no border.

Absolutely no text or lettering anywhere in the image.
""".strip()

CITIES = [
    ("toronto", "the downtown skyline seen across the lake, a dense cluster of "
                "towers low on the horizon with one tall slender tower among them"),
    ("vancouver", "the harbour and glass towers seen from the water, dark "
                  "coastal mountains rising softly behind them"),
    ("montreal", "the skyline seen from the hill, low stone and brick buildings "
                 "with a broad dark rise behind the city"),
    ("calgary", "the skyline low on a wide flat prairie horizon with distant "
                "mountains barely visible far behind"),
    ("ottawa", "gothic revival parliament rooflines and spires low across the "
               "frame, seen from across the dark river"),
    ("edmonton", "the river valley curving through the city, towers set back "
                 "along a wooded dark bank"),
    ("winnipeg", "a wide flat prairie horizon with a compact low skyline and a "
                 "river bend in the foreground"),
    ("halifax", "the harbour waterfront with a low hillside town and moored "
                "boats, dark open water in the foreground"),
]


def generate(slug: str, scene: str, api_key: str) -> dict:
    payload = json.dumps({
        "model": MODEL,
        "prompt": f"{SYSTEM}\n\nThe city in this photograph: {scene}.",
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

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{slug}.png"
    path.write_bytes(raw)

    return {"slug": slug, "bytes": len(raw), "seconds": round(time.time() - started, 1)}


def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("OPENAI_API_KEY is not set")

    wanted = sys.argv[1:]
    targets = [c for c in CITIES if not wanted or c[0] in wanted]

    for slug, scene in targets:
        try:
            info = generate(slug, scene, api_key)
            print(f"ok    {slug:12} {info['bytes'] // 1024:>5} KB  {info['seconds']}s", flush=True)
        except urllib.error.HTTPError as e:
            print(f"FAIL  {slug:12} {e.read().decode()[:200]}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL  {slug:12} {e}", flush=True)


if __name__ == "__main__":
    main()
