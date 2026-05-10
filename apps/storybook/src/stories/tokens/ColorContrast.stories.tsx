import type { Meta, StoryObj } from '@storybook/react-vite';

interface Pair {
  name: string;
  fg: string;
  bg: string;
  /** Tailwind class applied to the swatch text. */
  fgClass: string;
  /** Tailwind class applied to the swatch background. */
  bgClass: string;
}

const pairs: Pair[] = [
  {
    name: 'foreground / background',
    fg: 'var(--foreground)',
    bg: 'var(--background)',
    fgClass: 'text-foreground',
    bgClass: 'bg-background',
  },
  {
    name: 'card-foreground / card',
    fg: 'var(--card-foreground)',
    bg: 'var(--card)',
    fgClass: 'text-card-foreground',
    bgClass: 'bg-card',
  },
  {
    name: 'muted-foreground / background',
    fg: 'var(--muted-foreground)',
    bg: 'var(--background)',
    fgClass: 'text-muted-foreground',
    bgClass: 'bg-background',
  },
  {
    name: 'muted-foreground / muted',
    fg: 'var(--muted-foreground)',
    bg: 'var(--muted)',
    fgClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
  {
    name: 'primary-foreground / primary',
    fg: 'var(--primary-foreground)',
    bg: 'var(--primary)',
    fgClass: 'text-primary-foreground',
    bgClass: 'bg-primary',
  },
  {
    name: 'destructive-foreground / destructive',
    fg: 'var(--destructive-foreground, white)',
    bg: 'var(--destructive)',
    fgClass: 'text-white',
    bgClass: 'bg-destructive',
  },
  {
    name: 'accent-foreground / accent',
    fg: 'var(--accent-foreground)',
    bg: 'var(--accent)',
    fgClass: 'text-accent-foreground',
    bgClass: 'bg-accent',
  },
  {
    name: 'secondary-foreground / secondary',
    fg: 'var(--secondary-foreground)',
    bg: 'var(--secondary)',
    fgClass: 'text-secondary-foreground',
    bgClass: 'bg-secondary',
  },
];

function Swatch({ pair }: { pair: Pair }) {
  return (
    <div
      className={`${pair.bgClass} border-border flex flex-col gap-2 rounded-lg border p-6`}
    >
      <p className={`${pair.fgClass} text-base font-semibold`}>{pair.name}</p>
      <p className={`${pair.fgClass} text-sm`}>
        Body text — the quick brown fox jumps over the lazy dog. axe asserts
        ≥4.5:1 contrast on this paragraph.
      </p>
      <p className={`${pair.fgClass} text-2xl font-bold`}>
        Heading 24px — large-text 3:1 minimum
      </p>
    </div>
  );
}

const meta: Meta = {
  title: 'Tokens/Color Contrast',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Every shipped foreground/background token pair, rendered with both body and large-text samples. The CI a11y gate enforces WCAG AA contrast (4.5:1 body, 3:1 large) on this story — a token that drifts out of compliance fails the build here.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Light: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2">
      {pairs.map((p) => (
        <Swatch key={p.name} pair={p} />
      ))}
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark grid grid-cols-1 gap-4 bg-background p-8 md:grid-cols-2">
      {pairs.map((p) => (
        <Swatch key={p.name} pair={p} />
      ))}
    </div>
  ),
};
