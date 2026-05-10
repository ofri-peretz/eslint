# Homepage Layout Audit

**Date:** 2026-05-10
**Page:** `/` — [apps/docs/src/app/(home)/page.tsx](src/app/(home)/page.tsx)
**Status:** Open
**Audits against:** [LAYOUT_PHILOSOPHY.md](../../LAYOUT_PHILOSOPHY.md)
**Companion to:** [LAYOUT_AUDIT_REPORT.md](./LAYOUT_AUDIT_REPORT.md) (historical, docs-page-focused, resolved)

---

## Executive summary

The homepage works visually, but it is built without a layout system.
Nine `<section>` blocks each open-code their own wrapper, padding,
container width, and dividers. The result is the exact drift
[LAYOUT_PHILOSOPHY.md](../../LAYOUT_PHILOSOPHY.md) was written to
prevent: arbitrary-looking spacing rhythm, inconsistent inner widths,
zero responsive horizontal-padding scale, and six near-identical
"section header" blocks copy-pasted by hand.

This audit is closeable in one PR once the four primitives mandated
by the philosophy land in `@interlace/ui`:
`<Container>` / `<Section>` / `<SectionHeader>` / `<Stack>`.
Until then, the homepage is the canonical example of *what the
philosophy exists to prevent*.

The hero (`<HeroSection>` at [src/components/home/hero-section.tsx](src/components/home/hero-section.tsx))
is **out of scope** — it composes `@interlace/ui/patterns/hero-cosmic`
which is full-bleed by design and not subject to container rules
(Layout principle #2 `full`).

---

## Findings

| # | Principle | Location | Current | Fix |
| - | --------- | -------- | ------- | --- |
| 1 | #1, #7 | 9 sections (lines 44, 56, 106, 150, 213, 283, 330) | Each open-codes `container mx-auto px-4` + section wrapper | Replace each with `<Section>` |
| 2 | #2 | line 46 (`max-w-4xl`), 66 (`max-w-4xl`), 116 (`max-w-6xl`), 165 (`max-w-6xl`), 223 (`max-w-5xl`), 294 (`max-w-5xl`) | Four different container widths in one page | Pick `<Container size="content\|wide">` per section |
| 3 | #2 | line 61, 110, 160, 289 (`max-w-xl`), 218 (`max-w-2xl`) | Tagline widths drift `xl` ↔ `2xl` with no semantic reason | `<SectionHeader tagline>` owns one default width |
| 4 | #3 | line 45 (`py-12`), 106 (`py-20`), 150 (`py-20`), 56/213/284/330 (`py-24`) | Three vertical paddings, no rule for which to use | One `<Section spacing>` value per section, drawn from the token table |
| 5 | #3 | line 57 (`mb-12`), 108 (`mb-12`), 152 (`mb-12`), 214 (`mb-16`), 285 (`mb-16`) | `mb-12` and `mb-16` interleaved between section headers | `<SectionHeader>` owns the bottom-margin token |
| 6 | #3 | line 116 (`gap-6`), 165 (`gap-6`), 223 (`gap-8`), 46 (`gap-8`) | Card-grid gaps drift `6` ↔ `8` with no rhythm | `gap-4 md:gap-6 lg:gap-8` (token `sm → md → md`), uniformly |
| 7 | #5 | every section uses `px-4` with no `sm:` / `lg:` | Mobile padding shipped to all viewports | `px-4 sm:px-6 lg:px-8`, owned by `<Container>` |
| 8 | #6 | line 167–168 (TweetCard), 172–173 (DevToCard) | Async slots inside `flex justify-center h-full` with no `min-h-*` reservation | Each card slot needs `min-h-[420px]` (or matching skeleton) — see [LOADING_PHILOSOPHY.md](../../LOADING_PHILOSOPHY.md) |
| 9 | #8 | line 44 (`bg-fd-card/50`), 106 (`bg-fd-background/50`), 283 (`bg-fd-card/30`) | Three different section tones, no semantic difference | `<Section tone="muted\|inset">` — two values, picked deliberately |
| 10 | #8 | line 44 (`border-y`), 106 (`border-y`), 150 (`border-t`), 283 (`border-t`) | Dividers expressed inline, mix of `border-t` / `border-y` | `<Section divider="top\|bottom\|both">` |
| 11 | #1 | 6 section-header blocks at lines 57–64, 108–114, 152–163, 214–221, 285–292, plus the final CTA's 337–342 | "text-center mb-12 + h2 + tagline" pattern duplicated 6× | One `<SectionHeader>` import |
| 12 | #3 | line 331 (`p-12 md:p-16`) | Final-CTA inner padding open-coded outside the spacing scale | `<Section spacing="spacious">` or `<Stack gap="2xl">` |
| 13 | #9 | line 333–334 (decorative blobs in final CTA) | Blobs are correctly `absolute` inside an `overflow-hidden` wrapper, but lack `aria-hidden` and `pointer-events-none` | Add both attributes; chrome should be invisible to AT and not steal the cursor |
| 14 | #9 | line 67 (`<BorderBeam>` host) + line 333–334 (gradient blobs) | Decorative motion + gradient overlays are unmarked semantically | All decorative chrome should ship `aria-hidden` + `pointer-events-none` as a project-wide convention; promote to a lint rule under `eslint-plugin-react-a11y` once the convention is documented |

---

## What the page should look like after the refactor

A 40-line preview, assuming `<Section>` / `<Container>` /
`<SectionHeader>` / `<Stack>` exist in `@interlace/ui`:

```tsx
export default async function HomePage() {
  const stats = await getDisplayStats();
  return (
    <div className="relative min-h-screen">
      <HeroSection />

      <Section divider="both" tone="muted" spacing="comfortable">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          <StatCard value={stats.plugins} label="Plugins" />
          <StatCard value={stats.rules} label="Rules" suffix="+" />
          <StatCard value={stats.securityPlugins} label="Security" />
          <StatCard value={stats.qualityPlugins} label="Quality" />
        </div>
      </Section>

      <Section spacing="spacious">
        <SectionHeader
          title="See it in action"
          tagline="Clean configuration, powerful protection. Works with any ESLint 9+ project."
        />
        <CodePreviewCard />
      </Section>

      <Section divider="both" tone="inset" spacing="spacious" container="wide">
        <SectionHeader title="What it catches" tagline="Real vulnerabilities in real code." />
        <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <CatchCard {...sqli} />
          <CatchCard {...jwt} />
          <CatchCard {...xss} />
        </div>
        <CWELink />
      </Section>

      <Section divider="top" spacing="spacious" container="wide">
        <SectionHeader eyebrow={<TrophyBadge />} title="Trusted by developers" tagline="…" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
          <TweetCard id="…" /* min-h reserved internally */ />
          <DevToCard path="…" />
          <TestimonialCard />
        </div>
      </Section>

      <Section spacing="spacious">
        <SectionHeader title="Two Pillars of Excellence" tagline="…" />
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          <PillarCard tone="security" />
          <PillarCard tone="quality" />
        </div>
      </Section>

      <Section divider="top" tone="muted" spacing="spacious">
        <SectionHeader title="Why ESLint Interlace?" tagline="…" />
        <Cards>{/* feature cards */}</Cards>
      </Section>

      <Section spacing="spacious">
        <FinalCtaCard /> {/* owns its own decorative blobs, internal padding via Stack */}
      </Section>
    </div>
  );
}
```

The page file shrinks from 415 lines to roughly 80. Every wrapper
concern moved into a primitive. Spacing, container width, and tone
became *intent* rather than *coordinates*.

---

## Out of scope for this audit

- **Color tokens.** Orange / purple / violet usage on the page is
  consistent with the brand chrome; that's a separate document.
- **Motion.** Hover transforms, gradient animation on the hero, and
  `<BorderBeam>` are governed by [MOTION_PHILOSOPHY.md](../../MOTION_PHILOSOPHY.md).
- **Copy / IA.** The headlines, taglines, and CTA wording are
  product decisions, not layout.
- **Hero internals.** `<HeroCosmic>` is a full-bleed pattern; its
  internal layout lives in `@interlace/ui/patterns/hero-cosmic.tsx`
  and is governed there.
- **A11y beyond layout-induced CLS.** The historical
  [LAYOUT_AUDIT_REPORT.md](./LAYOUT_AUDIT_REPORT.md) and the
  separate `apps/docs/A11Y.md` track that work.

---

## Closing this audit

This file is closed when:

1. The four primitives ship (`<Container>`, `<Section>`,
   `<SectionHeader>`, `<Stack>`) under `packages/ui/src/`.
2. [src/app/(home)/page.tsx](src/app/(home)/page.tsx) is refactored
   to compose them — no `container mx-auto px-*` strings remain in
   the file.
3. Lighthouse CLS on `/` is 0 at viewport widths 375 / 768 / 1024 /
   1280 / 1536.
4. `grep -nE 'max-w-(3xl|5xl|6xl)' src/app/\(home\)/page.tsx` returns
   no matches.

When all four are true, replace this file's body with a one-line
"Resolved YYYY-MM-DD — see commit `<sha>`" record (mirroring the
pattern at the top of [LAYOUT_AUDIT_REPORT.md](./LAYOUT_AUDIT_REPORT.md)).
