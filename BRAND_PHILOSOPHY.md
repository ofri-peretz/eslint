# BRAND_PHILOSOPHY.md — one thread, every scale

> The visual and verbal identity contract for everything Interlace ships —
> the DS (`packages/ui`), the docs site, the blog, the storybook. Paired
> with DOCS_PHILOSOPHY.md the way COLOR pairs with TYPOGRAPHY: this file
> says who we are; the token files say how that renders.

---

## 1. What stands behind Interlace

Interlace builds tools that let you move at **scale**, at **velocity**, and
do your thing **peacefully**.

The brand names its enemies, not its features:

| We drive toward | The enemy we remove |
| --- | --- |
| **Innovation** | Maintenance — maintenance is the enemy of innovation |
| **Velocity** | Tech debt — debt is the enemy of velocity |
| **Scale** | Engineering bottlenecks — bottlenecks are the enemy of scale |

These are mottos — the direction we drive, phrased as intent. They are
never rendered as measured claims ("0 maintenance guaranteed"); data
honesty outranks copy. *Peacefully* is the emotional promise and the word
we own: quiet tooling, educational messages, no noise. Everyone in this
ecosystem sells speed; nobody sells peace.

The thread metaphor carries the values too: maintenance, debt, and
bottlenecks are **snags in the weave**. Interlace removes snags.

## 2. The line

**One thread, every scale.**

Interlace means weaving. The entire visual identity is one gesture — a
strand being drawn — expressed at four scales:

| Scale | Element | The thread as… |
| --- | --- | --- |
| micro | `DecodeText` | text resolving |
| component | `InterlaceWeave` | a boundary being drawn |
| section | `HeroStrand` *(planned)* | a journey through the page |
| page | `TimelineMap` | data laid flat in lanes |

Nothing else animates. The motion vocabulary is exactly **two verbs**:

- **draw** — `stroke-dashoffset` strand reveals
- **decode** — glyph-noise resolving into text

Both cap at **600ms**, both go silent under `prefers-reduced-motion`, and
both are SSR-honest: static markup always carries the final state, so
crawlers, reader mode, and JS-off visitors never see a half-drawn brand.

## 3. Palette law — depth, not breadth

One hue: the mark's burnt orange (oklch hue 41 — `#7d350c` light /
`#fbb99a` dark, AAA both modes). Taking the brand "to the next level"
never means adding hues; it means going deeper into this one.

**The strand pair** (`--interlace-strand-a` / `--interlace-strand-b` in
`packages/ui/styles/interlace-theme.css`):

- `strand-a` — the mark's hue 41, the thread itself.
- `strand-b` — the temperature complement, a cool steel blue (hue 230).
  It exists so the crossing is legible: warm passing cool.
- `strand-b` appears **only** inside woven gestures, and woven gestures
  use **only** the strand pair. It is not a chart color, not an accent,
  not available for decoration.
- The pair replaced `chart-2` (emerald, hue 162) in the weave — that was
  the *success* status hue used decoratively, which COLOR philosophy
  forbids. Status colors carry status, nothing else.

**Chrome is a gallery.** Surfaces stay warm-achromatic (paper white /
near-black, warm-tinted neutrals). Brand color appears only where meaning
crosses: primary CTAs, active states, woven gestures. Color budget per
view: one accent + one counter-strand. If a screen needs a third color to
work, the layout is wrong, not the palette.

**Type carries the scale contrast.** Monospace micro-labels (DecodeText's
native habitat) against oversized grotesk display; numbered eyebrows
(`01 — Detection`) for series and sections.

## 4. Inspired, never a mix

References contribute **structural laws**, never signature looks. Each law
is refracted through the thread metaphor before it ships:

| Reference | Law we keep | Signature we reject |
| --- | --- | --- |
| Lusion | one gesture, every scale | WebGL cinematics, their ribbon |
| Raycast | one accent, type-forward restraint | glassy dark glow, pill nav |
| In Pieces | constraint generates the world; craft-as-story | shards, pastel fields, grunge type |
| Cuberto | chrome as gallery; numbered indices | gooey cursor, marquee, cool grays |

**The ownership gate** — every new visual element must pass all four
before it ships:

1. It expresses the thread in one of our two verbs (draw / decode).
2. It uses only our palette (hue 41 + strand-b + warm neutrals).
3. It descends from at most **one** reference law. Needs two references
   to explain → it's a mix → cut it.
4. A screenshot of it alone reads as Interlace — never as the site that
   inspired it.

What makes the brand its own thing is anchored where no reference can
follow: the thread **is our name** made visible; burnt orange on warm
paper is unoccupied territory in the linter ecosystem; terminal-decode is
native to a lint brand; and the receipts (SSR-honest, AAA both modes,
pure SVG/CSS — no WebGL) are themselves brand material.

## 5. Enforcement

- **Scope.** The doctrine governs the website(s) and the DS — there the
  mandate is to be creative within the gate. Article **cover images are
  exempt**: they stay as they are, by decision (cheap to maintain wins —
  maintenance is the enemy of innovation, including our own).
- **DS-first.** Every brand element is built in `packages/ui` at full
  quality (R1–R26, locked tests, reduced-motion, SSR-honesty), then
  downloaded by apps. App-local authoring needs a written reason.
- **Tokens only.** No raw color in component source; the strand pair
  lives in `interlace-theme.css` and nowhere else.
- **Locks.** The weave's test asserts `stroke-strand-a`/`-b` and rejects
  `chart-2`; the map's test asserts `text-strand-a`. New brand elements
  add equivalent locks in the same PR.
- **Forbidden:** new decorative hues; status colors as decoration; motion
  verbs beyond draw/decode; animation above 600ms; brand gestures that
  skip the reduced-motion bail; copy that states a motto as a measurement.
