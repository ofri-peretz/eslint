'use client';

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid, GridItem } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';

import { withDark } from '@/decorators';

/**
 * Colors — semantic-token specimen.
 *
 * Renders every shadcn-bare semantic token that the DS ships (background,
 * foreground, card, popover, primary, secondary, muted, accent, destructive,
 * border, input, ring, plus the success / warning extensions) as a row:
 *
 *   80×80 swatch · token name · live computed oklch · AA badges
 *     · contrast vs background
 *     · contrast vs foreground
 *
 * The computed value + contrast are read from `getComputedStyle` in a client
 * effect so the row reflects whatever the live token cascade produces (light
 * mode by default; the `Dark` story wraps the grid in `<div className="dark">`,
 * which swaps the entire token layer). Per `COLOR_PHILOSOPHY.md` + R20, body
 * contrast clears 4.5:1; large-text / UI clears 3:1.
 *
 * This story is intentionally client-side — server components cannot read
 * computed styles.
 */

// ── Token roster ────────────────────────────────────────────────────────────
//
// One row per shadcn-bare semantic token. `bgClass` is the Tailwind utility
// that paints the swatch; `varName` is the CSS custom property we read back
// via `getComputedStyle`. The two are kept in lockstep so the swatch and the
// reported value never disagree.

type ColorToken = {
  /** Token name as it appears in source (e.g. `primary-foreground`). */
  name: string;
  /** CSS custom property to read back via `getComputedStyle`. */
  varName: string;
  /** Tailwind utility that paints the swatch. */
  bgClass: string;
};

const TOKENS: ColorToken[] = [
  { name: 'background', varName: '--background', bgClass: 'bg-background' },
  { name: 'foreground', varName: '--foreground', bgClass: 'bg-foreground' },
  { name: 'card', varName: '--card', bgClass: 'bg-card' },
  {
    name: 'card-foreground',
    varName: '--card-foreground',
    bgClass: 'bg-card-foreground',
  },
  { name: 'popover', varName: '--popover', bgClass: 'bg-popover' },
  {
    name: 'popover-foreground',
    varName: '--popover-foreground',
    bgClass: 'bg-popover-foreground',
  },
  { name: 'primary', varName: '--primary', bgClass: 'bg-primary' },
  {
    name: 'primary-foreground',
    varName: '--primary-foreground',
    bgClass: 'bg-primary-foreground',
  },
  { name: 'secondary', varName: '--secondary', bgClass: 'bg-secondary' },
  {
    name: 'secondary-foreground',
    varName: '--secondary-foreground',
    bgClass: 'bg-secondary-foreground',
  },
  { name: 'muted', varName: '--muted', bgClass: 'bg-muted' },
  {
    name: 'muted-foreground',
    varName: '--muted-foreground',
    bgClass: 'bg-muted-foreground',
  },
  { name: 'accent', varName: '--accent', bgClass: 'bg-accent' },
  {
    name: 'accent-foreground',
    varName: '--accent-foreground',
    bgClass: 'bg-accent-foreground',
  },
  { name: 'destructive', varName: '--destructive', bgClass: 'bg-destructive' },
  {
    name: 'destructive-foreground',
    varName: '--destructive-foreground',
    bgClass: 'bg-destructive-foreground',
  },
  { name: 'border', varName: '--border', bgClass: 'bg-border' },
  { name: 'input', varName: '--input', bgClass: 'bg-input' },
  { name: 'ring', varName: '--ring', bgClass: 'bg-ring' },
  { name: 'success', varName: '--success', bgClass: 'bg-success' },
  {
    name: 'success-foreground',
    varName: '--success-foreground',
    bgClass: 'bg-success-foreground',
  },
  { name: 'warning', varName: '--warning', bgClass: 'bg-warning' },
  {
    name: 'warning-foreground',
    varName: '--warning-foreground',
    bgClass: 'bg-warning-foreground',
  },
];

// ── Color parsing + relative luminance (WCAG 2.x) ───────────────────────────
//
// `getComputedStyle` returns whatever the browser normalised the token to. In
// 2026-baseline Chromium/Firefox/Safari that's typically `oklch(...)` for
// modern declarations, or `rgb(...)` / `rgba(...)` for legacy values. We
// support both. Anything we can't parse → null, and the badge renders "n/a"
// rather than a false positive.

type RGB = { r: number; g: number; b: number };

/** Strip whitespace + lower-case; safe to feed to the parsers below. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Parse `rgb(r g b / a?)` and `rgba(r,g,b,a?)` — both modern + legacy syntax. */
function parseRgb(value: string): RGB | null {
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return null;
  // Split on comma OR whitespace (modern space-separated syntax).
  const parts = match[1]
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const toByte = (p: string): number => {
    if (p.endsWith('%')) return (Number.parseFloat(p) / 100) * 255;
    return Number.parseFloat(p);
  };
  const r = toByte(parts[0]);
  const g = toByte(parts[1]);
  const b = toByte(parts[2]);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

/**
 * Parse `oklch(L C H / a?)` → sRGB. Conversion path is
 * OKLCH → OKLab → linear sRGB → gamma-encoded sRGB, following the CSS Color 4
 * reference. Adequate for AA contrast bucketing (the only consumer); not a
 * substitute for a real color library.
 */
function parseOklch(value: string): RGB | null {
  const match = value.match(/^oklch\(([^)]+)\)$/);
  if (!match) return null;
  const parts = match[1]
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;
  const parseNumber = (p: string, max: number): number => {
    if (p.endsWith('%')) return (Number.parseFloat(p) / 100) * max;
    return Number.parseFloat(p);
  };
  const L = parseNumber(parts[0], 1);
  const C = parseNumber(parts[1], 0.4);
  const Hdeg = Number.parseFloat(parts[2]);
  if ([L, C, Hdeg].some((n) => Number.isNaN(n))) return null;
  const Hrad = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(Hrad);
  const b = C * Math.sin(Hrad);

  // OKLab → linear sRGB (matrices per CSS Color 4 spec).
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Linear sRGB → gamma-encoded sRGB.
  const toSrgb = (x: number): number => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.min(1, Math.max(0, v)) * 255;
  };
  return { r: toSrgb(rLin), g: toSrgb(gLin), b: toSrgb(bLin) };
}

/** Best-effort parse; falls back through the recognised forms. */
function parseColor(value: string): RGB | null {
  const v = normalize(value);
  if (v.startsWith('oklch(')) return parseOklch(v);
  if (v.startsWith('rgb(') || v.startsWith('rgba(')) return parseRgb(v);
  return null;
}

/** WCAG relative luminance (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance). */
function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number): number => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, range 1 (no contrast) → 21 (black on white). */
function contrastRatio(fg: RGB, bg: RGB): number {
  const lFg = relativeLuminance(fg);
  const lBg = relativeLuminance(bg);
  const [lighter, darker] = lFg > lBg ? [lFg, lBg] : [lBg, lFg];
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Reactive value reader ──────────────────────────────────────────────────
//
// One pass after mount: read the computed value of every `varName` against the
// container `<Box>`. We re-read whenever the container moves between trees
// (e.g. the Dark story wrapping it in `.dark`) by keying off the `containerRef`
// node identity.

type Sample = { computed: string; rgb: RGB | null };

function useTokenSamples(
  containerRef: React.RefObject<HTMLElement | null>,
  tokens: ColorToken[],
): Record<string, Sample> {
  const [samples, setSamples] = React.useState<Record<string, Sample>>({});

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const cs = getComputedStyle(node);
    const next: Record<string, Sample> = {};
    for (const token of tokens) {
      const computed = cs.getPropertyValue(token.varName).trim();
      next[token.name] = { computed, rgb: parseColor(computed) };
    }
    setSamples(next);
  }, [containerRef, tokens]);

  return samples;
}

// ── Presentation ───────────────────────────────────────────────────────────

type BadgeLevel = 'AAA' | 'AA' | 'AA-large' | 'fail' | 'n/a';

function levelFor(ratio: number | null): BadgeLevel {
  if (ratio == null) return 'n/a';
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

const BADGE_CLASS: Record<BadgeLevel, string> = {
  AAA: 'bg-success/15 text-success border-success/30',
  AA: 'bg-success/15 text-success border-success/30',
  'AA-large': 'bg-warning/15 text-warning border-warning/30',
  fail: 'bg-destructive/15 text-destructive border-destructive/30',
  'n/a': 'bg-muted text-muted-foreground border-border',
};

function ContrastBadge({
  label,
  ratio,
}: {
  label: string;
  ratio: number | null;
}) {
  const level = levelFor(ratio);
  return (
    <span
      data-slot="contrast-badge"
      data-level={level}
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-ui-sm ${BADGE_CLASS[level]}`}
    >
      <span className="font-semibold">{level}</span>
      <span aria-hidden>·</span>
      <span>{label}</span>
      <span aria-hidden>·</span>
      <span>{ratio == null ? '—' : `${ratio.toFixed(2)}:1`}</span>
    </span>
  );
}

function TokenRow({
  token,
  samples,
  backgroundRgb,
  foregroundRgb,
}: {
  token: ColorToken;
  samples: Record<string, Sample>;
  backgroundRgb: RGB | null;
  foregroundRgb: RGB | null;
}) {
  const sample = samples[token.name];
  const swatchRgb = sample?.rgb ?? null;
  const computed = sample?.computed ?? '';
  const vsBg =
    swatchRgb && backgroundRgb ? contrastRatio(swatchRgb, backgroundRgb) : null;
  const vsFg =
    swatchRgb && foregroundRgb ? contrastRatio(swatchRgb, foregroundRgb) : null;

  return (
    <Box
      border
      radius="md"
      padding="sm"
      className="bg-background"
      data-slot="token-row"
      data-token={token.name}
    >
      <Grid cols={12} gap="md" className="items-center">
        <GridItem span={3} mdSpan={2}>
          {/*
            The 80×80 swatch — bg painted by the token utility, not an inline
            style, so a JIT failure on the token surfaces visually (R18/R19).
          */}
          <div
            aria-hidden
            className={`size-20 rounded-md border border-border ${token.bgClass}`}
          />
        </GridItem>

        <GridItem span={9} mdSpan={4}>
          <Stack gap="xs">
            <Typography variant="ui" as="code" className="font-mono">
              {token.name}
            </Typography>
            <Typography variant="caption" tone="muted" as="code">
              {computed || '…'}
            </Typography>
          </Stack>
        </GridItem>

        <GridItem span={12} mdSpan={6}>
          <Stack direction="horizontal" gap="xs">
            <ContrastBadge label="vs bg" ratio={vsBg} />
            <ContrastBadge label="vs fg" ratio={vsFg} />
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
}

function Specimen() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const samples = useTokenSamples(containerRef, TOKENS);
  const backgroundRgb = samples['background']?.rgb ?? null;
  const foregroundRgb = samples['foreground']?.rgb ?? null;

  return (
    <Box
      // Container provides the cascade context for `getComputedStyle` and the
      // paint surface for every relative-color utility (bg-background etc.).
      className="bg-background text-foreground"
      padding="lg"
      data-slot="colors-specimen"
      // React 19 forwards `ref` as a regular prop on function components, so
      // Box (which spreads ...props onto its rendered element) accepts a div
      // ref without an explicit forwardRef. Box defaults to <div>, so the
      // ref type lines up.
      ref={containerRef}
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Semantic color tokens
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Every shadcn-bare semantic token the DS ships, read live from the
            cascade. AA badges show contrast against{' '}
            <code className="font-mono">--background</code> and{' '}
            <code className="font-mono">--foreground</code>; AAA ≥ 7:1, AA ≥
            4.5:1, AA-large ≥ 3:1.
          </Typography>
        </Stack>

        <Stack gap="sm">
          {TOKENS.map((token) => (
            <TokenRow
              key={token.name}
              token={token}
              samples={samples}
              backgroundRgb={backgroundRgb}
              foregroundRgb={foregroundRgb}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Storybook meta + stories ────────────────────────────────────────────────

const meta = {
  title: 'Foundations/Colors',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Live specimen of every shadcn-bare semantic token. Computed oklch is read via `getComputedStyle` after mount, so the row reflects the live cascade (light by default; the Dark story rewraps in `.dark`, which swaps the whole token layer). Client-side by necessity — `getComputedStyle` is a browser-only API.',
      },
    },
  },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Light: Story = {};

export const Dark: Story = {
  decorators: [withDark],
};

export const Variants: Story = {};

export const RTL: Story = {
  parameters: {
    direction: 'rtl',
  },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
};

export const BelowMinViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'belowMin',
      viewports: {
        belowMin: {
          name: 'Below Min (320px)',
          styles: { width: '320px', height: '720px' },
        },
      },
    },
  },
};
