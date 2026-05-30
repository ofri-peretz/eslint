'use client';

import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid, GridItem } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';
import { useReducedMotion } from '@interlace/ui/use-reduced-motion';

import { withDark, withReducedMotion, withRtl } from '@/decorators';

/**
 * Motion — duration + reduced-motion specimen.
 *
 * Walks the three canonical durations from MOTION_PHILOSOPHY.md
 * (DESIGN_PRINCIPLES #7 — "≤200ms ease-out for state changes"):
 *
 *   - fast   120ms  — micro-interactions (hover tint, focus-ring snap)
 *   - base   180ms  — default state change (toggle, popover open)
 *   - slow   240ms  — modal / dialog reveal
 *
 * Each sample is an identical 64px square that translates 1.5rem to the
 * right on click. The motion is the *only* variable per row — same color,
 * same size, same easing — so the eye reads the duration directly.
 *
 * A fourth row shows the reduced-motion contract: when
 * `useReducedMotion()` returns `true` (either the OS preference, or the
 * `ReducedMotion` story decorator that forces the media query CSS), the
 * sample skips its translate entirely and snaps to the destination.
 *
 * Below the samples sits a preflight callout — the four motion invariants
 * that ship in `@interlace/ui/styles/preflight.css` and apply globally to
 * every Interlace surface. Listing them on the specimen is the seam
 * between the per-component motion choice (durations above) and the
 * global motion budget (the rules below).
 *
 * Client-side by necessity: the squares need `useState` to toggle the
 * translate, and `useReducedMotion` is a `'use client'` hook.
 */

// ── Canonical duration scale ─────────────────────────────────────────────────
//
// Three rows, one per duration. `ms` drives both the label and the inline
// `transitionDuration` so the visible motion always matches the printed
// number — if a value drifts, the row is wrong, not just mislabeled.

type DurationStep = {
  /** Token name as it appears in MOTION_PHILOSOPHY.md. */
  token: 'fast' | 'base' | 'slow';
  /** Literal ms value for the inline style + label. */
  ms: number;
  /** Where this duration is the canonical choice. */
  use: string;
};

const DURATIONS: DurationStep[] = [
  { token: 'fast', ms: 120, use: 'Hover tint, focus-ring snap' },
  { token: 'base', ms: 180, use: 'Toggle, popover open' },
  { token: 'slow', ms: 240, use: 'Modal / dialog reveal' },
];

// ── Sample square ────────────────────────────────────────────────────────────
//
// One reusable square — 64px (`size-16`), primary tint surface, token border.
// `translate-x-6` on click; the parent owns the toggle state, the square is
// the dumb child. Reduced-motion is opt-in per row so the comparison stays
// honest.

function MotionSample({
  durationMs,
  reduce,
  label,
}: {
  durationMs: number;
  reduce: boolean;
  label: string;
}) {
  const [shifted, setShifted] = React.useState(false);

  // When the OS / decorator asks for reduced motion, collapse the duration
  // to ~0 so the square snaps to the destination instead of animating.
  // We zero the duration rather than skip the transform so the toggle still
  // *works* — reduced-motion is a quieter UI, not a non-functional one.
  const effectiveMs = reduce ? 0 : durationMs;

  return (
    <button
      type="button"
      onClick={() => setShifted((s) => !s)}
      aria-pressed={shifted}
      aria-label={`${label} — toggle translate`}
      className="relative block h-16 w-full rounded-md border border-border bg-muted/50 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        aria-hidden
        style={{
          transitionProperty: 'transform',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDuration: `${effectiveMs}ms`,
          transform: shifted ? 'translateX(1.5rem)' : 'translateX(0)',
        }}
        className="absolute inset-y-2 left-2 block size-12 rounded-sm bg-primary"
      />
    </button>
  );
}

// ── Row: label · sample · use-case ───────────────────────────────────────────

function DurationRow({ step }: { step: DurationStep }) {
  return (
    <Box
      border
      radius="md"
      padding="sm"
      className="bg-background"
      data-slot="motion-row"
      data-duration={step.token}
    >
      <Grid cols={12} gap="md" className="items-center">
        <GridItem span={12} mdSpan={3}>
          <Stack gap="xs">
            <Typography variant="ui" as="code" className="font-mono">
              {step.token}
            </Typography>
            <Typography variant="caption" tone="muted" as="code">
              {step.ms}ms
            </Typography>
          </Stack>
        </GridItem>

        <GridItem span={12} mdSpan={5}>
          <MotionSample
            durationMs={step.ms}
            reduce={false}
            label={`${step.token} ${step.ms}ms`}
          />
        </GridItem>

        <GridItem span={12} mdSpan={4}>
          <Typography variant="ui-sm" tone="muted">
            {step.use}
          </Typography>
        </GridItem>
      </Grid>
    </Box>
  );
}

// ── Reduced-motion row ───────────────────────────────────────────────────────
//
// Uses `useReducedMotion()` from `@interlace/ui/use-reduced-motion` to gate
// the sample. When the user (or the `ReducedMotion` decorator) has the
// preference set, the row's duration collapses to 0 and a label calls it
// out — the JS-driven inverse of the CSS clamp in preflight.css.

function ReducedMotionRow() {
  const reduce = useReducedMotion();
  return (
    <Box
      border
      radius="md"
      padding="sm"
      className="bg-background"
      data-slot="motion-row"
      data-duration="reduced"
      data-reduce={reduce ? '' : undefined}
    >
      <Grid cols={12} gap="md" className="items-center">
        <GridItem span={12} mdSpan={3}>
          <Stack gap="xs">
            <Typography variant="ui" as="code" className="font-mono">
              reduced
            </Typography>
            <Typography variant="caption" tone="muted" as="code">
              {reduce ? '~0ms (live)' : 'base 180ms (live)'}
            </Typography>
          </Stack>
        </GridItem>

        <GridItem span={12} mdSpan={5}>
          <MotionSample
            durationMs={180}
            reduce={reduce}
            label="reduced-motion-respecting"
          />
        </GridItem>

        <GridItem span={12} mdSpan={4}>
          <Typography variant="ui-sm" tone="muted">
            Gated by <code className="font-mono">useReducedMotion()</code>.
            Toggle OS &ldquo;Reduce motion&rdquo; or run the
            <code className="font-mono"> ReducedMotion</code> story.
          </Typography>
        </GridItem>
      </Grid>
    </Box>
  );
}

// ── Preflight motion callout ─────────────────────────────────────────────────
//
// The four invariants that ship in `@interlace/ui/styles/preflight.css`
// section 6 — the global motion budget every Interlace surface inherits
// regardless of per-component choices. Box doesn't ship a `warning` surface,
// so we paint the callout with the warning tint directly + a token border.

const PREFLIGHT_RULES: Array<{ title: string; detail: string }> = [
  {
    title: 'Smooth scroll on document navigation',
    detail:
      'html { scroll-behavior: smooth } — anchor links and history nav ease in.',
  },
  {
    title: 'prefers-reduced-motion clamps every animation',
    detail:
      '@media (prefers-reduced-motion: reduce) clamps animation-duration and transition-duration to 0.01ms !important, animation-iteration-count to 1, scroll-behavior to auto. Overrides every component choice — no opt-out.',
  },
  {
    title: 'JS-driven motion gated by useReducedMotion',
    detail:
      'CSS clamps cover transitions + keyframe animations. canvas / motion/react / requestAnimationFrame loops gate themselves via the useReducedMotion hook (see the reduced row above).',
  },
  {
    title: 'CLS = 0 from layout',
    detail:
      'Reserve dimensions with AspectRatio / min-h-* / explicit width+height before async content lands. Motion communicates state; it never causes layout shift.',
  },
];

function PreflightCallout() {
  return (
    <Box
      border
      radius="md"
      padding="md"
      className="border-warning/40 bg-warning/10"
      data-slot="motion-preflight"
    >
      <Stack gap="sm">
        <Stack gap="xs">
          <Typography variant="h4" as="h3">
            Preflight motion rules
          </Typography>
          <Typography variant="ui-sm" tone="muted">
            Global invariants shipped by{' '}
            <code className="font-mono">@interlace/ui/styles/preflight.css</code>
            . Every Interlace surface inherits these — per-component motion
            choices layer on top.
          </Typography>
        </Stack>

        <Stack gap="xs" render={<ul />} className="list-none pl-0">
          {PREFLIGHT_RULES.map((rule) => (
            <li key={rule.title}>
              <Stack gap="xs">
                <Typography variant="ui" className="font-semibold">
                  {rule.title}
                </Typography>
                <Typography variant="ui-sm" tone="muted">
                  {rule.detail}
                </Typography>
              </Stack>
            </li>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Specimen ─────────────────────────────────────────────────────────────────

function Specimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="motion-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Motion durations
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Three canonical durations — <code className="font-mono">fast</code>{' '}
            120ms, <code className="font-mono">base</code> 180ms,{' '}
            <code className="font-mono">slow</code> 240ms — from
            MOTION_PHILOSOPHY.md. Click any square to toggle its translate; the
            visible motion is the only variable per row. A fourth row gates the
            same translate through{' '}
            <code className="font-mono">useReducedMotion()</code> so the contract
            reads end-to-end.
          </Typography>
        </Stack>

        <Stack gap="sm">
          {DURATIONS.map((step) => (
            <DurationRow key={step.token} step={step} />
          ))}
          <ReducedMotionRow />
        </Stack>

        <PreflightCallout />
      </Stack>
    </Box>
  );
}

// ── Storybook meta + stories ─────────────────────────────────────────────────

const meta = {
  title: 'Foundations/Motion',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Canonical motion durations (fast 120ms, base 180ms, slow 240ms) plus the reduced-motion contract. Click the squares; each row varies only its `transitionDuration`. The fourth sample is gated by `useReducedMotion()` so OS preference (or the `ReducedMotion` story decorator) flips it to a snap. Below: the four preflight motion invariants that apply globally.',
      },
    },
  },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {};

export const Dark: Story = {
  decorators: [withDark],
};

/**
 * Forces the reduced-motion CSS clamp across the whole story (animations +
 * transitions collapse to ~0). Combined with `useReducedMotion()` on the
 * fourth row, this is the end-to-end check that both the CSS clamp and the
 * JS hook honor the same preference.
 */
export const ReducedMotion: Story = {
  decorators: [withReducedMotion],
};

export const RTL: Story = {
  decorators: [withRtl],
};

export const BelowMinViewport: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};
