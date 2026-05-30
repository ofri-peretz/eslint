# Interlace Design Principles

> The look-and-feel charter. Sits **above** the per-domain philosophies
> (TYPOGRAPHY/LAYOUT/COLOR/MOTION/A11Y/CTA/KEYBOARD/…) and governs how
> Interlace presents itself on every surface — docs, registry, storybook,
> blog, landing, future apps. **Read this when designing anything new, before
> you reach for a token.**
>
> Why this doc exists: the Interlace design system is **brand-distribution
> infrastructure** ([[interlace_design_system_vision]]) — one DS, many
> surfaces — and infrastructure earns trust by being *coherent*, not by being
> loud. These thirteen principles are how the coherence is enforced.

## At a glance

| # | Principle | One-liner |
|---|---|---|
| 1 | Calm, confident, technical voice | Informative over promotional. The product IS the proof. |
| 2 | Reading-first typography | Inter, ≤75ch, hierarchy via size only. |
| 3 | Violet brand, restrained palette | One accent, neutral surfaces, AA in light + dark. |
| 4 | Token-only, no raw values | Every value comes from `--*`; raw hex banned in primitives. |
| 5 | Generous whitespace, fixed rhythm | Six-step spacing, four container widths. |
| 6 | Flat surfaces, borders > shadows | Hierarchy from spacing + borders, not shadow stacks. |
| 7 | Subtle, purposeful motion | ≤200ms, reduced-motion respected by default, CLS=0. |
| 8 | Outlined iconography | lucide-react, 1.5px stroke, semantic — never decorative. |
| 9 | Explicit focus + AA contrast | Visible focus ring; 4.5:1 body / 3:1 large; zero axe suppressions. |
| 10 | Keyboard-equivalent everywhere | Every interaction Tab/Enter/Space/Esc-reachable. |
| 11 | Server-first performance | RSC by default; LCP<2.5s, INP<200ms, CLS=0. |
| 12 | Provenance-first trust | Every claim links to its source. Receipts beat assertions. |
| 13 | One system, many surfaces | Same primitives, tokens, conventions everywhere. Divergence is a bug. |
| 14 | Compatibility + min-viewport contract | Every primitive declares its minimum viable viewport; below it, the primitive warns (dev) or degrades (prod). Modern-baseline browsers; documented fallbacks for the rest. |

---

## 1. Calm, confident, technical voice

Interlace reads like a senior engineer documenting their work, not a startup
selling itself. **Informative over promotional.** Precise nouns ("the rule
catches X"); no hype ("industry-leading"); no salesy CTAs that beg ("Star us
on GitHub! 🚀"). When a CTA is warranted, the live number is the nudge
("⭐ 1.2k · Star on GitHub") — proof before ask. The headlines, code
samples, and microcopy all match this voice. See `CODE_EXAMPLE_PHILOSOPHY`
("bad-vs-good `<DontDo>` diff" format) and the CTA pattern in
`SCORECARD_STATS_VISION`.

## 2. Reading-first typography

Inter (variable) for prose + UI; JetBrains Mono (variable) for code. Body
size is **fixed** at 16px (17px long-form); only the **display end** fluids
(`clamp(2.5rem, 4vw + 1rem, 3.5rem)` for h1). Line-height 1.6–1.7, measure
**≤75ch on every body container** (non-negotiable). Hierarchy compresses,
never expands — **one variable, size**, six levels max. Weight ladder
400/500/600/700; **no 900, ever**. The reading-vs-UI distinction is encoded
in the `Typography` variant (`body`/`long` vs `ui`/`ui-sm`) and the
`.prose-*`/`.ui-text-*` classes. Full contract: `TYPOGRAPHY_PHILOSOPHY.md`.

## 3. Violet brand, restrained palette

**One accent.** Violet-700 on light (#6d28d9, AAA on white), violet-400 on
dark (#a78bfa, AAA on near-black). Surfaces are neutral (violet-*tinted*
neutrals — not loud purple) so the accent earns attention when it appears.
Status colors (success, warning, destructive) are pigments, not narrative —
reach for them when communicating state, not for decoration. Brand is *one
high-signal element at a time* (the primary action, the focus ring, the
selected card) — never a chromatic flood. Full contract:
`COLOR_PHILOSOPHY.md` + `interlace-theme.css`.

## 4. Token-only — no raw values

Every color / spacing / radius / type / shadow value in source resolves to a
token (`--text-h1`, `--spacing-md`, `--color-primary`, `--radius-md`). **Raw
hex / oklch / rgba are banned** in source (R19). **Arbitrary pixel classes**
(`rounded-[12px]`, `px-[18px]`) are banned when a token exists. The 3-layer
token cascade is `--interlace-*` (brand primitives) → shadcn-bare semantic
(`--primary`, `--foreground`) → `@theme inline --color-*` (Tailwind utility).
A brand fork swaps the primitive layer; the rest doesn't move. See
`packages/ui/styles/foundation.css` + `interlace-theme.css`.

## 5. Generous whitespace, fixed rhythm

Spacing comes from a **six-step scale**: 8 / 16 / 24 / 40 / 64 / 96 px
(`--spacing-xs`…`-2xl`). Container widths come from **four sizes**:
`prose` 65ch · `content` 1024px · `wide` 1280px · `full`. Open-coding
`container mx-auto px-4` or `max-w-3xl` is forbidden — reach for
`<Container>` / `<Section>`. Mobile-first density: base classes describe the
smallest viewport; breakpoints *add* breathing room, never take it away
(`lg:hidden md:flex` is a smell). Full contract: `LAYOUT_PHILOSOPHY.md`.

## 6. Flat surfaces, borders > shadows

Visual hierarchy reads from **whitespace + borders + tone**, not from
shadow-stack skeuomorphism. Cards have a subtle 1px token border + a small
shadow (raised but not floating). Dark mode shadows convert to *glow* (color
change, not opacity) so they read on near-black. We do not chase the
heavily-shadowed iOS-style depth — Interlace is a software-engineer-grade
DS, not a marketing toy.

## 7. Subtle, purposeful motion

Animations are **≤200ms ease-out** for state changes; CLS=0 from layout
(reserve `min-h-*` / `aspect-[w/h]` before async content). Motion
**communicates** (a card opening, a value ticking up) — it never decorates.
`prefers-reduced-motion: reduce` is respected by default (the keyframes
degrade to fade-only). No infinite "wow" loops. Full contract:
`MOTION_PHILOSOPHY.md`.

## 8. Outlined iconography

**lucide-react** (1.5px stroke, outlined) is the only icon set. Three sizes
mapped to the type scale: `size-4` (16px) inline with body, `size-5` (20px)
with `ui` text, `size-6` (24px) in headings. Icons are **semantic** —
always paired with text or `aria-label`. Icon-only buttons without context
are forbidden. A custom illustration is a deliberate choice (a system
diagram, a chart) — never stock or decorative.

## 9. Explicit focus + AA contrast

Every interactive element has a **visible focus ring**: 2px solid
`--ring`, 2px offset, ≥3:1 contrast against the adjacent color (WCAG 2.2 SC
2.4.13). Body text clears **4.5:1**; large text + UI clears **3:1** — in
both light and dark. **Zero axe suppressions, ever.** When a check fails, we
fix the token, not the rule. Long-form text aims at AAA (7:1) where
possible. Full contract: `A11Y_PHILOSOPHY.md` + R20 / R26.

## 10. Keyboard-equivalent everywhere

Every interaction must be reachable with **Tab** and operable with
**Enter / Space / Arrows / Esc**, with the keyboard journey documented per
component (a keyboard table in the Storybook page). Behavior comes from
**Base UI** (or another headless primitive) — never hand-rolled
focus-trapping or roving-tabindex. Full contract: `KEYBOARD_PHILOSOPHY.md`.

## 11. Server-first performance

Components are **server components by default**; `'use client'` only when
interactivity / state / a client-only library makes it necessary (R25). The
layout primitives — `Typography`, `Stack`, `Grid`, `Box`, `Section`,
`SectionHeader` — are zero-hook RSC-safe so they can sit in any server tree
without forcing a client boundary. Core Web Vitals are budgets, not
aspirations: **LCP < 2.5s, INP < 200ms, CLS = 0** — measured (PostHog +
Vercel Analytics), not promised. Full contract: `INTEROP_PHILOSOPHY.md`.

## 12. Provenance-first trust

Every number, claim, and statistic on a public surface **links to its
source**. The Scorecard's `source ↗` per card, the eslint `/stats` plugin
catalog's per-row docs link, the npm/GitHub homepage tokens, the dated
benchmark JSONs — the audit trail *is* the credibility. Receipts beat
assertions. Borrowed from the [[impact_vision]] ledger principle; codified
for every surface in `SCORECARD_STATS_VISION.md`.

## 13. One system, many surfaces

The DS is *infrastructure*, not a per-app palette. Same primitives, same
tokens, same conventions — docs, registry, storybook, blog, landing,
future apps. Divergence between two surfaces is a **bug** in the DS, not a
feature of one app. If a primitive only works for one consumer, the
primitive is wrong. The brand-fork seam is the `--interlace-*` primitive
layer; everything above stays put. See [[interlace_design_system_vision]]
+ `INTEROP_PHILOSOPHY.md`.

---

## How to apply

+ **Before building a new primitive**, check this list. If a principle isn't
  obeyed, the primitive isn't ready.
+ **Before reviewing a PR**, check this list. If a principle is violated,
  cite the principle number in review.
+ **Before forking a brand**, edit *only* the `--interlace-*` primitive
  layer; the shadcn-bare + `@theme inline` layers stay put. The principles
  are brand-invariant; the values are not.

## Out of scope (what these principles do NOT cover)

+ Per-domain mechanics — those live in the `*_PHILOSOPHY.md` siblings.
+ Engineering rules for component shape — those are R1–R26 (`interlace-component`).
+ Per-product copy / brand voice for marketing — these principles cover the
  product surface, not campaign copy.

## See also

The per-domain philosophies these principles cite, in order of how often
they're referenced:

`TYPOGRAPHY_PHILOSOPHY.md` · `LAYOUT_PHILOSOPHY.md` · `COLOR_PHILOSOPHY.md` ·
`MOTION_PHILOSOPHY.md` · `A11Y_PHILOSOPHY.md` · `KEYBOARD_PHILOSOPHY.md` ·
`CTA_PHILOSOPHY.md` · `INTEROP_PHILOSOPHY.md` · `CODE_EXAMPLE_PHILOSOPHY.md` ·
`SCORECARD_STATS_VISION.md`
