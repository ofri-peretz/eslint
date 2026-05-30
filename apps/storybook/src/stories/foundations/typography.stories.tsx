'use client';

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid, GridItem } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';

import { withDark } from '@/decorators';

/**
 * Typography — type-scale specimen.
 *
 * Renders every variant the `Typography` primitive ships (h1–h6, body, long,
 * ui, ui-sm, caption, code) as a row:
 *
 *   variant label · live sample · --text-* token name · computed font-size ·
 *     computed line-height · computed max-width (measure)
 *
 * Computed values are read from `getComputedStyle` in a client effect, so the
 * row reflects whatever the live token cascade produces — light mode by
 * default; the `Dark` story rewraps in `.dark`, which swaps the brand-color
 * layer but leaves the foundation type cascade intact (TYPOGRAPHY_PHILOSOPHY
 * "Reading mode vs UI mode" is brand-invariant).
 *
 * The `ReadingVsUI` story puts a `.prose-long` paragraph next to a
 * `.ui-text-sm` button label so the two modes can be eyeballed side-by-side
 * at their canonical sizes. The `WrapBalance` story demonstrates
 * `text-wrap: balance` on h1–h3 + `text-wrap: pretty` on body paragraphs by
 * repeating the same content in a balanced vs unbalanced container.
 *
 * Client-side by necessity — `getComputedStyle` is a browser-only API.
 *
 * Sources: TYPOGRAPHY_PHILOSOPHY.md (type scale, body/code contracts, fluid
 * type, reading-vs-UI modes) + DESIGN_PRINCIPLES #2 ("Reading-first
 * typography") + foundation.css (the --text-* token table).
 */

// ── Variant roster ──────────────────────────────────────────────────────────
//
// One row per Typography variant. `tokenName` is the CSS custom property the
// variant maps to (so the rendered size and the reported token stay in
// lockstep — if the variant→token wiring ever drifts, the row visibly
// disagrees). `sample` is canonical content that exercises the variant's
// intent: headings get heading-shaped copy, body/long get prose, ui gets
// button-label copy, code gets an inline literal.

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body'
  | 'long'
  | 'ui'
  | 'ui-sm'
  | 'caption'
  | 'code';

type VariantSpec = {
  variant: TypographyVariant;
  /** CSS custom property to read back via `getComputedStyle`. */
  tokenName: string;
  /** Canonical sample copy for the row. */
  sample: React.ReactNode;
};

const VARIANTS: VariantSpec[] = [
  {
    variant: 'h1',
    tokenName: '--text-h1',
    sample: 'Lint the whole stack',
  },
  {
    variant: 'h2',
    tokenName: '--text-h2',
    sample: 'One rule library, many engines',
  },
  {
    variant: 'h3',
    tokenName: '--text-h3',
    sample: 'Domain-security depth',
  },
  {
    variant: 'h4',
    tokenName: '--text-h4',
    sample: 'Section heading',
  },
  {
    variant: 'h5',
    tokenName: '--text-h5',
    sample: 'Sub-section heading',
  },
  {
    variant: 'h6',
    tokenName: '--text-h6',
    sample: 'Smallest heading',
  },
  {
    variant: 'body',
    tokenName: '--text-body',
    sample:
      'Body copy at 16px on a 1.6 leading. Used for short paragraphs in the docs flow and on cards — the default reading mode for everything that is not a long-form article.',
  },
  {
    variant: 'long',
    tokenName: '--text-long',
    sample:
      'Long-form prose at 17px on a 1.7 leading, with optimizeLegibility. This is the variant articles render in — wider line-height, slightly larger size, measure capped at 75ch so the eye does not lose the line.',
  },
  {
    variant: 'ui',
    tokenName: '--text-ui',
    sample: 'Open documentation',
  },
  {
    variant: 'ui-sm',
    tokenName: '--text-ui-sm',
    sample: 'Save changes',
  },
  {
    variant: 'caption',
    tokenName: '--text-caption',
    sample: 'Updated 2026-05-29',
  },
  {
    variant: 'code',
    tokenName: '--text-code',
    sample: 'pnpm dlx @interlace/cli init',
  },
];

// ── Reactive value reader ──────────────────────────────────────────────────
//
// One pass after mount: read computed font-size, line-height, and max-width
// from each variant's rendered element. We key the ref map by variant name so
// the row + sample reading never disagree, and re-read whenever the container
// moves between trees (e.g. the Dark story wrapping it in `.dark`).

type Sample = {
  fontSize: string;
  lineHeight: string;
  maxWidth: string;
};

function useTypographySamples(
  refs: React.RefObject<Map<TypographyVariant, HTMLElement | null>>,
): Record<TypographyVariant, Sample | undefined> {
  const [samples, setSamples] = React.useState<
    Record<TypographyVariant, Sample | undefined>
  >({} as Record<TypographyVariant, Sample | undefined>);

  React.useEffect(() => {
    const map = refs.current;
    if (!map) return;
    const next = {} as Record<TypographyVariant, Sample | undefined>;
    for (const [variant, node] of map.entries()) {
      if (!node) {
        next[variant] = undefined;
        continue;
      }
      const cs = getComputedStyle(node);
      next[variant] = {
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        maxWidth: cs.maxWidth,
      };
    }
    setSamples(next);
  }, [refs]);

  return samples;
}

// ── Presentation ───────────────────────────────────────────────────────────

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      data-slot="typography-metric"
      data-label={label}
      className="border-border bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-ui-sm"
    >
      <span className="font-semibold uppercase tracking-heading">{label}</span>
      <span aria-hidden>·</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}

function VariantRow({
  spec,
  sample,
  registerRef,
}: {
  spec: VariantSpec;
  sample: Sample | undefined;
  registerRef: (variant: TypographyVariant, node: HTMLElement | null) => void;
}) {
  // Use `as="div"` for every row sample so the row's outline does NOT pollute
  // the page's heading order (avoids 6 stacked <h1>s in the specimen). The
  // visual variant + computed-style readout stay intact.
  const setRef = React.useCallback(
    (node: HTMLElement | null) => registerRef(spec.variant, node),
    [registerRef, spec.variant],
  );

  return (
    <Box
      border
      radius="md"
      padding="sm"
      className="bg-background"
      data-slot="typography-row"
      data-variant={spec.variant}
    >
      <Grid cols={12} gap="md" className="items-center">
        <GridItem span={12} mdSpan={2}>
          <Typography variant="ui" as="code" className="font-mono">
            variant=&quot;{spec.variant}&quot;
          </Typography>
        </GridItem>

        <GridItem span={12} mdSpan={6}>
          <Typography
            variant={spec.variant}
            as="div"
            ref={setRef as React.Ref<HTMLDivElement>}
          >
            {spec.sample}
          </Typography>
        </GridItem>

        <GridItem span={12} mdSpan={4}>
          <Stack gap="xs">
            <Typography variant="caption" tone="muted" as="code">
              {spec.tokenName}
            </Typography>
            <Stack direction="horizontal" gap="xs">
              <MetricChip label="size" value={sample?.fontSize ?? '…'} />
              <MetricChip label="leading" value={sample?.lineHeight ?? '…'} />
              <MetricChip
                label="measure"
                value={sample?.maxWidth && sample.maxWidth !== 'none' ? sample.maxWidth : 'none'}
              />
            </Stack>
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
}

function Specimen() {
  // One ref map for every variant row. `useRef` on a Map gives us a stable
  // identity across re-renders so the effect dependency list stays correct.
  const refs = React.useRef<Map<TypographyVariant, HTMLElement | null>>(
    new Map(),
  );
  const registerRef = React.useCallback(
    (variant: TypographyVariant, node: HTMLElement | null) => {
      refs.current.set(variant, node);
    },
    [],
  );
  const samples = useTypographySamples(refs);

  return (
    <Box
      // Container provides the cascade context for `getComputedStyle` and the
      // paint surface for every relative-color utility (bg-background etc.).
      className="bg-background text-foreground"
      padding="lg"
      data-slot="typography-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Type scale
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Every variant the <code className="font-mono">Typography</code>{' '}
            primitive ships, with the underlying{' '}
            <code className="font-mono">--text-*</code> token and the live
            computed font-size, line-height, and max-width read from the
            cascade. Hierarchy compresses, never expands — one variable
            (size), six heading levels, no 900 weight.
          </Typography>
        </Stack>

        <Stack gap="sm">
          {VARIANTS.map((spec) => (
            <VariantRow
              key={spec.variant}
              spec={spec}
              sample={samples[spec.variant]}
              registerRef={registerRef}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Reading-vs-UI specimen ──────────────────────────────────────────────────
//
// TYPOGRAPHY_PHILOSOPHY "Reading mode vs UI mode": the call site declares
// intent. A docs paragraph reaches for `.prose-long` (17px / 1.7 / ≤75ch); a
// button label reaches for `.ui-text-sm` (13px / 1.5). Same family (Inter),
// different rhythm — sit them next to each other so the contrast is obvious.

function ReadingVsUISpecimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="typography-reading-vs-ui"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Reading mode vs UI mode
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            The two text modes the DS ships, at their canonical sizes. Prose
            uses <code className="font-mono">.prose-long</code> (17px / 1.7,
            measure 75ch); UI uses <code className="font-mono">.ui-text-sm</code>{' '}
            (13px / 1.5). Same Inter family — different rhythm.
          </Typography>
        </Stack>

        <Grid cols={12} gap="lg">
          <GridItem span={12} mdSpan={8}>
            <Box
              border
              radius="md"
              padding="md"
              className="bg-background h-full"
              data-slot="reading-sample"
            >
              <Stack gap="xs">
                <Typography variant="caption" tone="muted" as="code">
                  .prose-long · --text-long · 17px / 1.7 / max-w 75ch
                </Typography>
                <p className="prose-long">
                  Interlace ships rule libraries that run under multiple
                  engines — ESLint today, Oxlint with CI-enforced parity,
                  Biome and the TypeScript Go compiler on the roadmap. The
                  rule is the asset; the engine is a delivery channel. When a
                  new engine reaches plugin parity, the rule moves with it
                  unchanged. That portability is the moat, not any single
                  runtime.
                </p>
              </Stack>
            </Box>
          </GridItem>

          <GridItem span={12} mdSpan={4}>
            <Box
              border
              radius="md"
              padding="md"
              className="bg-background h-full"
              data-slot="ui-sample"
            >
              <Stack gap="xs">
                <Typography variant="caption" tone="muted" as="code">
                  .ui-text-sm · --text-ui-sm · 13px / 1.5
                </Typography>
                <Stack direction="horizontal" gap="xs">
                  {/*
                    Plain <button>s — not the Button primitive — because this
                    specimen is about the *text class*, not the button shape.
                    Wrapping in Button would conflate the two concerns.
                  */}
                  <button
                    type="button"
                    className="ui-text-sm bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center rounded-sm border border-transparent px-3 py-1.5 font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    className="ui-text-sm border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring inline-flex items-center rounded-sm border px-3 py-1.5 font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                </Stack>
              </Stack>
            </Box>
          </GridItem>
        </Grid>
      </Stack>
    </Box>
  );
}

// ── Wrap-balance specimen ──────────────────────────────────────────────────
//
// The `Typography` primitive applies `text-balance` to h1/h2 by default
// (TYPOGRAPHY_PHILOSOPHY "headlines balance, paragraphs go pretty"). The
// "unbalanced" column overrides that with an arbitrary `[text-wrap:normal]`
// utility so reviewers can see how a long h1 wraps with vs without
// `text-wrap: balance` at the same container width. Paragraphs get the same
// treatment with `text-pretty` (default in long-form contexts) vs
// `text-wrap: normal`.

const BALANCE_HEADINGS: Array<{
  variant: 'h1' | 'h2' | 'h3';
  text: string;
}> = [
  {
    variant: 'h1',
    text: 'Lint the whole stack with one library across every engine',
  },
  {
    variant: 'h2',
    text: 'One rule library, four engines, zero divergence between runtimes',
  },
  {
    variant: 'h3',
    text: 'Domain-security depth across the JavaScript ecosystem',
  },
];

const BALANCE_PARAGRAPH =
  'Headlines balance so the last line is never a single orphaned word. Paragraphs go pretty so the final line is never one stranded short word. Both are a one-property cost, both are off by default in browsers — the DS turns them on at the primitive layer so every consumer inherits the rhythm.';

function WrapBalanceSpecimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="typography-wrap-balance"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            text-wrap: balance vs normal
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            The same headline rendered in two identically-sized containers —
            the left applies <code className="font-mono">text-wrap: balance</code>{' '}
            (the Typography primitive&apos;s default for h1/h2), the right
            forces <code className="font-mono">text-wrap: normal</code>. Watch
            the last line: balanced headlines distribute words evenly across
            lines; normal headlines orphan whatever is left.
          </Typography>
        </Stack>

        <Stack gap="md">
          {BALANCE_HEADINGS.map(({ variant, text }) => (
            <Grid key={variant} cols={12} gap="md" className="items-start">
              <GridItem span={12}>
                <Typography
                  variant="caption"
                  tone="muted"
                  as="code"
                  className="font-mono"
                >
                  variant=&quot;{variant}&quot;
                </Typography>
              </GridItem>

              <GridItem span={12} mdSpan={6}>
                <Box
                  border
                  radius="md"
                  padding="sm"
                  className="bg-background"
                  data-slot="balanced"
                >
                  <Stack gap="xs">
                    <Typography variant="caption" tone="muted" as="code">
                      text-wrap: balance
                    </Typography>
                    <Typography variant={variant} as="div">
                      {text}
                    </Typography>
                  </Stack>
                </Box>
              </GridItem>

              <GridItem span={12} mdSpan={6}>
                <Box
                  border
                  radius="md"
                  padding="sm"
                  className="bg-background"
                  data-slot="unbalanced"
                >
                  <Stack gap="xs">
                    <Typography variant="caption" tone="muted" as="code">
                      text-wrap: normal
                    </Typography>
                    <Typography
                      variant={variant}
                      as="div"
                      // Override the primitive's default `text-balance`
                      // (h1/h2) with an arbitrary wrap-normal utility so the
                      // two columns differ on exactly one property.
                      className="[text-wrap:normal]"
                    >
                      {text}
                    </Typography>
                  </Stack>
                </Box>
              </GridItem>
            </Grid>
          ))}

          <Grid cols={12} gap="md" className="items-start">
            <GridItem span={12}>
              <Typography
                variant="caption"
                tone="muted"
                as="code"
                className="font-mono"
              >
                paragraph · text-wrap: pretty vs normal
              </Typography>
            </GridItem>

            <GridItem span={12} mdSpan={6}>
              <Box
                border
                radius="md"
                padding="sm"
                className="bg-background"
                data-slot="pretty"
              >
                <Stack gap="xs">
                  <Typography variant="caption" tone="muted" as="code">
                    text-wrap: pretty
                  </Typography>
                  <p className="prose-long [text-wrap:pretty]">
                    {BALANCE_PARAGRAPH}
                  </p>
                </Stack>
              </Box>
            </GridItem>

            <GridItem span={12} mdSpan={6}>
              <Box
                border
                radius="md"
                padding="sm"
                className="bg-background"
                data-slot="unpretty"
              >
                <Stack gap="xs">
                  <Typography variant="caption" tone="muted" as="code">
                    text-wrap: normal
                  </Typography>
                  <p className="prose-long [text-wrap:normal]">
                    {BALANCE_PARAGRAPH}
                  </p>
                </Stack>
              </Box>
            </GridItem>
          </Grid>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Storybook meta + stories ────────────────────────────────────────────────

const meta = {
  title: 'Foundations/Typography',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Live specimen of every Typography variant. Each row pairs the rendered sample with the underlying --text-* token and the live computed font-size / line-height / max-width, read from the cascade after mount. Client-side by necessity — `getComputedStyle` is a browser-only API. Source: TYPOGRAPHY_PHILOSOPHY.md + foundation.css.',
      },
    },
  },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default specimen — every variant in one column with its measured metrics. */
export const Default: Story = {};

/** Same specimen — every variant in one column with its measured metrics. */
export const Variants: Story = {};

/** Same specimen, rewrapped in `.dark`. */
export const Dark: Story = {
  decorators: [withDark],
};

/** Same specimen, rendered in `dir="rtl"` to surface left/right asymmetry. */
export const RTL: Story = {
  parameters: {
    direction: 'rtl',
  },
  decorators: [
    (StoryFn) => (
      <div dir="rtl">
        <StoryFn />
      </div>
    ),
  ],
};

/** Same specimen, rendered below the minimum supported viewport. */
export const BelowMinViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

/**
 * Reading-mode prose next to a UI-mode button label, at canonical sizes.
 * Demonstrates the two text modes the DS ships side-by-side.
 */
export const ReadingVsUI: Story = {
  render: () => <ReadingVsUISpecimen />,
};

/**
 * h1–h3 with `text-wrap: balance` (default in the primitive) next to
 * `text-wrap: normal`, plus a long-form paragraph in `text-wrap: pretty` vs
 * `text-wrap: normal`. The same content in identical containers — the only
 * variable is the wrap algorithm.
 */
export const WrapBalance: Story = {
  render: () => <WrapBalanceSpecimen />,
};
