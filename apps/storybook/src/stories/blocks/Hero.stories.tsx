import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight } from 'lucide-react';
import { Button } from '@interlace/ui/button';
import { Hero } from '@interlace/ui/blocks/hero';

const meta: Meta<typeof Hero> = {
  title: 'Blocks/Hero',
  component: Hero,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Above-the-fold landing section. Eyebrow + headline + body + actions, with an optional media slot that flips the layout to a two-column grid.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    headline: 'Production-grade React primitives for shadcn.',
    body: 'Drop in @interlace/ui — brand tokens, theme bridge, animation keyframes, and a portable 26-rule component-modeling floor — installed alongside.',
    actions: (
      <>
        <Button>
          Get started
          <ArrowRight className="ml-1 size-4" aria-hidden />
        </Button>
        <Button variant="ghost">View on GitHub</Button>
      </>
    ),
  },
};

export const WithEyebrow: Story = {
  args: {
    eyebrow: 'v2.0 · February 2026',
    headline: 'A design system that scales with the brand.',
    body: 'One token layer, every surface — docs, storybook, registry, blog, future apps. Brand-fork seam at the --interlace-* primitive layer.',
    actions: (
      <>
        <Button>Read the changelog</Button>
        <Button variant="outline">See the release</Button>
      </>
    ),
  },
};

export const TwoColumn: Story = {
  args: {
    eyebrow: 'Designed for engineers',
    headline: 'See the source, copy the source.',
    body: 'Every primitive ships with its full TSX inline — no bundled black boxes. Install via the shadcn CLI; the file lands in your repo.',
    actions: (
      <>
        <Button>Install a primitive</Button>
        <Button variant="ghost">Browse the catalog</Button>
      </>
    ),
    media: (
      <div className="bg-card text-card-foreground border-border rounded-lg border p-6 font-mono text-xs">
        <div className="text-muted-foreground">
          $ npx shadcn@latest add @interlace/button
        </div>
        <div className="mt-2 text-emerald-600 dark:text-emerald-400">
          ✓ Created src/components/ui/button.tsx
        </div>
        <div className="text-emerald-600 dark:text-emerald-400">
          ✓ Updated tailwind.config.ts
        </div>
        <div className="text-emerald-600 dark:text-emerald-400">
          ✓ Installed dependencies
        </div>
      </div>
    ),
  },
};
