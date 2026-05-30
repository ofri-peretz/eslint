import type { Meta, StoryObj } from '@storybook/react-vite';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid, GridItem } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';

import { withDark } from '@/decorators';

/**
 * Radius — three-step scale specimen.
 *
 * Renders the foundation radius scale (sm=8 / md=12 / lg=16px) as three
 * 96×96 swatches with a tinted primary-subtle surface, the token name, and
 * the resolved pixel value. Per `DESIGN_PRINCIPLES.md` #4 (token-only) and
 * `foundation.css` (`--radius-sm` / `-md` / `-lg`), the swatch background
 * uses the `--interlace-primary-subtle` token pair via `var(--*)` so the
 * accent earns attention without falling into a raw hex (R19).
 *
 * Server component — no hooks, no client APIs.
 */

type Step = {
  /** Token suffix matching the `radius` variant on Box (`sm` / `md` / `lg`). */
  key: 'sm' | 'md' | 'lg';
  /** Display name as it appears in source. */
  token: string;
  /** Resolved pixel value, per foundation.css. */
  px: number;
};

const STEPS: Step[] = [
  { key: 'sm', token: '--radius-sm', px: 8 },
  { key: 'md', token: '--radius-md', px: 12 },
  { key: 'lg', token: '--radius-lg', px: 16 },
];

/**
 * One swatch — fixed 96×96, primary-subtle tinted background, radius via the
 * Box `radius` variant. Token + px label sit below in a `Stack`.
 */
function Swatch({ step }: { step: Step }) {
  return (
    <Stack gap="xs" align="start" data-slot="radius-swatch" data-step={step.key}>
      <Box
        radius={step.key}
        // 96×96 — `size-24` resolves to 6rem (24 * 4px) on the default Tailwind
        // scale, which lands on the 96px target without an arbitrary value.
        className="size-24"
        // Token-only surface: brand-subtle pair via var(--*). Box has no
        // `primary` surface enum (only none/card/muted/accent), so we paint
        // through the principle-4 escape hatch rather than reach for a raw hex.
        style={{
          background: 'var(--interlace-primary-subtle)',
          color: 'var(--interlace-primary-subtle-foreground)',
        }}
        aria-hidden
      />
      <Stack gap="xs">
        <Typography variant="ui" as="code" className="font-mono">
          {step.token}
        </Typography>
        <Typography variant="caption" tone="muted" as="code">
          {step.px}px
        </Typography>
      </Stack>
    </Stack>
  );
}

function Specimen() {
  return (
    <Box
      padding="lg"
      className="bg-background text-foreground"
      data-slot="radius-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Radius scale
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Three steps — <code className="font-mono">--radius-sm</code> (8px),{' '}
            <code className="font-mono">--radius-md</code> (12px),{' '}
            <code className="font-mono">--radius-lg</code> (16px). Promoted from
            the registry app into <code className="font-mono">foundation.css</code>
            so every consumer (docs / storybook / blog) inherits the DS-owned
            curvature instead of Tailwind&apos;s 2/6/8px defaults.
          </Typography>
        </Stack>

        <Grid cols={12} gap="lg">
          {STEPS.map((step) => (
            <GridItem key={step.key} span={12} mdSpan={4}>
              <Swatch step={step} />
            </GridItem>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}

// ── Storybook meta + stories ────────────────────────────────────────────────

const meta = {
  title: 'Foundations/Radius',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Specimen of the foundation radius scale (8 / 12 / 16px). Three 96×96 swatches with a primary-subtle tinted surface, token name, and resolved pixel value. Tokens only — the swatch background uses the `--interlace-primary-subtle` pair via `var(--*)` (Box exposes no `primary` surface enum).',
      },
    },
  },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {};

export const Light: Story = {};

export const Dark: Story = {
  decorators: [withDark],
};

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

export const BelowMinViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};
