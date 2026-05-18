import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@interlace/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { withRtl } from '@/decorators';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Primary interactive element. Variants and sizes follow `CTA_PHILOSOPHY.md`; the `render` prop lets the same component become a `<Link>` or external `<a>` without rewriting the variant API.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['default', 'xs', 'sm', 'lg', 'icon'] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: 'Get started' } };
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
export const Sizes: Story = {
  // xs / sm fall below WCAG 2.5.8's 24×24 *target* threshold but qualify
  // for the *spacing* exception when each target's centre has a 24×24
  // bounding circle that doesn't overlap any other target. Using `gap-6`
  // (24px boundary-to-boundary, well above the 24px-circle requirement)
  // satisfies that exception, so the suppression that lived here through
  // 2026-05-17 is no longer needed.
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <Button size="xs">xs</Button>
      <Button size="sm">sm</Button>
      <Button size="default">default</Button>
      <Button size="lg">lg</Button>
      <Button size="icon" aria-label="Continue">
        <ArrowRight />
      </Button>
    </div>
  ),
};
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };
export const Dark: Story = {
  args: { children: 'Get started' },
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [(S) => <div className="dark"><S /></div>],
};

/**
 * Composition pattern — Button has no `loading` variant; the canon is
 * `disabled + spinner child + accessible busy label`. The aria-live
 * region announces state change to screen readers per
 * `LOADING_PHILOSOPHY.md`.
 */
export const Loading: Story = {
  render: () => (
    <Button disabled aria-busy="true" aria-live="polite">
      <Loader2 className="animate-spin" aria-hidden />
      <span>Installing…</span>
    </Button>
  ),
};

export const RTL: Story = {
  args: { children: 'ابدأ الآن' },
  decorators: [withRtl],
};
