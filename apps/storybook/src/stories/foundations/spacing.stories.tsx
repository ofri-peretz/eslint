import type { Meta, StoryObj } from '@storybook/react-vite';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid, GridItem } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';

import { withDark, withRtl } from '@/decorators';

/**
 * Spacing — six-step scale specimen.
 *
 * Renders the entire DS spacing scale (`--spacing-xs` … `--spacing-2xl` =
 * 8 / 16 / 24 / 40 / 64 / 96px) from LAYOUT_PHILOSOPHY.md §3.
 *
 * Two panels:
 *
 *   1. **Scale bars** — one horizontal bar per token, width = the literal
 *      token value, labeled with token name + px. Bars use `bg-primary` so
 *      the violet pigment is the only color choice; widths come from
 *      `var(--spacing-*)` so a token change re-flows the whole specimen
 *      with zero source edits.
 *   2. **Stack gap demo** — six side-by-side stacks of identical children,
 *      each with `gap=xs|sm|md|lg|xl|2xl`. The visual gap progression is
 *      the rhythm-check: if `md` and `lg` look identical, the cascade is
 *      broken.
 *
 * Every value here resolves through a token — no arbitrary `w-[...]`
 * pixel classes, no raw hex, no inline numeric padding (R19).
 */

// ── Scale definition (single source of truth for both panels) ───────────────

type SpacingStep = {
  /** Token suffix as it appears in source (`xs`, `sm`, …, `2xl`). */
  token: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Literal px value from foundation.css — for labels only. */
  px: number;
  /** Where on the layout this step is the canonical choice. */
  use: string;
};

const SCALE: SpacingStep[] = [
  { token: 'xs', px: 8, use: 'Inline chip / badge padding' },
  { token: 'sm', px: 16, use: 'Card padding, mobile page padding' },
  { token: 'md', px: 24, use: 'Card-grid gaps, header → grid' },
  { token: 'lg', px: 40, use: 'Mobile section vertical padding' },
  { token: 'xl', px: 64, use: 'Desktop section vertical padding' },
  { token: '2xl', px: 96, use: 'Hero / final-CTA breathing room' },
];

// ── Panel 1: horizontal scale bars ──────────────────────────────────────────

function ScaleBars() {
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Typography variant="h3" as="h2">
          Scale
        </Typography>
        <Typography variant="long" tone="muted" className="max-w-prose">
          Six tokens, fixed ratios. Bar width is driven by{' '}
          <code className="font-mono">var(--spacing-*)</code>, so the
          specimen tracks the cascade — change the token, re-flow the bar.
        </Typography>
      </Stack>

      <Stack gap="sm">
        {SCALE.map(({ token, px, use }) => (
          <Grid
            key={token}
            cols={12}
            gap="md"
            className="items-center"
            data-slot="spacing-row"
            data-token={token}
          >
            <GridItem span={4} mdSpan={2}>
              <Stack gap="xs">
                <Typography variant="ui" as="code" className="font-mono">
                  --spacing-{token}
                </Typography>
                <Typography
                  variant="caption"
                  tone="muted"
                  as="code"
                  className="font-mono"
                >
                  {px}px
                </Typography>
              </Stack>
            </GridItem>

            <GridItem span={8} mdSpan={7}>
              {/*
                Bar height is fixed (h-2 → 8px); width comes from the token.
                bg-primary is the single pigment — violet draws the eye, and
                a token regression shows up as a width collapse, not a color
                shift.
              */}
              <div
                aria-hidden
                className="bg-primary h-2 rounded-sm"
                style={{ width: `var(--spacing-${token})` }}
              />
            </GridItem>

            <GridItem span={12} mdSpan={3}>
              <Typography variant="ui-sm" tone="muted">
                {use}
              </Typography>
            </GridItem>
          </Grid>
        ))}
      </Stack>
    </Stack>
  );
}

// ── Panel 2: Stack gap demo ─────────────────────────────────────────────────

/** Identical child across every gap column — the constant in the experiment. */
function ChildBox() {
  return (
    <Box
      surface="muted"
      radius="sm"
      border
      aria-hidden
      className="h-10 w-10"
    />
  );
}

function StackGapDemo() {
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Typography variant="h3" as="h2">
          Stack gap
        </Typography>
        <Typography variant="long" tone="muted" className="max-w-prose">
          Six columns, identical children, every gap token. The progression
          xs → 2xl should read as one rhythm — if two adjacent columns look
          the same, the cascade is broken.
        </Typography>
      </Stack>

      <Grid cols={6} gap="md" data-slot="stack-gap-demo">
        {SCALE.map(({ token, px }) => (
          <Stack
            key={token}
            gap="sm"
            align="center"
            data-slot="stack-gap-column"
            data-token={token}
          >
            <Stack gap="xs" align="center">
              <Typography variant="ui" as="code" className="font-mono">
                gap=&quot;{token}&quot;
              </Typography>
              <Typography
                variant="caption"
                tone="muted"
                as="code"
                className="font-mono"
              >
                {px}px
              </Typography>
            </Stack>
            <Stack gap={token} align="center">
              <ChildBox />
              <ChildBox />
              <ChildBox />
            </Stack>
          </Stack>
        ))}
      </Grid>
    </Stack>
  );
}

// ── Specimen ────────────────────────────────────────────────────────────────

function Specimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="spacing-specimen"
    >
      <Stack gap="xl">
        <Stack gap="xs">
          <Typography variant="h2" as="h1">
            Spacing
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            The six-step spacing scale from{' '}
            <code className="font-mono">LAYOUT_PHILOSOPHY.md §3</code>:
            8 / 16 / 24 / 40 / 64 / 96px. Every gap, padding, and margin
            on every Interlace surface resolves to one of these six —
            never a per-page guess (R19, R21).
          </Typography>
        </Stack>

        <ScaleBars />
        <StackGapDemo />
      </Stack>
    </Box>
  );
}

// ── Storybook meta + stories ────────────────────────────────────────────────

const meta = {
  title: 'Foundations/Spacing',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Six-step spacing scale specimen — horizontal scale bars driven by `var(--spacing-*)` and a side-by-side Stack-gap rhythm check. Per LAYOUT_PHILOSOPHY.md §3, the values are 8 / 16 / 24 / 40 / 64 / 96px, and every layout primitive in the DS picks one of those six. No arbitrary widths, no raw px (R19).',
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

export const RTL: Story = {
  decorators: [withRtl],
};

export const BelowMinViewport: Story = {
  parameters: {
    viewport: { defaultViewport: 'belowMin' },
  },
};
