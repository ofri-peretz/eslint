# Layout & Responsiveness Philosophy

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md),
expanding Principle #1 ("Adoption is friction subtraction"), #6
("Ease of use is performance"), #8 ("Open the side door"), and #11
("Build with the ecosystem"). Layout is the part of the UI that, when
inconsistent, hurts all four at once: it slows contributors (every
new page re-invents `container mx-auto px-4`), regresses Core Web
Vitals (uncontrolled section padding shifts content), and tells
side-door visitors that the site is glued together rather than
designed.

This document binds layout decisions. It exists because the homepage
already shows the failure mode: nine sections, nine open-coded
container wrappers, four different inner widths, three different
section paddings, and zero responsive horizontal-padding scale. That
isn't a styling problem to fix once — it's a missing system. This is
the system.

---

## The core rule

> **Layout is a system. Pages compose `<Section>` and `<Container>`
> primitives; they never open-code wrappers. Spacing, container width,
> and breakpoints come from a fixed token table — never from a
> per-page guess. The CLS budget from layout is zero.**

Layout is system work because every per-page choice is a future
divergence. The first time `py-12` appears next to `py-20` it looks
arbitrary. The tenth time, it *is* arbitrary. The job of this
document is to make sure the eleventh time never happens.

Three tests, in order:

1. **Could a new contributor reproduce this layout from primitives
   alone?** If the page has more than `<Section>` / `<Container>` /
   `<SectionHeader>` / content, ask why.
2. **Does the spacing map to a token?** Check the Spacing scale below.
   If a class doesn't appear there, it's a smell.
3. **Does this preserve layout?** Decorative chrome must be
   `absolute`. Async content must reserve space. CLS attributable to
   layout choices stays at 0 — same contract as
   [MOTION_PHILOSOPHY.md](./MOTION_PHILOSOPHY.md).

---

## The 10 principles

Ordered by leverage. Earlier principles, when violated, do the most
damage.

### 1. Layout is a system, not a per-page decision

Every page is `<Section>` × N. The page file describes what's *in*
each section, never what each section's wrapper looks like. Repeating
`<div className="container mx-auto px-4 py-24">` across nine sections
is the same anti-pattern as copy-pasting a button instead of
importing one — and just as load-bearing.

When you find yourself writing `container mx-auto px-*` in a page,
stop. Use `<Section>`.

### 2. Container width is a contract

Four sizes only:

| Container | max-width | Use |
| --- | --- | --- |
| `prose` | `65ch` | Long-form text (rule docs, articles) |
| `content` | `1024px` | Default for landing sections |
| `wide` | `1280px` | Card-grid heavy sections |
| `full` | none | Full-bleed hero, decorative bands |

Mixing `max-w-3xl` / `max-w-4xl` / `max-w-5xl` / `max-w-6xl` ad-hoc
is forbidden. A reader arriving at `/` and a reader arriving at a
rule page via Google → both should see the same content geometry. If
the H1 lands at a different X-position depending on entry point, you
broke the side-door contract from UX #8.

### 3. Spacing is a token, not a guess

A six-step scale. Every margin, padding, and gap maps to one.

| Token | px | Tailwind classes | Use |
| --- | --- | --- | --- |
| `xs` | 8 | `gap-2 / p-2` | Inline chip / badge padding |
| `sm` | 16 | `gap-4 / p-4` | Card internal padding, mobile page padding |
| `md` | 24 | `gap-6 / p-6` | Card-grid gaps, section-header → grid |
| `lg` | 40 | `gap-10 / py-10` | Mobile section vertical padding |
| `xl` | 64 | `gap-16 / py-16` | Desktop section vertical padding |
| `2xl` | 96 | `gap-24 / py-24` | Hero / final CTA breathing room |

`mb-12` next to `mb-14` next to `mb-16` is a smell. Pick `xl` (`mb-16`)
and stay there. New tokens get added to this table, not invented per
component.

### 4. Mobile-first, progressive enhancement

Base classes describe the smallest viewport. Breakpoints only *add*
density and breathing room — they never take it away. Tailwind
defaults govern:

| Breakpoint | Width | What changes here |
| --- | --- | --- |
| (base) | 0–639 | Single column, smallest typography, page padding `px-4` |
| `sm:` | ≥ 640 | Page padding `px-6`, side-by-side chips |
| `md:` | ≥ 768 | Multi-column grids start, headlines scale up |
| `lg:` | ≥ 1024 | Page padding `px-8`, section padding `py-24` |
| `xl:` | ≥ 1280 | `wide` containers reach max width |
| `2xl:` | ≥ 1536 | No new behavior; rare overrides only |

Patterns like `lg:hidden md:flex` (hide on desktop, show on mobile)
are a smell. The mobile layout is the base; `md:` and up extend it.

### 5. Density scales with breakpoint

Mobile gets the tightest geometry. Desktop earns breathing room.
Three load-bearing patterns:

- **Horizontal page padding**: `px-4 sm:px-6 lg:px-8`
- **Section vertical padding**: `py-16 md:py-20 lg:py-24` (the
  `<Section spacing="comfortable">` default)
- **Card grid gap**: `gap-4 md:gap-6 lg:gap-8`

A page that uses `px-4` at every breakpoint is shipping mobile padding
to a 1440px monitor. That's the most common regression in this
codebase today and the most visible to side-door visitors.

**Section spacing variants (the floor rule):** the three named
variants on `<Section spacing>` exist so callers don't pick `py-*`
classes by hand — but every variant **must clear the §3 desktop
floor** (`py-16` = `xl` token) by the `md:` breakpoint. Anything
smaller renders as a "padless band" — the exact regression the
stats-bar shipped in 2026-05 (`py-10 md:py-12 lg:py-14`, max 56px
at desktop). The current variants:

| Variant | Classes | When |
| --- | --- | --- |
| `tight` | `py-12 md:py-16 lg:py-20` | Stat bars, divider stripes, short interstitials |
| `comfortable` | `py-16 md:py-20 lg:py-24` | Default for content sections |
| `spacious` | `py-20 md:py-24 lg:py-32` | Hero adjacents, final CTAs |

Locked by [layout-primitives-lock.test.tsx](apps/docs/src/__tests__/layout-primitives-lock.test.tsx).

### 6. Reserve space; never let content jump

A direct extension of MOTION's CLS=0 contract into the static-layout
domain. Layout-CLS comes from three sources, all preventable:

- **Async content with no reserved height.** OG-card embeds, tweet
  embeds, stats counters — every async slot needs `min-h-*`
  matching its final height. The `<TweetCard>` and `<DevToCard>`
  blocks on `/` should each have a min-height; flexbox alone is not
  enough.
- **Images without aspect ratio.** Always `aspect-[w/h]` or explicit
  `width` + `height`. Fumadocs `<ImageZoom>` already enforces this;
  inline `<img>` does not.
- **Skeletons that don't match destination geometry.** Cross-link:
  see [LOADING_PHILOSOPHY.md](./LOADING_PHILOSOPHY.md) §"Dimensions
  match the destination exactly." Layout owes the same contract.

### 7. Sections compose; pages don't

A `<Section>` owns:

- Vertical padding (via `spacing` prop)
- Optional top/bottom dividers (via `divider` prop)
- Background tone (via `tone` prop)
- The inner `<Container>` it wraps content in (via `container` prop,
  default `content`)

A page owns:

- Which sections exist, in what order
- The content *inside* each section

A page does **not** own `container mx-auto px-4`, `border-y`,
`bg-fd-card/50`, or any other wrapper concern. If you find these in
a page file, that's a `<Section>` prop in disguise.

### 8. Border is a separator; background is a section

Section transitions are expressed semantically:

- `<Section divider="top|bottom|both">` — owns the border
- `<Section tone="default|muted|inset">` — owns the background

Inline `border-y border-fd-border bg-fd-card/50` is forbidden in page
files. The current homepage has `bg-fd-card/50` and `bg-fd-card/30`
on adjacent sections with no semantic difference between them; that's
exactly the drift `tone` exists to prevent.

Borders only appear at section *transitions*, never inside content.

### 9. Decorative chrome is positioned, never displacing

Gradient blobs, `<BorderBeam>`, decorative SVGs, glow rings — all of
them are `absolute` (or `fixed`) and never affect document flow. The
parent is `relative overflow-hidden`. Decorative chrome that nudges
content even by a pixel is a layout-CLS source.

This is the connective tissue between this doc and MOTION's CLS=0
rule. Decoration that displaces is decoration that regresses Core
Web Vitals.

### 10. Build with the ecosystem

Fumadocs ships `HomeLayout` (used at [apps/docs/src/app/(home)/layout.tsx](apps/docs/src/app/(home)/layout.tsx))
and `DocsLayout` for the outer chrome — sidebar, search, navbar,
TOC. Our primitives compose *inside* those layouts; they never
replace them.

Order, mirroring UX #11:

1. **Leverage** — fumadocs ships the outer shell. Use it.
2. **Inspire** — Tailwind ships the spacing scale. Map our tokens onto
   its defaults; don't invent custom `spacing` config without reason.
3. **Reinvent** — `<Section>`, `<Container>`, `<SectionHeader>`,
   `<Stack>` are *not* in fumadocs and *not* in Tailwind primitives.
   That's the gap our layout primitives fill, and the only one.

---

## Allowed primitives

The toolchain. Adding a new layout primitive is a philosophy edit, not
an `import`.

| Primitive | File | Purpose |
| --- | --- | --- |
| `<Container>` | `packages/ui/src/primitives/container.tsx` | Width contract from §2. Props: `size`, `as`, `className`. |
| `<Section>` | `packages/ui/src/primitives/section.tsx` | Vertical rhythm + tone + dividers + container. Props: `spacing`, `tone`, `divider`, `container`, `as`. |
| `<SectionHeader>` | `packages/ui/src/blocks/section-header.tsx` | The repeated `text-center mb-12` + h2 + tagline pattern. Props: `eyebrow`, `title`, `tagline`, `align`. |
| `<Stack>` / `<Cluster>` | `packages/ui/src/primitives/stack.tsx` | Vertical (`Stack`) and horizontal-wrapping (`Cluster`) gap rhythm. Props: `gap`, `direction?`, `align?`, `wrap?`. |

**Forbidden** (do not add): grid-system frameworks (no Bootstrap-grid,
no react-grid-layout), CSS-in-JS layout libraries, anything that
introduces a runtime layout cost. Tailwind + the four primitives above
are the entire layout API.

---

## Forbidden

The hard bans. Not "discouraged" — forbidden, enforced in review.

- **Open-coding `container mx-auto px-*` in a page file.** Use
  `<Section>`.
- **Container widths outside the four sizes.** No `max-w-3xl`,
  `max-w-5xl`, `max-w-6xl` in app code. Pick `prose` / `content` /
  `wide` / `full` via `<Container size>`.
- **Horizontal padding without a responsive scale.** `px-4` with no
  `sm:` / `lg:` is a regression. Page padding is `px-4 sm:px-6 lg:px-8`.
- **Per-section `mb-12` vs `mb-14` vs `mb-16`.** Use a spacing token.
- **Inline `style={{ width, padding, margin }}` on JSX.** Already in
  the project's no-inline-styles rule.
- **Inline `border-y border-fd-border` on sections.** Let
  `<Section divider>` own it.
- **Section backgrounds via `bg-fd-card/50` etc. in page files.** Let
  `<Section tone>` own it.
- **Decoration that affects layout.** Gradient blobs, beams, glows —
  always `absolute`, never `relative` or `block`.

---

## Implementation patterns

### Section wrapper

**Wrong** (current homepage, repeated nine times):

```tsx
<section className="border-y border-fd-border bg-fd-card/50 backdrop-blur-sm">
  <div className="container mx-auto px-4 py-12">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
      {/* ... */}
    </div>
  </div>
</section>
```

Five concerns interleaved: divider, tone, container, padding, content
grid. Repeated nine times across the page.

**Right:**

```tsx
<Section divider="both" tone="muted" spacing="comfortable" container="content">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
    {/* ... */}
  </div>
</Section>
```

The page file describes intent (`divider="both" tone="muted"`); the
primitive owns the geometry.

### Section header

**Wrong** (current homepage, repeated six times):

```tsx
<div className="text-center mb-12">
  <h2 className="text-3xl md:text-4xl font-bold mb-4">See it in action</h2>
  <p className="text-fd-muted-foreground max-w-xl mx-auto">
    Clean configuration, powerful protection.
  </p>
</div>
```

Spacing (`mb-12`, `mb-4`), alignment, prose width (`max-w-xl`), and
typography all inlined per-instance.

**Right:**

```tsx
<SectionHeader
  title="See it in action"
  tagline="Clean configuration, powerful protection."
/>
```

### Responsive horizontal padding

**Wrong:**

```tsx
<div className="container mx-auto px-4">
```

Locks mobile padding at every breakpoint.

**Right** (handled by `<Container>` internally):

```tsx
<Container size="content"> {/* px-4 sm:px-6 lg:px-8 mx-auto max-w-[1024px] */}
```

### Decorative chrome

**Wrong:**

```tsx
<div className="bg-linear-to-br from-purple-500/20 ... p-12 md:p-16">
  <div className="w-64 h-64 bg-linear-to-br from-purple-400/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
  <div className="relative">{/* content */}</div>
</div>
```

The blob is a sibling of content but not `absolute` — it depends on
parent `relative` to coexist. Easy to break by editing the parent.

**Right:**

```tsx
<div className="relative overflow-hidden">
  <div aria-hidden className="absolute top-0 left-0 w-64 h-64 bg-linear-to-br from-purple-400/30 to-transparent rounded-full blur-3xl pointer-events-none" />
  <div className="relative">{/* content */}</div>
</div>
```

Decoration is `absolute`, marked `aria-hidden`, marked
`pointer-events-none`. Cannot displace content under any
circumstance.

---

## How this gets used

When designing or reviewing a layout, ask:

1. **#1 System** — does the page open-code any wrapper, or compose
   only `<Section>` / `<Container>` / `<SectionHeader>`?
2. **#2 Container** — does every content width snap to one of
   `prose` / `content` / `wide` / `full`?
3. **#3 Spacing** — does every margin / padding / gap appear in the
   spacing-token table? If not, why?
4. **#4 Mobile-first** — do base classes describe the smallest
   viewport, with `sm:` / `md:` / `lg:` only adding density?
5. **#5 Density** — does horizontal padding scale `px-4 → sm:px-6 →
   lg:px-8`? Section padding `py-16 → md:py-20 → lg:py-24`?
6. **#6 Reserve** — does every async slot reserve its final height?
   Do images carry aspect-ratio?
7. **#7 Compose** — is every `border-y` / `bg-fd-card/*` expressed as
   a `<Section>` prop, not inlined?
8. **#8 Semantic chrome** — are dividers (`divider`) and tone (`tone`)
   props instead of inline classes?
9. **#9 Decoration** — is every gradient blob / beam / glow
   `absolute`, `aria-hidden`, `pointer-events-none`?
10. **#10 Ecosystem** — does this reach for fumadocs / Tailwind /
    Base UI before reinventing?

If any answer is no, the layout is not yet shippable.

---

## Living document

This philosophy is the source of truth for layout. When a layout need
arises that this doc didn't anticipate — a new container size, a new
section variant, a breakpoint behavior the table doesn't cover —
**edit this document first**, then ship the layout. Drift between
principle and practice is the failure mode, and the homepage is the
evidence of what that drift looks like at scale.

The companion artifact [apps/docs/HOMEPAGE_LAYOUT_AUDIT.md](./apps/docs/HOMEPAGE_LAYOUT_AUDIT.md)
documents the current homepage's specific deviations from this
philosophy. It is a snapshot in time, not a doctrinal document. When
a refactor lands, that audit is closed; this philosophy stays.
