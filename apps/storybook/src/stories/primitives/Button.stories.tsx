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
