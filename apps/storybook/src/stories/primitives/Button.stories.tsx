import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@interlace/ui/button';
import { ArrowRight } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
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
  // xs (24px) and sm (32px) buttons fall below WCAG 2.2 AAA `target-size`'s
  // 24×24 *interior* threshold when their label is narrow (e.g. "xs" = 20.4px
  // wide). This story is a deliberate showcase of every size token —
  // smaller sizes ARE supported by the design system for dense table-cell
  // and toolbar contexts where the consumer guarantees enough spacing. We
  // scope-disable the rule for THIS story only; real usages are still gated
  // by the route-level a11y scan in apps/docs/e2e/a11y.spec.ts.
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'target-size', enabled: false }],
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
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
