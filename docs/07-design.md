# Design and brand

## Palette

| Token | Hex | Use |
|---|---|---|
| `--annabi` عنابی | `#800000` | primary accent, CTAs, active states |
| `--lajvard` لاجورد | `#0047AB` | secondary accent, links |
| `--text` | `#14213D` | body text, deep navy |
| `--muted-text` | `#5F6472` | secondary text |
| `--bg` | `#F6F1E8` | page background, cream |
| `--line` | `rgba(20,33,61,0.10)` | borders |

Mirrored in `apps/mobile/src/theme.ts`.

## Visual language

Pre-Islamic Persian, deliberately. The distinction matters and was got wrong
once already.

**Use:** the Achaemenid stepped merlon from the Persepolis parapets, the
twelve-petal Persepolis lotus, boteh jegheh (the paisley of Persian carpets),
the cypress, Achaemenid column geometry.

**Do not use:** pointed Islamic arches, eight-pointed shamseh stars, domes,
minarets, Arabic calligraphy, lanterns, or any generic "oriental" motif.

The first attempt at the category art used a pointed arch and an eight-pointed
star and read as Islamic rather than Iranian. It was rejected and redrawn.

## Category artwork

12 SVGs in `apps/web/public/images/categories/`, one per category slug, plus
`business-placeholder.svg`.

Shared system: Achaemenid stepped merlon frame, boteh in the corners, a minimal
glyph inside. Pomegranate for grocery, cypress for wellness, daf for events.

**These are adequate, not good.** They were hand-coded as SVG path data, which
works for geometry and poorly for illustration. If a designer is ever engaged,
this is the second thing to hand them.

A comparison of three cleaner directions was built and is worth revisiting:
Lucide icons on a cream tile, Lucide icons reversed on solid brand colour, and
a purely typographic treatment with no pictogram at all. The solid-colour
option read strongest at small sizes.

## App icon and splash

`apps/mobile/assets/images/` — `icon.png`, `splash-icon.png`, the three Android
adaptive layers, `favicon.png`. Generated from
`scratchpad/gen-app-icon.mjs`, rasterised through a browser canvas since no
rasteriser is installed.

Two details that are easy to get wrong and are correct here: the iOS icon is
**not** pre-rounded, because the system masks it and a rounded source gets
masked twice; the Android mark sits inside the adaptive safe zone so the
circular crop does not clip it.

## The logo — still needs doing

The current mark is a placeholder `č`. It is not a logo.

**This is the one piece worth paying a designer for.** It is permanent brand
identity, it sits next to competitors in the App Store, and changing it after
launch is expensive. Below is a brief ready to hand to a designer or paste into
an image model.

---

### Brief

**Brand:** čārana (چارانا) — Persian-language directory of Iranian businesses
in Canada
**Company:** Ashavid Inc., Toronto
**Audience:** Iranians in Canada looking for a Persian-speaking lawyer, doctor,
restaurant, realtor

**It must convey:** trust and verification (every listing is reviewed before
publication — this is the differentiator); Iranian roots with a Canadian home,
without nostalgia or cliché; finding, not selling.

**Visual language:** as above — pre-Islamic Persian, never generic oriental.

**Colour:** `#800000`, `#0047AB`, `#14213D`, `#F6F1E8`.

**Technical:** legible at 16px; works in one colour; app icon in a square with
no rounded corners of its own; generous negative space; sits beside both
"چارانا" and "čārana".

### Prompts for an image model

**1 — Geometric abstract**
```
Minimal geometric logo mark for a Persian business directory. Abstract symbol
derived from the stepped merlon crenellation of Persepolis, simplified to three
clean stepped forms suggesting both a rooftop and an upward path. Flat vector,
single weight, deep maroon #800000 on cream #F6F1E8. Generous negative space,
no gradients, no text, no Islamic arches or eight-pointed stars. Legible at 16
pixels. Centered on white, isolated logo mark.
```

**2 — Lotus**
```
Minimal flat vector logo: a twelve-petal Achaemenid lotus rosette from
Persepolis reliefs, radically simplified to six petals, geometric and perfectly
symmetrical, drawn with a single consistent stroke weight. Deep maroon and lapis
blue on cream. Modern tech-brand simplicity, not ornamental. No text. Isolated
on white.
```

**3 — Boteh (recommended)**
```
Modern minimal logo mark based on the boteh jegheh paisley of Persian carpets,
reduced to one confident closed curve with a curled tip. Geometric construction,
single stroke weight, deep maroon #800000. Reads as both a leaf and a location
pin. Flat vector, no gradient, no text, no ornament. Must work at 16 pixels and
in one colour. Isolated on white background.
```

**4 — Cypress**
```
Minimalist logo mark of a Persian cypress tree, the ancient Iranian tree of
life, abstracted into a single tapering geometric form with a subtle
characteristic bend at the top. Flat vector, deep maroon on cream, one solid
shape, generous negative space, no branches or texture, no text. Modern
identity design for a technology company. Isolated on white.
```

**Try 3 first.** It is the only one that is unmistakably Iranian, simple enough
to survive 16px, and can carry a second reading of "place" — which is what the
product does.

## Web CSS

`apps/web/app/globals.css`, ~2,700 lines. Hand-written classes alongside
Tailwind 4. It works but it is long and would benefit from being split by
concern. Sections added recently are commented with their date and purpose.
