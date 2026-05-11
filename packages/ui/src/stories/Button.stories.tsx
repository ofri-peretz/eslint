import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../primitives/button.js';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'link', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Click me',
    variant: 'default',
    size: 'default',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

export const Sizes: Story = {
  // xs (24px) and sm (32px) buttons fall below WCAG 2.2 AAA `target-size`'s
  // 24×24 *interior* threshold when their label is narrow (e.g. "XS" =
  // 20.4px wide). This story is a deliberate showcase of every size token —
  // smaller sizes ARE supported by the design system for dense table-cell
  // and toolbar contexts where the consumer guarantees enough spacing. We
  // scope-disable the rule for THIS story only; real usages are still
  // gated by the route-level a11y scan in apps/docs/e2e/a11y.spec.ts.
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'target-size', enabled: false }],
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">XS</Button>
      <Button size="sm">SM</Button>
      <Button size="default">Default</Button>
      <Button size="lg">LG</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};
